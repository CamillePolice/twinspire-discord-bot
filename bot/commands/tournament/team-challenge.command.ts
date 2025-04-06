import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TournamentService } from '../../services/tournament/tournament.services';
import { ChallengeService } from '../../services/tournament/challenge.services';
import { logger } from '../../utils/logger.utils';
import { ChallengeStatus } from '../../database/enums/challenge.enums';
import { calculateForfeitResult } from '../../helpers/tournament.helpers';
import { Team, TeamMember } from '../../types/partial-team.types';

// Service instances
const tournamentService = new TournamentService();
const challengeService = new ChallengeService();

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

    // Get all teams in the tournament
    const standings = await tournamentService.getTournamentStandings(tournament.tournamentId);

    // Find challenger team by captain's discord ID
    const challengerTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return (
        team &&
        team.members &&
        team.members.some((m: TeamMember) => m.discordId === interaction.user.id && m.isCaptain)
      );
    });

    if (!challengerTeamTournament) {
      await interaction.editReply(
        'You are not a team captain in this tournament. Only team captains can initiate challenges.',
      );
      return;
    }

    const challengerTeam = challengerTeamTournament.team as unknown as Team;
    const challengerTeamId = challengerTeam.teamId;

    // Find defending team tournament entry
    const defendingTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === defendingTeamId;
    });

    if (!defendingTeamTournament) {
      await interaction.editReply(`Team with ID ${defendingTeamId} not found in this tournament.`);
      return;
    }

    const defendingTeam = defendingTeamTournament.team as unknown as Team;

    // Check if tiers are adjacent
    if (challengerTeamTournament.tier !== defendingTeamTournament.tier + 1) {
      await interaction.editReply(
        `You can only challenge teams in the tier immediately above yours. Your tier: ${challengerTeamTournament.tier}, Their tier: ${defendingTeamTournament.tier}`,
      );
      return;
    }

    // Check if defending team is protected
    if (
      defendingTeamTournament.protectedUntil &&
      defendingTeamTournament.protectedUntil > new Date()
    ) {
      await interaction.editReply(
        `This team is protected until <t:${Math.floor(defendingTeamTournament.protectedUntil.getTime() / 1000)}:R> due to a recent successful defense.`,
      );
      return;
    }

    // Create the challenge
    const challenge = await challengeService.createChallenge(
      challengerTeamId,
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
            value: `**${challengerTeam.name}** (Tier ${challengerTeamTournament.tier})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam.name}** (Tier ${defendingTeamTournament.tier})`,
            inline: true,
          },
          { name: 'Status', value: 'Pending', inline: true },
          {
            name: 'Next Steps',
            value: `The defending team captain must propose at least ${tournament.rules.minRequiredDateOptions} dates within ${tournament.rules.challengeTimeframeInDays} days.`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team propose_dates to respond to this challenge' });

      await interaction.editReply({ embeds: [embed] });

      // DM the defending team captain if possible
      try {
        // Find captain of defending team
        const defendingCaptainMember = defendingTeam.members.find((m: TeamMember) => m.isCaptain);
        if (defendingCaptainMember) {
          const defendingCaptain = await interaction.client.users.fetch(
            defendingCaptainMember.discordId,
          );
          await defendingCaptain.send({
            content: `Your team has been challenged by **${challengerTeam.name}**! Use the \`/team propose_dates\` command to respond.`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM defending team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply(
        'Failed to create challenge. This could be due to exceeding the monthly challenge limit or an existing challenge with this team.',
      );
    }
  } catch (error) {
    logger.error('Error creating challenge:', error);
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
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Get tournament details for this challenge
    const tournament = await tournamentService.getTournamentById(challenge.tournamentId);
    if (!tournament) {
      await interaction.editReply('Tournament associated with this challenge cannot be found.');
      return;
    }

    // Get team information
    const standings = await tournamentService.getTournamentStandings(challenge.tournamentId);

    // Get defending team
    const defendingTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.defendingTeamTournament.toString();
    });

    if (!defendingTeamTournament) {
      await interaction.editReply('The defending team no longer exists in this tournament.');
      return;
    }

    const defendingTeam = defendingTeamTournament.team as unknown as Team;

    // Check if the user is the captain of the defending team
    const isCaptain = defendingTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isCaptain) {
      await interaction.editReply(
        'Only the captain of the defending team can propose dates for this challenge.',
      );
      return;
    }

    // Check if the challenge is still pending
    if (challenge.status !== ChallengeStatus.PENDING) {
      await interaction.editReply(`This challenge is already in status: ${challenge.status}`);
      return;
    }

    // Propose the dates
    const success = await challengeService.proposeDates(challengeId, [date1, date2, date3]);

    if (success) {
      // Get the challenger team
      const challengerTeamTournament = standings.find(entry => {
        const team = entry.team as unknown as Team;
        return team && team.teamId === challenge.challengerTeamTournament.toString();
      });

      if (!challengerTeamTournament) {
        await interaction.editReply('The challenging team no longer exists in this tournament.');
        return;
      }

      const challengerTeam = challengerTeamTournament.team as unknown as Team;

      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Dates Proposed!')
        .setDescription(
          `Team **${defendingTeam.name}** has proposed dates for the challenge against **${challengerTeam.name}**`,
        )
        .addFields(
          { name: 'Challenge ID', value: challengeId, inline: false },
          { name: 'Date 1', value: `<t:${Math.floor(date1.getTime() / 1000)}:F>`, inline: true },
          { name: 'Date 2', value: `<t:${Math.floor(date2.getTime() / 1000)}:F>`, inline: true },
          { name: 'Date 3', value: `<t:${Math.floor(date3.getTime() / 1000)}:F>`, inline: true },
          {
            name: 'Next Steps',
            value: `The challenging team captain should choose one of these dates using the \`/team schedule\` command.`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team schedule to confirm a date' });

      await interaction.editReply({ embeds: [embed] });

      // DM the challenging team captain if possible
      try {
        const challengerCaptainMember = challengerTeam.members.find((m: TeamMember) => m.isCaptain);
        if (challengerCaptainMember) {
          const challengerCaptain = await interaction.client.users.fetch(
            challengerCaptainMember.discordId,
          );
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
    logger.error('Error proposing dates:', error);
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
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Get tournament details for this challenge
    const tournament = await tournamentService.getTournamentById(challenge.tournamentId);
    if (!tournament) {
      await interaction.editReply('Tournament associated with this challenge cannot be found.');
      return;
    }

    // Get standings to find teams
    const standings = await tournamentService.getTournamentStandings(challenge.tournamentId);

    // Get challenging team
    const challengerTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.challengerTeamTournament.toString();
    });

    if (!challengerTeamTournament) {
      await interaction.editReply('The challenging team no longer exists in this tournament.');
      return;
    }

    const challengerTeam = challengerTeamTournament.team as unknown as Team;

    // Check if the user is the captain of the challenging team
    const isCaptain = challengerTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isCaptain) {
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
    const success = await challengeService.scheduleChallenge(challengeId, scheduledDate);

    if (success) {
      // Get the defending team
      const defendingTeamTournament = standings.find(entry => {
        const team = entry.team as unknown as Team;
        return team && team.teamId === challenge.defendingTeamTournament.toString();
      });

      const defendingTeam = defendingTeamTournament ? (defendingTeamTournament.team as unknown as Team) : null;

      const embed = new EmbedBuilder()
        .setColor('#00cc00')
        .setTitle('Challenge Scheduled!')
        .setDescription(
          `The challenge between **${challengerTeam.name}** and **${defendingTeam ? defendingTeam.name : 'Unknown Team'}** has been scheduled!`,
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
            value: `**${challengerTeam.name}** (Tier ${challengerTeamTournament.tier})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam ? defendingTeam.name : 'Unknown Team'}** (Tier ${challenge.tierBefore.defending})`,
            inline: true,
          },
          { name: 'Format', value: tournament.format, inline: true },
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
          const defendingCaptainMember = defendingTeam.members.find((m: TeamMember) => m.isCaptain);
          if (defendingCaptainMember) {
            const defendingCaptain = await interaction.client.users.fetch(
              defendingCaptainMember.discordId,
            );
            await defendingCaptain.send({
              content: `Your challenge against **${challengerTeam.name}** has been scheduled for <t:${Math.floor(scheduledDate.getTime() / 1000)}:F>!`,
              embeds: [embed],
            });
          }
        }
      } catch (dmError) {
        logger.warn(`Could not DM defending team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to schedule the challenge.');
    }
  } catch (error) {
    logger.error('Error scheduling challenge:', error);
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

    // Get the challenge
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Get tournament to determine format
    const tournament = await tournamentService.getTournamentById(challenge.tournamentId);
    if (!tournament) {
      await interaction.editReply('Tournament associated with this challenge cannot be found.');
      return;
    }

    // Validate score format according to tournament format
    let maxGames = 0;
    let winsRequired = 0;

    // Parse tournament format to determine max games and wins required
    if (tournament.format === 'BO1') {
      maxGames = 1;
      winsRequired = 1;
    } else if (tournament.format === 'BO3') {
      maxGames = 3;
      winsRequired = 2;
    } else if (tournament.format === 'BO5') {
      maxGames = 5;
      winsRequired = 3;
    }

    // Validate score format (e.g., "2-1", "2-0" for BO3)
    const scorePattern = new RegExp(`^([0-${winsRequired}])-([0-${winsRequired - 1}])$`);
    const scoreMatch = score.match(scorePattern);

    if (!scoreMatch) {
      await interaction.editReply(
        `Invalid score format. Please use format like "${winsRequired}-0" or "${winsRequired}-${winsRequired - 1}" for a ${tournament.format}.`,
      );
      return;
    }

    const winnerScore = parseInt(scoreMatch[1]);
    const loserScore = parseInt(scoreMatch[2]);

    // Validate that the score makes sense for the format
    if (
      winnerScore + loserScore > maxGames ||
      winnerScore < winsRequired ||
      winnerScore <= loserScore
    ) {
      await interaction.editReply(
        `Invalid score for a ${tournament.format}. The winner must have ${winsRequired} wins and more wins than the loser.`,
      );
      return;
    }

    // Check if the challenge is scheduled
    if (challenge.status !== ChallengeStatus.SCHEDULED) {
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

    // Get standings to find teams
    const standings = await tournamentService.getTournamentStandings(challenge.tournamentId);

    // Get teams
    const challengerTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.challengerTeamTournament.toString();
    });

    const defendingTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.defendingTeamTournament.toString();
    });

    if (!challengerTeamTournament || !defendingTeamTournament) {
      await interaction.editReply('One or both teams no longer exist in this tournament.');
      return;
    }

    const challengerTeam = challengerTeamTournament.team as unknown as Team;
    const defendingTeam = defendingTeamTournament.team as unknown as Team;

    // Check if the user is a captain of either team
    const isChallenger = challengerTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    const isDefender = defendingTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isChallenger && !isDefender) {
      await interaction.editReply(
        'Only the captains of the involved teams can submit results for this challenge.',
      );
      return;
    }

    // Determine the actual winner team ID based on input
    const winnerTeamId =
      winnerOption === 'challenger' ? challenge.challengerTeamTournament.toString() : challenge.defendingTeamTournament.toString();

    const loserTeamId =
      winnerOption === 'challenger' ? challenge.defendingTeamTournament.toString() : challenge.challengerTeamTournament.toString();

    // Create game results
    const games = [];

    // Add wins for the winner
    for (let i = 0; i < winnerScore; i++) {
      games.push({
        winner: winnerTeamId,
        loser: loserTeamId,
        duration: 30, // Default game duration in minutes
      });
    }

    // Add wins for the loser (if any)
    for (let i = 0; i < loserScore; i++) {
      games.push({
        winner: loserTeamId,
        loser: winnerTeamId,
        duration: 30, // Default game duration in minutes
      });
    }

    // Submit the result
    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      games,
    );

    if (success) {
      // Create a message with the result and implications
      const winnerTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString() ? challengerTeam : defendingTeam;
      const loserTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString() ? defendingTeam : challengerTeam;

      // Determine tier changes
      let tierChangeText = '';
      if (winnerTeamId === challenge.challengerTeamTournament.toString()) {
        // Challenger won and moved up
        tierChangeText = `**${winnerTeam.name}** has moved up to Tier ${challenge.tierBefore.defending}!\n**${loserTeam.name}** has moved down to Tier ${challenge.tierBefore.challenger}.`;
      } else {
        // Defender successfully defended
        tierChangeText = `**${winnerTeam.name}** successfully defended their position in Tier ${challenge.tierBefore.defending}!\n**${loserTeam.name}** remains in Tier ${challenge.tierBefore.challenger}.`;
      }

      const embed = new EmbedBuilder()
        .setColor('#00cc00')
        .setTitle('Match Result Submitted!')
        .setDescription(
          `The challenge between **${challengerTeam.name}** and **${defendingTeam.name}** has been completed!`,
        )
        .addFields(
          {
            name: 'Result',
            value: `**${winnerTeam.name}** defeated **${loserTeam.name}** with a score of **${score}**!`,
            inline: false,
          },
          {
            name: 'Challenger',
            value: `**${challengerTeam.name}** (Tier ${challenge.tierBefore.challenger})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam.name}** (Tier ${challenge.tierBefore.defending})`,
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
        if (isChallenger) {
          const defendingCaptainMember = defendingTeam.members.find((m: TeamMember) => m.isCaptain);
          if (defendingCaptainMember) {
            const defendingCaptain = await interaction.client.users.fetch(
              defendingCaptainMember.discordId,
            );
            await defendingCaptain.send({
              content: `Results have been submitted for your challenge against **${challengerTeam.name}**`,
              embeds: [embed],
            });
          }
        } else if (isDefender) {
          const challengerCaptainMember = challengerTeam.members.find((m: TeamMember) => m.isCaptain);
          if (challengerCaptainMember) {
            const challengerCaptain = await interaction.client.users.fetch(
              challengerCaptainMember.discordId,
            );
            await challengerCaptain.send({
              content: `Results have been submitted for your challenge against **${defendingTeam.name}**`,
              embeds: [embed],
            });
          }
        }
      } catch (dmError) {
        logger.warn(`Could not DM other team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to submit the match result.');
    }
  } catch (error) {
    logger.error('Error submitting result:', error);
    await interaction.editReply('Failed to submit result. Check logs for details.');
  }
}

/**
 * Handle the team forfeit command
 */
export async function handleForfeitChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);

    // Get the challenge
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Get tournament details
    const tournament = await tournamentService.getTournamentById(challenge.tournamentId);
    if (!tournament) {
      await interaction.editReply('Tournament associated with this challenge cannot be found.');
      return;
    }

    // Get standings to find teams
    const standings = await tournamentService.getTournamentStandings(challenge.tournamentId);

    // Get teams
    const challengerTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.challengerTeamTournament.toString();
    });

    const defendingTeamTournament = standings.find(entry => {
      const team = entry.team as unknown as Team;
      return team && team.teamId === challenge.defendingTeamTournament.toString();
    });

    if (!challengerTeamTournament || !defendingTeamTournament) {
      await interaction.editReply('One or both teams no longer exist in this tournament.');
      return;
    }

    const challengerTeam = challengerTeamTournament.team as unknown as Team;
    const defendingTeam = defendingTeamTournament.team as unknown as Team;

    // Check if the user is a captain of either team
    const isChallenger = challengerTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    const isDefender = defendingTeam.members.some(
      (member: TeamMember) => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isChallenger && !isDefender) {
      await interaction.editReply(
        'Only the captains of the involved teams can forfeit this challenge.',
      );
      return;
    }

    // Determine which team is forfeiting
    const forfeiterTeamId = isChallenger ? challenge.challengerTeamTournament.toString() : challenge.defendingTeamTournament.toString();

    // Process the forfeit
    const success = await challengeService.forfeitChallenge(challengeId, forfeiterTeamId);

    if (success) {
      const forfeiterTeam = isChallenger ? challengerTeam : defendingTeam;
      const winnerTeam = isChallenger ? defendingTeam : challengerTeam;

      // Get the forfeit result to show the accurate score
      const forfeitResult = calculateForfeitResult(
        tournament,
        isChallenger ? challenge.defendingTeamTournament.toString() : challenge.challengerTeamTournament.toString(),
        forfeiterTeamId,
      );

      // Determine tier changes text based on who forfeited
      let tierChangeText = '';
      if (isChallenger) {
        // Challenger forfeited, defender stays where they are
        tierChangeText = `**${winnerTeam.name}** remains in Tier ${challenge.tierBefore.defending}.\n**${forfeiterTeam.name}** remains in Tier ${challenge.tierBefore.challenger}.`;
      } else {
        // Defender forfeited, challenger moves up
        tierChangeText = `**${winnerTeam.name}** has moved up to Tier ${challenge.tierBefore.defending}!\n**${forfeiterTeam.name}** has moved down to Tier ${challenge.tierBefore.challenger}.`;
      }

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Challenge Forfeited!')
        .setDescription(
          `Team **${forfeiterTeam.name}** has forfeited the challenge against **${winnerTeam.name}**!`,
        )
        .addFields(
          {
            name: 'Result',
            value: `**${winnerTeam.name}** wins by forfeit with a score of **${forfeitResult.score}**!`,
            inline: false,
          },
          {
            name: 'Challenger',
            value: `**${challengerTeam.name}** (Tier ${challenge.tierBefore.challenger})`,
            inline: true,
          },
          {
            name: 'Defender',
            value: `**${defendingTeam.name}** (Tier ${challenge.tierBefore.defending})`,
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
        if (isChallenger) {
          const defendingCaptainMember = defendingTeam.members.find((m: TeamMember) => m.isCaptain);
          if (defendingCaptainMember) {
            const defendingCaptain = await interaction.client.users.fetch(
              defendingCaptainMember.discordId,
            );
            await defendingCaptain.send({
              content: `Team **${forfeiterTeam.name}** has forfeited their challenge against your team`,
              embeds: [embed],
            });
          }
        } else if (isDefender) {
          const challengerCaptainMember = challengerTeam.members.find((m: TeamMember) => m.isCaptain);
          if (challengerCaptainMember) {
            const challengerCaptain = await interaction.client.users.fetch(
              challengerCaptainMember.discordId,
            );
            await challengerCaptain.send({
              content: `Team **${forfeiterTeam.name}** has forfeited their defense against your challenge`,
              embeds: [embed],
            });
          }
        }
      } catch (dmError) {
        logger.warn(`Could not DM other team captain: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply(
        'Failed to process forfeit. The challenge may already be completed or cancelled.',
      );
    }
  } catch (error) {
    logger.error('Error forfeiting challenge:', error);
    await interaction.editReply('Failed to forfeit challenge. Check logs for details.');
  }
}

/**
 * Handle the team view_challenges command
 */
export async function handleViewChallenges(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    // Get active tournaments
    const tournaments = await tournamentService.getActiveTournaments();
    if (tournaments.length === 0) {
      await interaction.editReply('There are no active tournaments.');
      return;
    }

    // Find all teams where the user is a member
    const userTeams = [];
    for (const tournament of tournaments) {
      const standings = await tournamentService.getTournamentStandings(tournament.tournamentId);

      // Find teams where user is a member
      const userTeamTournaments = standings.filter(entry => {
        const team = entry.team as unknown as Team;
        return team && team.members && team.members.some((m: TeamMember) => m.discordId === interaction.user.id);
      });

      if (userTeamTournaments.length > 0) {
        for (const teamTournament of userTeamTournaments) {
          const team = teamTournament.team as unknown as Team;
          userTeams.push({
            teamId: team.teamId,
            teamName: team.name,
            tournamentId: tournament.tournamentId,
            tournamentName: tournament.name,
          });
        }
      }
    }

    if (userTeams.length === 0) {
      await interaction.editReply('You are not a member of any team in active tournaments.');
      return;
    }

    // Get all challenges for user's teams
    const allChallenges = [];
    for (const team of userTeams) {
      const pendingChallenges = await challengeService.getPendingChallengesForTeam(team.teamId);

      for (const challenge of pendingChallenges) {
        // Find challenger and defender teams
        const isChallengerTeam = challenge.challengerTeamTournament.toString() === team.teamId;
        if (!isChallengerTeam) {
          continue;
        }

        // Get team tournament objects
        const tournament = tournaments.find(t => t.tournamentId === challenge.tournamentId);

        if (tournament) {
          const standings = await tournamentService.getTournamentStandings(tournament.tournamentId);

          const challengerTeamTournament = standings.find(entry => {
            const t = entry.team as unknown as Team;
            return t && t.teamId === challenge.challengerTeamTournament.toString();
          });

          const defendingTeamTournament = standings.find(entry => {
            const t = entry.team as unknown as Team;
            return t && t.teamId === challenge.defendingTeamTournament.toString();
          });

          if (challengerTeamTournament && defendingTeamTournament) {
            const challengerTeam = challengerTeamTournament.team as unknown as Team;
            const defendingTeam = defendingTeamTournament.team as unknown as Team;

            allChallenges.push({
              challenge,
              tournament,
              challengerTeam,
              defendingTeam,
              userTeam: team,
            });
          }
        }
      }
    }

    if (allChallenges.length === 0) {
      await interaction.editReply('You have no pending or scheduled challenges.');
      return;
    }

    // Create embeds for each challenge
    const embeds = allChallenges.map(
      ({ challenge, tournament, challengerTeam, defendingTeam, userTeam }) => {
        const isChallengerTeam = challenge.challengerTeamTournament.toString() === userTeam.teamId;

        const embed = new EmbedBuilder()
          .setColor(challenge.status === ChallengeStatus.SCHEDULED ? '#00cc00' : '#ff9900')
          .setTitle(
            `${challenge.status === ChallengeStatus.SCHEDULED ? 'Scheduled' : 'Pending'} Challenge`,
          )
          .setDescription(
            `Challenge between **${challengerTeam.name}** and **${defendingTeam.name}** in tournament **${tournament.name}**`,
          )
          .addFields(
            { name: 'Challenge ID', value: challenge.challengeId, inline: false },
            {
              name: 'Challenger',
              value: `**${challengerTeam.name}** (Tier ${challenge.tierBefore.challenger})`,
              inline: true,
            },
            {
              name: 'Defender',
              value: `**${defendingTeam.name}** (Tier ${challenge.tierBefore.defending})`,
              inline: true,
            },
            { name: 'Status', value: challenge.status, inline: true },
          )
          .setTimestamp();

        // Add scheduled date if available
        if (challenge.scheduledDate) {
          embed.addFields({
            name: 'Scheduled Date',
            value: `<t:${Math.floor(challenge.scheduledDate.getTime() / 1000)}:F>`,
            inline: false,
          });
        }

        // Add proposed dates if available
        if (challenge.proposedDates && challenge.proposedDates.length > 0) {
          const datesField = challenge.proposedDates
            .map((date, index) => `Date ${index + 1}: <t:${Math.floor(date.getTime() / 1000)}:F>`)
            .join('\n');

          embed.addFields({
            name: 'Proposed Dates',
            value: datesField,
            inline: false,
          });
        }

        // Add next steps based on status and team role
        let nextSteps = '';
        if (challenge.status === ChallengeStatus.PENDING) {
          if (isChallengerTeam) {
            if (challenge.proposedDates && challenge.proposedDates.length > 0) {
              nextSteps = 'Use `/team schedule` to select one of the proposed dates.';
            } else {
              nextSteps = 'Waiting for the defending team to propose dates.';
            }
          } else {
            if (!challenge.proposedDates || challenge.proposedDates.length === 0) {
              nextSteps = 'Use `/team propose_dates` to suggest dates for the match.';
            } else {
              nextSteps = 'Waiting for the challenging team to select a date.';
            }
          }
        } else if (challenge.status === ChallengeStatus.SCHEDULED) {
          nextSteps =
            'Play the match at the scheduled time and use `/team result` to submit the result.';
        }

        if (nextSteps) {
          embed.addFields({
            name: 'Next Steps',
            value: nextSteps,
            inline: false,
          });
        }

        return embed;
      },
    );

    // Send the embeds (up to 10 at a time to stay within Discord limits)
    const maxEmbedsPerMessage = 10;
    for (let i = 0; i < embeds.length; i += maxEmbedsPerMessage) {
      const embedBatch = embeds.slice(i, i + maxEmbedsPerMessage);
      if (i === 0) {
        await interaction.editReply({ embeds: embedBatch });
      } else {
        await interaction.followUp({ embeds: embedBatch });
      }
    }
  } catch (error) {
    logger.error('Error viewing challenges:', error);
    await interaction.editReply('Failed to get challenges. Check logs for details.');
  }
}
