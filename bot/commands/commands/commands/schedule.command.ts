import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';
import {
  createErrorEmbed,
  createChallengeEmbed,
  formatTimestamp,
  StatusIcons,
} from '../../../helpers/message.helpers';
import { ChallengeStatus } from '../../../database/enums/challenge.enums';
import { TeamTournament } from '../../../database/models';
import { ITeamMember } from '../../../database/models/team.model';

const challengeService = new ChallengeService();

export async function handleScheduleChallenge(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const dateOption = interaction.options.getInteger('date_option', true);

    // Get the challenge to check if it has proposed dates
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

    // Check if challenge is already scheduled
    if (challenge.status === ChallengeStatus.SCHEDULED) {
      // Fetch team names from the database
      const challengerTeamTournament = await TeamTournament.findById(
        challenge.challengerTeamTournament,
      ).populate({
        path: 'team',
        select: 'name',
      });

      const defendingTeamTournament = await TeamTournament.findById(
        challenge.defendingTeamTournament,
      ).populate({
        path: 'team',
        select: 'name',
      });

      const challengerTeamName = challengerTeamTournament?.team?.name || 'Unknown Team';
      const defendingTeamName = defendingTeamTournament?.team?.name || 'Unknown Team';
      const scheduledDate = challenge.scheduledDate
        ? formatTimestamp(challenge.scheduledDate, 'F')
        : 'Unknown Date';

      const embed = createErrorEmbed(
        'Challenge Already Scheduled',
        `This challenge is already scheduled for ${scheduledDate}.`,
        `Challenge between ${challengerTeamName} and ${defendingTeamName} cannot be rescheduled.`,
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!challenge.proposedDates || challenge.proposedDates.length === 0) {
      const embed = createErrorEmbed(
        'No Proposed Dates',
        'This challenge does not have any proposed dates yet.',
        'The opponent team must propose dates first using `/team-challenge propose_dates`.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Validate date option
    if (dateOption < 1 || dateOption > challenge.proposedDates.length) {
      const embed = createErrorEmbed(
        'Invalid Date Option',
        `Option ${dateOption} is not valid.`,
        `Please select an option between 1 and ${challenge.proposedDates.length}.`,
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Get the selected date (0-indexed array)
    const selectedDate = challenge.proposedDates[dateOption - 1];

    const success = await challengeService.scheduleChallenge(challengeId, selectedDate);

    if (success) {
      const embed = createChallengeEmbed(
        challengeId,
        'Scheduled',
        `${StatusIcons.CALENDAR} Challenge has been scheduled successfully!`,
      ).addFields(
        {
          name: 'Scheduled Date',
          value: formatTimestamp(selectedDate, 'F'),
        },
        {
          name: 'Next Steps',
          value:
            'Both teams should prepare for the challenge at the scheduled time. After the match, use `/team-challenge submit_result` to report the outcome.',
        },
      );

      await interaction.editReply({ embeds: [embed] });

      // Send DM to both team captains
      try {
        // Get both team tournaments with populated team data
        const challengerTeamTournament = await TeamTournament.findById(
          challenge.challengerTeamTournament,
        ).populate({
          path: 'team',
          select: 'name members',
        });

        const defendingTeamTournament = await TeamTournament.findById(
          challenge.defendingTeamTournament,
        ).populate({
          path: 'team',
          select: 'name members',
        });

        if (!challengerTeamTournament || !defendingTeamTournament) {
          logger.error(`Could not find team tournaments for challenge ${challengeId}`);
          return;
        }

        // Get captains from both teams
        const challengerTeam = challengerTeamTournament.team as any;
        const defendingTeam = defendingTeamTournament.team as any;

        const challengerCaptain = challengerTeam.members.find(
          (member: ITeamMember) => member.isCaptain,
        );
        const defendingCaptain = defendingTeam.members.find(
          (member: ITeamMember) => member.isCaptain,
        );

        if (!challengerCaptain || !defendingCaptain) {
          logger.error(`Could not find captains for challenge ${challengeId}`);
          return;
        }

        // Fetch Discord users for both captains
        const challengerCaptainUser = await interaction.client.users.fetch(challengerCaptain.discordId);
        const defendingCaptainUser = await interaction.client.users.fetch(defendingCaptain.discordId);

        // Create notification embed
        const notificationEmbed = createChallengeEmbed(
          challengeId,
          'Scheduled',
          `${StatusIcons.CALENDAR} Your challenge has been scheduled!`,
        ).addFields(
          {
            name: 'Teams',
            value: `${challengerTeam.name} vs ${defendingTeam.name}`,
          },
          {
            name: 'Scheduled Date',
            value: formatTimestamp(selectedDate, 'F'),
          },
          {
            name: 'Next Steps',
            value: 'Prepare for the challenge at the scheduled time. After the match, use `/team-challenge submit_result` to report the outcome.',
          },
        );

        // Send DM to both captains
        await challengerCaptainUser.send({ embeds: [notificationEmbed] });
        await defendingCaptainUser.send({ embeds: [notificationEmbed] });

        logger.info(`Sent schedule notifications to captains for challenge ${challengeId}`);
      } catch (error) {
        logger.error('Error sending DM to team captains:', error as Error);
        // Don't fail the scheduling if DM fails
      }
    } else {
      const embed = createErrorEmbed(
        'Scheduling Failed',
        `Failed to schedule challenge ${challengeId}.`,
        'Please try again or contact an administrator if the issue persists.',
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error scheduling challenge:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while scheduling the challenge.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
