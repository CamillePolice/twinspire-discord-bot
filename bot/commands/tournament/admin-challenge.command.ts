// src/commands/admin-challenge.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { TournamentService } from '../../services/tournament/tournament.services';
import { ChallengeService } from '../../services/tournament/challenge.services';
import { logger } from '../../utils/logger.utils';
import { IChallenge } from '../../database/models/challenge.model';
import { ITeamTournament } from '../../database/models/team-tournament.model';
import { ITeam } from '../../database/models/team.model';

const tournamentService = new TournamentService();
const challengeService = new ChallengeService();

export default {
  data: new SlashCommandBuilder()
    .setName('admin-challenge')
    .setDescription('Admin commands for tournament challenge management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // View challenge details
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View challenge details')
        .addStringOption(option =>
          option
            .setName('challenge_id')
            .setDescription('Challenge ID')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    // Check for unresponded challenges
    .addSubcommand(subcommand =>
      subcommand
        .setName('check_timeouts')
        .setDescription('Check for challenges that have exceeded response time limits')
        .addStringOption(option =>
          option
            .setName('tournament_id')
            .setDescription('Tournament ID')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    // Force a challenge result (admin decision)
    .addSubcommand(subcommand =>
      subcommand
        .setName('force_result')
        .setDescription('Force a challenge result (admin decision)')
        .addStringOption(option =>
          option
            .setName('challenge_id')
            .setDescription('Challenge ID')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(option =>
          option
            .setName('winner')
            .setDescription('Winner of the challenge')
            .setRequired(true)
            .addChoices(
              { name: 'Challenger Team', value: 'challenger' },
              { name: 'Defending Team', value: 'defending' },
            ),
        )
        .addStringOption(option =>
          option.setName('score').setDescription('Match score (e.g., 2-1)').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for admin decision').setRequired(true),
        ),
    )
    // Force a forfeit
    .addSubcommand(subcommand =>
      subcommand
        .setName('forfeit')
        .setDescription('Force a team to forfeit a challenge')
        .addStringOption(option =>
          option
            .setName('challenge_id')
            .setDescription('Challenge ID')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(option =>
          option
            .setName('forfeiter')
            .setDescription('Team that forfeits')
            .setRequired(true)
            .addChoices(
              { name: 'Challenger Team', value: 'challenger' },
              { name: 'Defending Team', value: 'defending' },
            ),
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for forfeit').setRequired(true),
        ),
    )
    // Cancel a challenge
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel a challenge (no tier changes)')
        .addStringOption(option =>
          option
            .setName('challenge_id')
            .setDescription('Challenge ID')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for cancellation').setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'view':
          await handleViewChallenge(interaction);
          break;
        case 'check_timeouts':
          await handleCheckTimeouts(interaction);
          break;
        case 'force_result':
          await handleForceResult(interaction);
          break;
        case 'forfeit':
          await handleForfeit(interaction);
          break;
        case 'cancel':
          await handleCancel(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      logger.error(`Error executing admin-challenge ${subcommand} command:`, error as Error);
      await interaction.reply({
        content: 'An error occurred while processing the command. Please check the logs.',
        ephemeral: true,
      });
    }
  },
};

/**
 * Handle view challenge command
 */
async function handleViewChallenge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);

    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Get team details
    const teams = await tournamentService.getTournamentStandings(challenge.tournamentId);
    const challengerTeam = teams.find(
      team => team._id.toString() === challenge.challengerTeamTournament.toString(),
    ) as ITeamTournament & { team: ITeam };
    const defendingTeam = teams.find(
      team => team._id.toString() === challenge.defendingTeamTournament.toString(),
    ) as ITeamTournament & { team: ITeam };

    // Format proposed dates
    let proposedDatesText = 'No dates proposed yet.';
    if (challenge.proposedDates && challenge.proposedDates.length > 0) {
      proposedDatesText = challenge.proposedDates
        .map(
          (date: Date, index: number) => `${index + 1}. <t:${Math.floor(date.getTime() / 1000)}:F>`,
        )
        .join('\n');
    }

    // Format scheduled date
    let scheduledDateText = 'Not scheduled yet.';
    if (challenge.scheduledDate) {
      scheduledDateText = `<t:${Math.floor(challenge.scheduledDate.getTime() / 1000)}:F>`;
    }

    // Format result
    let resultText = 'No result yet.';
    if (challenge.result) {
      const winnerTeam =
        challenge.result.winner === challenge.challengerTeamTournament.toString()
          ? challengerTeam
          : defendingTeam;
      const loserTeam =
        challenge.result.winner === challenge.challengerTeamTournament.toString()
          ? defendingTeam
          : challengerTeam;

      resultText = `**${winnerTeam?.team.name || 'Unknown Team'}** defeated **${loserTeam?.team.name || 'Unknown Team'}** with a score of **${challenge.result.score}**`;
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setColor(getStatusColor(challenge.status))
      .setTitle(`Challenge Details: ${challengeId}`)
      .addFields(
        {
          name: 'Status',
          value: challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1),
          inline: true,
        },
        {
          name: 'Created',
          value: `<t:${Math.floor(challenge.createdAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: 'Challenger',
          value: `**${challengerTeam?.team.name || 'Unknown Team'}** (Tier ${challenge.tierBefore.challenger})
                    Captain: <@${challengerTeam?.team.captainId}>`,
          inline: false,
        },
        {
          name: 'Defender',
          value: `**${defendingTeam?.team.name || 'Unknown Team'}** (Tier ${challenge.tierBefore.defending})
                    Captain: <@${defendingTeam?.team.captainId}>`,
          inline: false,
        },
        { name: 'Proposed Dates', value: proposedDatesText, inline: false },
        { name: 'Scheduled Date', value: scheduledDateText, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    // Add result if available
    if (challenge.result) {
      embed.addFields({ name: 'Result', value: resultText, inline: false });

      if (challenge.tierAfter) {
        embed.addFields({
          name: 'Tier Changes',
          value: `Challenger: ${challenge.tierBefore.challenger} → ${challenge.tierAfter.challenger}
                    Defender: ${challenge.tierBefore.defending} → ${challenge.tierAfter.defending}`,
          inline: false,
        });
      }

      if (challenge.prestigeAwarded) {
        embed.addFields({
          name: 'Prestige Awarded',
          value: `Challenger: +${challenge.prestigeAwarded.challenger} points
                    Defender: +${challenge.prestigeAwarded.defending} points`,
          inline: false,
        });
      }
    }

    // Calculate time remaining to respond (if pending)
    if (challenge.status === 'pending' && !challenge.proposedDates) {
      // Get the tournament
      const tournament = await tournamentService.getTournamentById(challenge.tournamentId);
      if (tournament) {
        const responseDeadline = new Date(challenge.createdAt);
        responseDeadline.setDate(
          responseDeadline.getDate() + tournament.rules.challengeTimeframeInDays,
        );

        const now = new Date();
        const timeRemaining = responseDeadline.getTime() - now.getTime();

        if (timeRemaining > 0) {
          // Format time remaining in days and hours
          const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.floor(
            (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );

          embed.addFields({
            name: 'Response Deadline',
            value: `<t:${Math.floor(responseDeadline.getTime() / 1000)}:R> (${daysRemaining}d ${hoursRemaining}h remaining)`,
            inline: false,
          });
        } else {
          embed.addFields({
            name: 'Response Deadline',
            value: `**OVERDUE** - Defender should have responded <t:${Math.floor(responseDeadline.getTime() / 1000)}:R>`,
            inline: false,
          });
        }
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing challenge:', error as Error);
    await interaction.editReply('Failed to view challenge details. Check logs for details.');
  }
}

/**
 * Handle check timeouts command
 */
async function handleCheckTimeouts(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      await interaction.editReply(`Tournament with ID ${tournamentId} not found.`);
      return;
    }

    // Get challenges with overdue responses
    const overdueResponses = await challengeService.getPastDueDefenderResponses(tournamentId);

    if (overdueResponses.length === 0) {
      await interaction.editReply('No overdue challenge responses found.');
      return;
    }

    // Get team details
    const teams = await tournamentService.getTournamentStandings(tournamentId);

    // Create the embed
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Overdue Challenge Responses')
      .setDescription(
        `Found ${overdueResponses.length} challenges with overdue responses in tournament **${tournament.name}**.`,
      )
      .setTimestamp()
      .setFooter({ text: 'Use /admin-challenge forfeit to enforce forfeit penalties' });

    // Add each overdue challenge
    for (const challenge of overdueResponses) {
      const challengerTeam = teams.find(
        team => team._id.toString() === challenge.challengerTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };
      const defendingTeam = teams.find(
        team => team._id.toString() === challenge.defendingTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };

      const daysOverdue = Math.floor(
        (new Date().getTime() -
          (new Date(challenge.createdAt).getTime() +
            tournament.rules.challengeTimeframeInDays * 24 * 60 * 60 * 1000)) /
          (24 * 60 * 60 * 1000),
      );

      embed.addFields({
        name: `Challenge ID: ${challenge.challengeId}`,
        value: `**Challenger**: ${challengerTeam?.team.name || 'Unknown Team'} (Tier ${challenge.tierBefore.challenger})
                  **Defender**: ${defendingTeam?.team.name || 'Unknown Team'} (Tier ${challenge.tierBefore.defending})
                  **Created**: <t:${Math.floor(challenge.createdAt.getTime() / 1000)}:R>
                  **Days Overdue**: ${daysOverdue}
                  **Captain to Contact**: <@${defendingTeam?.team.captainId}>`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error checking timeouts:', error as Error);
    await interaction.editReply('Failed to check challenge timeouts. Check logs for details.');
  }
}

/**
 * Handle force result command
 */
async function handleForceResult(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const winnerOption = interaction.options.getString('winner', true);
    const score = interaction.options.getString('score', true);
    const reason = interaction.options.getString('reason', true);

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
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if challenge is already completed
    if (challenge.status === 'completed') {
      await interaction.editReply('This challenge has already been completed.');
      return;
    }

    // Determine the actual winner team ID based on input
    const winnerTeamId =
      winnerOption === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const loserTeamId =
      winnerOption === 'challenger'
        ? challenge.defendingTeamTournament.toString()
        : challenge.challengerTeamTournament.toString();

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
    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      games,
    );

    if (success) {
      // Get team details
      const teams = await tournamentService.getTournamentStandings(challenge.tournamentId);
      const challengerTeam = teams.find(
        team => team._id.toString() === challenge.challengerTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };
      const defendingTeam = teams.find(
        team => team._id.toString() === challenge.defendingTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };

      const winnerTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString()
          ? challengerTeam
          : defendingTeam;
      const loserTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString()
          ? defendingTeam
          : challengerTeam;

      // Determine tier changes
      let tierChangeText = '';
      if (winnerTeamId === challenge.challengerTeamTournament.toString()) {
        // Challenger won and moved up
        tierChangeText = `**${winnerTeam?.team.name}** has moved up to Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.team.name}** has moved down to Tier ${challenge.tierBefore.challenger}.`;
      } else {
        // Defender successfully defended
        tierChangeText = `**${winnerTeam?.team.name}** successfully defended their position in Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.team.name}** remains in Tier ${challenge.tierBefore.challenger}.`;
      }

      const embed = new EmbedBuilder()
        .setColor('#00cc00')
        .setTitle('Admin: Match Result Forced')
        .setDescription(
          `An administrator has forced a result for the challenge between **${challengerTeam?.team.name || 'Unknown Team'}** and **${defendingTeam?.team.name || 'Unknown Team'}**!`,
        )
        .addFields(
          {
            name: 'Result',
            value: `**${winnerTeam?.team.name || 'Unknown Team'}** defeats **${loserTeam?.team.name || 'Unknown Team'}** with a score of **${score}**!`,
            inline: false,
          },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Admin', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'Tier Changes', value: tierChangeText, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'This result was decided by a tournament administrator' });

      await interaction.editReply({ embeds: [embed] });

      // Send message to channel
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [embed] });
      }

      // DM team captains
      try {
        if (challengerTeam) {
          const challengerCaptain = await interaction.client.users.fetch(
            challengerTeam.team.captainId,
          );
          await challengerCaptain.send({
            content: `An administrator has forced a result for your challenge against **${defendingTeam?.team.name}**`,
            embeds: [embed],
          });
        }

        if (defendingTeam) {
          const defendingCaptain = await interaction.client.users.fetch(
            defendingTeam.team.captainId,
          );
          await defendingCaptain.send({
            content: `An administrator has forced a result for your challenge against **${challengerTeam?.team.name}**`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM team captains: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to force the match result.');
    }
  } catch (error) {
    logger.error('Error forcing result:', error as Error);
    await interaction.editReply('Failed to force result. Check logs for details.');
  }
}

/**
 * Handle forfeit command
 */
async function handleForfeit(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const forfeiterOption = interaction.options.getString('forfeiter', true);
    const reason = interaction.options.getString('reason', true);

    // Get the challenge
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if challenge is already completed
    if (challenge.status === 'completed') {
      await interaction.editReply('This challenge has already been completed.');
      return;
    }

    // Determine the forfeiter team ID based on input
    const forfeiterTeamId =
      forfeiterOption === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const winnerTeamId =
      forfeiterOption === 'challenger'
        ? challenge.defendingTeamTournament.toString()
        : challenge.challengerTeamTournament.toString();

    // Execute the forfeit
    const success = await challengeService.forfeitChallenge(challengeId, forfeiterTeamId);

    if (success) {
      // Get team details
      const teams = await tournamentService.getTournamentStandings(challenge.tournamentId);
      const challengerTeam = teams.find(
        team => team._id.toString() === challenge.challengerTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };
      const defendingTeam = teams.find(
        team => team._id.toString() === challenge.defendingTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };

      const winnerTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString()
          ? challengerTeam
          : defendingTeam;
      const loserTeam =
        winnerTeamId === challenge.challengerTeamTournament.toString()
          ? defendingTeam
          : challengerTeam;

      // Determine tier changes
      let tierChangeText = '';
      if (winnerTeamId === challenge.challengerTeamTournament.toString()) {
        // Challenger won by forfeit and moved up
        tierChangeText = `**${winnerTeam?.team.name}** has moved up to Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.team.name}** has moved down to Tier ${challenge.tierBefore.challenger}.`;
      } else {
        // Defender won by forfeit
        tierChangeText = `**${winnerTeam?.team.name}** remains in Tier ${challenge.tierBefore.defending}!\n**${loserTeam?.team.name}** remains in Tier ${challenge.tierBefore.challenger}.`;
      }

      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('Admin: Match Forfeit Forced')
        .setDescription(
          `An administrator has declared a forfeit for the challenge between **${challengerTeam?.team.name || 'Unknown Team'}** and **${defendingTeam?.team.name || 'Unknown Team'}**!`,
        )
        .addFields(
          {
            name: 'Result',
            value: `**${winnerTeam?.team.name || 'Unknown Team'}** wins by forfeit!`,
            inline: false,
          },
          {
            name: 'Forfeiting Team',
            value: `**${loserTeam?.team.name || 'Unknown Team'}**`,
            inline: true,
          },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Admin', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'Tier Changes', value: tierChangeText, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: 'This result was decided by a tournament administrator' });

      await interaction.editReply({ embeds: [embed] });

      // Send message to channel
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [embed] });
      }

      // DM team captains
      try {
        if (challengerTeam) {
          const challengerCaptain = await interaction.client.users.fetch(
            challengerTeam.team.captainId,
          );
          await challengerCaptain.send({
            content: `An administrator has declared a forfeit for your challenge against **${defendingTeam?.team.name}**`,
            embeds: [embed],
          });
        }

        if (defendingTeam) {
          const defendingCaptain = await interaction.client.users.fetch(
            defendingTeam.team.captainId,
          );
          await defendingCaptain.send({
            content: `An administrator has declared a forfeit for your challenge against **${challengerTeam?.team.name}**`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM team captains: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to process the forfeit.');
    }
  } catch (error) {
    logger.error('Error processing forfeit:', error as Error);
    await interaction.editReply('Failed to process forfeit. Check logs for details.');
  }
}

/**
 * Handle cancel command
 */
async function handleCancel(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const reason = interaction.options.getString('reason', true);

    // Get the challenge
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge with ID ${challengeId} not found.`);
      return;
    }

    // Check if challenge is already completed
    if (challenge.status === 'completed') {
      await interaction.editReply(
        'This challenge has already been completed and cannot be cancelled.',
      );
      return;
    }

    // Update challenge status to cancelled
    const success = await challengeService.cancelChallenge(challengeId);

    if (success) {
      // Get team details
      const teams = await tournamentService.getTournamentStandings(challenge.tournamentId);
      const challengerTeam = teams.find(
        team => team._id.toString() === challenge.challengerTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };
      const defendingTeam = teams.find(
        team => team._id.toString() === challenge.defendingTeamTournament.toString(),
      ) as ITeamTournament & { team: ITeam };

      const embed = new EmbedBuilder()
        .setColor('#999999')
        .setTitle('Admin: Challenge Cancelled')
        .setDescription(
          `An administrator has cancelled the challenge between **${challengerTeam?.team.name || 'Unknown Team'}** and **${defendingTeam?.team.name || 'Unknown Team'}**!`,
        )
        .addFields(
          { name: 'Challenge ID', value: challengeId, inline: false },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Admin', value: `<@${interaction.user.id}>`, inline: false },
          {
            name: 'Note',
            value:
              'This challenge has been cancelled without any tier changes or prestige points awarded.',
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'This action was taken by a tournament administrator' });

      await interaction.editReply({ embeds: [embed] });

      // Send message to channel
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [embed] });
      }

      // DM team captains
      try {
        if (challengerTeam) {
          const challengerCaptain = await interaction.client.users.fetch(
            challengerTeam.team.captainId,
          );
          await challengerCaptain.send({
            content: `An administrator has cancelled your challenge against **${defendingTeam?.team.name}**`,
            embeds: [embed],
          });
        }

        if (defendingTeam) {
          const defendingCaptain = await interaction.client.users.fetch(
            defendingTeam.team.captainId,
          );
          await defendingCaptain.send({
            content: `An administrator has cancelled your challenge against **${challengerTeam?.team.name}**`,
            embeds: [embed],
          });
        }
      } catch (dmError) {
        logger.warn(`Could not DM team captains: ${dmError as Error}`);
      }
    } else {
      await interaction.editReply('Failed to cancel the challenge.');
    }
  } catch (error) {
    logger.error('Error cancelling challenge:', error as Error);
    await interaction.editReply('Failed to cancel challenge. Check logs for details.');
  }
}

/**
 * Get color based on challenge status
 */
function getStatusColor(status: string): number {
  switch (status) {
    case 'pending':
      return 0xff9900; // Orange
    case 'scheduled':
      return 0x0099ff; // Blue
    case 'completed':
      return 0x00cc00; // Green
    case 'cancelled':
      return 0x999999; // Gray
    case 'forfeited':
      return 0xff0000; // Red
    default:
      return 0x0099ff; // Default blue
  }
}
