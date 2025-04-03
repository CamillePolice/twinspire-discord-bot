// src/commands/team-challenges.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TournamentService } from '../../services/tournament/tournamentService';
import { logger } from '../../utils/logger';

const tournamentService = new TournamentService();

/**
 * Handle the team challenge command
 */
export async function handleChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const defendingTeamId = interaction.options.getString('team_id', true);

    // Get the active tournament
    const tournaments = await tournamentService.getActiveTournaments();
    if (tournaments.length === 0) {
      await interaction.editReply('There are no active tournaments available for challenges.');
      return;
    }

    // Use the most recent active tournament
    const tournament = tournaments.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];

    // Check if the user is a captain of a team
    const teams = await tournamentService.getTournamentStandings();
    const challengerTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!challengerTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can initiate challenges.',
      );
      return;
    }

    // Check if the defending team exists
    const defendingTeam = await tournamentService.getTeamById(defendingTeamId);
    if (!defendingTeam) {
      await interaction.editReply(`Team with ID ${defendingTeamId} not found.`);
      return;
    }

    // Check if tiers are adjacent
    if (challengerTeam.tier !== defendingTeam.tier + 1) {
      await interaction.editReply(
        `You can only challenge teams in the tier immediately above yours. Your tier: ${challengerTeam.tier}, Their tier: ${defendingTeam.tier}`,
      );
      return;
    }

    // Check if defending team is protected
    if (defendingTeam.protectedUntil && defendingTeam.protectedUntil > new Date()) {
      await interaction.editReply(
        `This team is protected until <t:${Math.floor(defendingTeam.protectedUntil.getTime() / 1000)}:R> due to a recent successful defense.`,
      );
      return;
    }

    // Create the challenge
    const challenge = await tournamentService.createChallenge(
      challengerTeam.teamId,
      defendingTeamId,
      tournament.tournamentId,
    );

    if (challenge) {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Challenge Initiated!')
        .setDescription(
          `Team **${challengerTeam.name}** has challenged team **${defendingTeam.name}**!`,
        )
        .addFields(
          { name: 'Challenge ID', value: challenge.challengeId, inline: false },
          {
            name: 'Challenger',
            value: `**${challengerTeam.name}** (Tier ${challengerTeam.tier})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam.name}** (Tier ${defendingTeam.tier})`,
            inline: true,
          },
          { name: 'Status', value: 'Pending', inline: true },
          {
            name: 'Next Steps',
            value: `The defending team (<@${defendingTeam.captainId}>) must propose at least ${tournament.rules.minRequiredDateOptions} dates within ${tournament.rules.challengeTimeframeInDays} days.`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team propose_dates to respond to this challenge' });

      await interaction.editReply({ embeds: [embed] });

      // DM the defending team captain if possible
      try {
        const defendingCaptain = await interaction.client.users.fetch(defendingTeam.captainId);
        await defendingCaptain.send({
          content: `Your team has been challenged by **${challengerTeam.name}**! Use the \`/team propose_dates\` command to respond.`,
          embeds: [embed],
        });
      } catch (dmError) {
        logger.warn(
          `Could not DM defending team captain (${defendingTeam.captainId}): ${dmError as Error}`);
      }
    } else {
      await interaction.editReply(
        'Failed to create challenge. This could be due to exceeding the monthly challenge limit or an existing challenge with this team.',
      );
    }
  } catch (error) {
    logger.error('Error creating challenge:', error as Error);
    await interaction.editReply('Failed to create challenge. Check logs for details.');
  }
}

/**
 * Handle the team propose_dates command
 */
