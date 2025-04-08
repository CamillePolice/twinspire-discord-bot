import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import {
  createErrorEmbed,
  createChallengeEmbed,
  formatTimestamp,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { TeamTournament } from '../../../../database/models';
import { ITeamMember } from '../../../../database/models/team.model';

const challengeService = new ChallengeService();

export async function handleProposeDates(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);

    // Check if dates have already been proposed
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      const embed = createErrorEmbed(
        'Challenge Not Found',
        `Challenge ${challengeId} does not exist.`,
        'Please verify the challenge ID and try again.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (challenge.proposedDates && challenge.proposedDates.length > 0) {
      const embed = createErrorEmbed(
        'Dates Already Proposed',
        'This challenge already has proposed dates.',
        'If you need to change the dates, please contact an administrator.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const date1 = new Date(interaction.options.getString('date1', true));
    const date2 = new Date(interaction.options.getString('date2', true));
    const date3 = new Date(interaction.options.getString('date3', true));

    // Validate dates
    if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || isNaN(date3.getTime())) {
      const embed = createErrorEmbed(
        'Invalid Date Format',
        'One or more dates are invalid.',
        'Please use the format YYYY-MM-DD HH:MM (e.g., 2025-04-15 18:00)',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if dates are in the future
    const now = new Date();
    if (date1 <= now || date2 <= now || date3 <= now) {
      const embed = createErrorEmbed(
        'Invalid Dates',
        'All proposed dates must be in the future.',
        'Please select dates and times that have not yet occurred.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const dates = [date1, date2, date3];

    const success = await challengeService.proposeDates(challengeId, dates);

    if (success) {
      const embed = createChallengeEmbed(
        challengeId,
        'Pending',
        `${StatusIcons.CALENDAR} Date options have been proposed successfully!`,
      ).addFields(
        {
          name: 'Proposed Date Options',
          value: dates
            .map((date, i) => `Option ${i + 1}: ${formatTimestamp(date, 'F')}`)
            .join('\n'),
        },
        {
          name: 'Next Steps',
          value:
            'The opponent team should select one of these dates using `/team-challenge schedule`.',
        },
      );

      await interaction.editReply({ embeds: [embed] });

      // Send DM to opposing team's captain
      try {
        // Get the opposing team's captain
        const opposingTeamTournament =
          challenge.challengerTeamTournament.toString() === interaction.user.id
            ? challenge.defendingTeamTournament
            : challenge.challengerTeamTournament;

        // Get the team document using the team ID from the TeamTournament
        const teamTournament = await TeamTournament.findById(opposingTeamTournament).populate({
          path: 'team',
          select: 'name captainId members',
        });

        if (!teamTournament) {
          logger.error(`Could not find team tournament for challenge ${challengeId}`);
          return;
        }

        const opposingTeam = teamTournament.team as any; // Type assertion needed due to mongoose populate
        if (!opposingTeam) {
          logger.error(`Could not find opposing team for challenge ${challengeId}`);
          return;
        }

        const opposingCaptain = opposingTeam.members.find(
          (member: ITeamMember) => member.isCaptain,
        );
        if (!opposingCaptain) {
          logger.error(`Could not find captain for opposing team ${opposingTeam.teamId}`);
          return;
        }

        const opposingCaptainUser = await interaction.client.users.fetch(opposingCaptain.discordId);
        const challengeMessage = await interaction.fetchReply();

        const captainEmbed = createChallengeEmbed(
          challengeId,
          'Pending',
          `${StatusIcons.CALENDAR} Your opponent has proposed match dates!`,
        ).addFields(
          {
            name: 'Proposed Date Options',
            value: dates
              .map((date, i) => `Option ${i + 1}: ${formatTimestamp(date, 'F')}`)
              .join('\n'),
          },
          {
            name: 'Challenge Details',
            value: `[Click here to view the challenge message](${challengeMessage.url})\n\nUse \`/team-challenge schedule\` to select one of these dates.`,
          },
        );

        await opposingCaptainUser.send({ embeds: [captainEmbed] });
      } catch (error) {
        logger.error('Error sending DM to opposing captain:', error as Error);
        // Don't fail the proposal if DM fails
      }
    } else {
      const embed = createErrorEmbed(
        'Proposal Failed',
        `Failed to propose dates for challenge ${challengeId}.`,
        "This may occur if the challenge doesn't exist or is no longer in a state where dates can be proposed.",
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error proposing dates:', error as Error);

    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while proposing dates.',
      error instanceof Error ? error.message : 'Unknown error',
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