export async function handleProposeDates(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const date1Str = interaction.options.getString('date1', true);
    const date2Str = interaction.options.getString('date2', true);
    const date3Str = interaction.options.getString('date3', true);

    // Parse dates
    const date1 = new Date(date1Str);
    const date2 = new Date(date2Str);
    const date3 = new Date(date3Str);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || isNaN(date3.getTime())) {
      await interaction.editReply('Invalid date format. Please use YYYY-MM-DD HH:MM.');
      return;
    }

    // Check if all dates are in the future
    const now = new Date();
    if (date1 <= now || date2 <= now || date3 <= now) {
      await interaction.editReply('All proposed dates must be in the future.');
      return;
    }

    // Get the challenge
    const challenge = await tournamentService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if the user is the captain of the defending team
    const teams = await tournamentService.getTournamentStandings();
    const defendingTeam = teams.find(team => team.teamId === challenge.defendingTeamId);

    if (!defendingTeam) {
      await interaction.editReply('The defending team no longer exists.');
      return;
    }

    if (defendingTeam.captainId !== interaction.user.id) {
      await interaction.editReply(
        'Only the captain of the defending team can propose dates for this challenge.',
      );
      return;
    }

    // Check if the challenge is still pending
    if (challenge.status !== 'pending') {
      await interaction.editReply(`This challenge is already in status: ${challenge.status}`);
      return;
    }

    // Propose the dates
    const success = await tournamentService.proposeDates(challengeId, [date1, date2, date3]);

    if (success) {
      // Get the challenger team
      const challengerTeam = teams.find(team => team.teamId === challenge.challengerTeamId);

      if (!challengerTeam) {
        await interaction.editReply('The challenging team no longer exists.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Dates Proposed!')
        .setDescription(
          `Team **${defendingTeam.name}** has proposed dates for the challenge against **${challengerTeam?.name || 'Unknown Team'}**`,
        )
        .addFields(
          { name: 'Challenge ID', value: challengeId, inline: false },
          { name: 'Date 1', value: `<t:${Math.floor(date1.getTime() / 1000)}:F>`, inline: true },
          { name: 'Date 2', value: `<t:${Math.floor(date2.getTime() / 1000)}:F>`, inline: true },
          { name: 'Date 3', value: `<t:${Math.floor(date3.getTime() / 1000)}:F>`, inline: true },
          {
            name: 'Next Steps',
            value: `The challenging team (<@${challengerTeam?.captainId}>) should choose one of these dates using the \`/team schedule\` command.`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team schedule to confirm a date' });

      await interaction.editReply({ embeds: [embed] });

      // DM the challenging team captain if possible
      try {
        if (challengerTeam) {
          const challengerCaptain = await interaction.client.users.fetch(challengerTeam.captainId);
          await challengerCaptain.send({
            content: `Team **${defendingTeam.name}** has proposed dates for your challenge! Use the \`/team schedule\` command to confirm a date.`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM challenging team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to propose dates for the challenge.');
    }
  } catch (error) {
    logger.error('Error proposing dates:', error as Error);
    await interaction.editReply('Failed to propose dates. Check logs for details.');
  }
}

/**
 * Handle the team schedule command
 */
export async function handleScheduleChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const dateStr = interaction.options.getString('date', true);

    // Parse date
    const scheduledDate = new Date(dateStr);
    if (isNaN(scheduledDate.getTime())) {
      await interaction.editReply('Invalid date format. Please use YYYY-MM-DD HH:MM.');
      return;
    }

    // Check if date is in the future
    const now = new Date();
    if (scheduledDate <= now) {
      await interaction.editReply('The scheduled date must be in the future.');
      return;
    }

    // Get the challenge
    const challenge = await tournamentService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if the user is the captain of the challenging team
    const teams = await tournamentService.getTournamentStandings();
    const challengerTeam = teams.find(team => team.teamId === challenge.challengerTeamId);

    if (!challengerTeam) {
      await interaction.editReply('The challenging team no longer exists.');
      return;
    }

    if (challengerTeam.captainId !== interaction.user.id) {
      await interaction.editReply(
        'Only the captain of the challenging team can schedule this challenge.',
      );
      return;
    }

    // Check if the challenge has proposed dates
    if (!challenge.proposedDates || challenge.proposedDates.length === 0) {
      await interaction.editReply('This challenge does not have any proposed dates yet.');
      return;
    }

    // Check if the selected date is one of the proposed dates
    // Allow a 10-minute window for scheduling in case of minor time differences
    const isProposedDate = challenge.proposedDates.some(date => {
      const timeDiff = Math.abs(date.getTime() - scheduledDate.getTime());
      return timeDiff <= 10 * 60 * 1000; // 10 minutes in milliseconds
    });

    if (!isProposedDate) {
      await interaction.editReply(
        'The selected date must be one of the proposed dates by the defending team.',
      );
      return;
    }

    // Schedule the challenge
    const success = await tournamentService.scheduleChallenge(challengeId, scheduledDate);

    if (success) {
      // Get the defending team
      const defendingTeam = teams.find(team => team.teamId === challenge.defendingTeamId);

      const embed = new EmbedBuilder()
        .setColor('#00cc00')
        .setTitle('Challenge Scheduled!')
        .setDescription(
          `The challenge between **${challengerTeam.name}** and **${defendingTeam?.name || 'Unknown Team'}** has been scheduled!`,
        )
        .addFields(
          { name: 'Challenge ID', value: challengeId, inline: false },
          {
            name: 'Scheduled Date',
            value: `<t:${Math.floor(scheduledDate.getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: 'Challenger',
            value: `**${challengerTeam.name}** (Tier ${challengerTeam.tier})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam?.name || 'Unknown Team'}** (Tier ${challenge.tierBefore.defending})`,
            inline: true,
          },
          { name: 'Format', value: 'Best of 3 (BO3)', inline: true },
          {
            name: 'Next Steps',
            value:
              'Play the match at the scheduled time and then submit the result using the `/team result` command.',
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team result to submit match results' });

      await interaction.editReply({ embeds: [embed] });

      // DM the defending team captain if possible
      try {
        if (defendingTeam) {
          const defendingCaptain = await interaction.client.users.fetch(defendingTeam.captainId);
          await defendingCaptain.send({
            content: `Your challenge against **${challengerTeam.name}** has been scheduled for <t:${Math.floor(scheduledDate.getTime() / 1000)}:F>!`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM defending team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to schedule the challenge.');
    }
  } catch (error) {
    logger.error('Error scheduling challenge:', error as Error);
    await interaction.editReply('Failed to schedule challenge. Check logs for details.');
  }
}

/**
 * Handle the team result command
 */
export async function handleSubmitResult(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const winnerOption = interaction.options.getString('winner', true);
    const score = interaction.options.getString('score', true);

    // Validate score format (e.g., "2-1", "2-0")
    const scorePattern = /^([0-2])-([0-2])$/;
    const scoreMatch = score.match(scorePattern);

    if (!scoreMatch) {
      await interaction.editReply(
        'Invalid score format. Please use format like "2-1" or "2-0" for a Best of 3.',
      );
      return;
    }

    const winnerScore = parseInt(scoreMatch[1]);
    const loserScore = parseInt(scoreMatch[2]);

    // Validate that the score makes sense for a BO3
    if (winnerScore + loserScore > 3 || winnerScore < 2 || winnerScore <= loserScore) {
      await interaction.editReply(
        'Invalid score for a Best of 3. The winner must have 2 wins and more wins than the loser.',
      );
      return;
    }

    // Get the challenge
    const challenge = await tournamentService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if the challenge is scheduled
    if (challenge.status !== 'scheduled') {
      await interaction.editReply(
        `This challenge is in ${challenge.status} status and cannot have results submitted.`,
      );
      return;
    }

    // Check if the scheduled date has passed
    if (challenge.scheduledDate && challenge.scheduledDate > new Date()) {
      await interaction.editReply(
        `This challenge is scheduled for <t:${Math.floor(challenge.scheduledDate.getTime() / 1000)}:R> and cannot have results submitted yet.`,
      );
      return;
    }

    // Check if the user is a captain of either team
    const teams = await tournamentService.getTournamentStandings();
    const challengerTeam = teams.find(team => team.teamId === challenge.challengerTeamId);
    const defendingTeam = teams.find(team => team.teamId === challenge.defendingTeamId);

    const isChallenger = challengerTeam?.captainId === interaction.user.id;
    const isDefender = defendingTeam?.captainId === interaction.user.id;

    if (!isChallenger && !isDefender) {
      await interaction.editReply(
        'Only the captains of the involved teams can submit results for this challenge.',
      );
      return;
    }

    // Determine the actual winner team ID based on input
    const winnerTeamId =
      winnerOption === 'challenger' ? challenge.challengerTeamId : challenge.defendingTeamId;

    const loserTeamId =
      winnerOption === 'challenger' ? challenge.defendingTeamId : challenge.challengerTeamId;

    // Create game results
    const games = [];

    // Add wins for the winner
    for (let i = 0; i < winnerScore; i++) {
      games.push({
        winner: winnerTeamId,
        loser: loserTeamId,
      });
    }

    // Add wins for the loser (if any)
    for (let i = 0; i < loserScore; i++) {
      games.push({
        winner: loserTeamId,
        loser: winnerTeamId,
      });
    }

    // Submit the result
    const success = await tournamentService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      games,
    );

    if (success) {
      // Create a message with the result and implications
      const winnerTeam =
        winnerTeamId === challenge.challengerTeamId ? challengerTeam : defendingTeam;
      const loserTeam =
        winnerTeamId === challenge.challengerTeamId ? defendingTeam : challengerTeam;

      // Determine tier changes
      let tierChangeText = '';
      if (winnerTeamId === challenge.challengerTeamId) {
        // Challenger won and moved up
        tierChangeText = `**${winnerTeam?.name}** has moved up to Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.name}** has moved down to Tier ${challenge.tierBefore.challenger}.`;
      } else {
        // Defender successfully defended
        tierChangeText = `**${winnerTeam?.name}** successfully defended their position in Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.name}** remains in Tier ${challenge.tierBefore.challenger}.`;
      }

      const embed = new EmbedBuilder()
        .setColor('#00cc00')
        .setTitle('Match Result Submitted!')
        .setDescription(
          `The challenge between **${challengerTeam?.name || 'Unknown Team'}** and **${defendingTeam?.name || 'Unknown Team'}** has been completed!`,
        )
        .addFields(
          {
            name: 'Result',
            value: `**${winnerTeam?.name || 'Unknown Team'}** defeated **${loserTeam?.name || 'Unknown Team'}** with a score of **${score}**!`,
            inline: false,
          },
          {
            name: 'Challenger',
            value: `**${challengerTeam?.name || 'Unknown Team'}** (Tier ${challenge.tierBefore.challenger})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam?.name || 'Unknown Team'}** (Tier ${challenge.tierBefore.defending})`,
            inline: true,
          },
          { name: 'Challenge ID', value: challengeId, inline: false },
          { name: 'Tier Changes', value: tierChangeText, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Ascension League' });

      await interaction.editReply({ embeds: [embed] });

      // Send message to channel
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [embed] });
      }

      // DM the other team captain
      try {
        if (isChallenger && defendingTeam) {
          const defendingCaptain = await interaction.client.users.fetch(defendingTeam.captainId);
          await defendingCaptain.send({
            content: `Results have been submitted for your challenge against **${challengerTeam?.name}**`,
            embeds: [embed],
          });
        } else if (isDefender && challengerTeam) {
          const challengerCaptain = await interaction.client.users.fetch(challengerTeam.captainId);
          await challengerCaptain.send({
            content: `Results have been submitted for your challenge against **${defendingTeam?.name}**`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM other team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to submit the match result.');
    }
  } catch (error) {
    logger.error('Error submitting result:', error as Error);
    await interaction.editReply('Failed to submit result. Check logs for details.');
  }
}
