import { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import {
  createErrorEmbed,
  createChallengeEmbed,
  formatTimestamp,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { ChallengeStatus } from '../../../../database/enums/challenge.enums';
import { TeamTournament } from '../../../../database/models';
import { ITeam } from '../../../../database/models/team.model';

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
        select: 'name discordRole',
      });

      const defendingTeamTournament = await TeamTournament.findById(
        challenge.defendingTeamTournament,
      ).populate({
        path: 'team',
        select: 'name discordRole',
      });

      // Access the team object correctly with proper type casting
      const challengerTeamRole =
        (challengerTeamTournament?.team as any)?.discordRole || 'Unknown Role';
      const defendingTeamRole =
        (defendingTeamTournament?.team as any)?.discordRole || 'Unknown Role';
      const scheduledDate = challenge.scheduledDate
        ? formatTimestamp(challenge.scheduledDate, 'F')
        : 'Unknown Date';

      const embed = createErrorEmbed(
        'Challenge Already Scheduled',
        `This challenge is already scheduled for ${scheduledDate}.`,
        `Challenge between ${challengerTeamRole} and ${defendingTeamRole} cannot be rescheduled.`,
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

    // Check if the user is a member of the challenger team
    const challengerTeamTournament = await TeamTournament.findById(
      challenge.challengerTeamTournament,
    ).populate<{ team: ITeam }>('team');

    if (!challengerTeamTournament) {
      const embed = createErrorEmbed(
        'Team Not Found',
        'Could not find the challenger team for this challenge.',
        'Please contact an administrator if this issue persists.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if the user is a member of the challenger team
    const isChallengerTeamMember = challengerTeamTournament.team.members.some(
      member => member.discordId === interaction.user.id
    );

    if (!isChallengerTeamMember) {
      const embed = createErrorEmbed(
        'Permission Denied',
        'Only members of the challenger team can schedule this challenge.',
        'The defending team must wait for the challenger team to schedule the match.',
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

      // Variables to store team information for both DMs and public announcement
      const challengerTeam = await TeamTournament.findById(
        challenge.challengerTeamTournament,
      ).populate<{ team: ITeam }>('team');
      const defendingTeam = await TeamTournament.findById(
        challenge.defendingTeamTournament,
      ).populate<{ team: ITeam }>('team');

      if (!challengerTeam || !defendingTeam) {
        logger.error(`Could not find teams for challenge ${challengeId}`);
        return;
      }

      // Create notification embed
      const notificationEmbed = createChallengeEmbed(
        challengeId,
        'Scheduled',
        `${StatusIcons.CALENDAR} Your challenge has been scheduled!`,
      ).addFields(
        {
          name: 'Teams',
          value: `${challengerTeam.team.name} vs ${defendingTeam.team.name}`,
        },
        {
          name: 'Scheduled Date',
          value: formatTimestamp(selectedDate, 'F'),
        },
        {
          name: 'Next Steps',
          value:
            'Prepare for the challenge at the scheduled time. After the match, use `/team-challenge submit_result` to report the outcome.',
        },
      );

      // Send DM to all team members
      const challengerTeamMembers = challengerTeam.team.members;
      const defendingTeamMembers = defendingTeam.team.members;

      // Send notifications to all challenger team members
      for (const member of challengerTeamMembers) {
        try {
          const user = await interaction.client.users.fetch(member.discordId);
          await user.send({ embeds: [notificationEmbed] });
          logger.info(
            `Sent schedule notification to challenger team member ${member.discordId} for challenge ${challengeId}`,
          );
        } catch (error) {
          logger.error(
            `Failed to send notification to challenger team member ${member.discordId}:`,
            error as Error,
          );
        }
      }

      // Send notifications to all defending team members
      for (const member of defendingTeamMembers) {
        try {
          const user = await interaction.client.users.fetch(member.discordId);
          await user.send({ embeds: [notificationEmbed] });
          logger.info(
            `Sent schedule notification to defending team member ${member.discordId} for challenge ${challengeId}`,
          );
        } catch (error) {
          logger.error(
            `Failed to send notification to defending team member ${member.discordId}:`,
            error as Error,
          );
        }
      }

      logger.info(`Sent schedule notifications to all team members for challenge ${challengeId}`);

      // Send confirmation to the "défis" channel
      try {
        // Find the "défis" channel in the guild
        const guild = interaction.guild;
        if (!guild) {
          logger.error('Could not find guild for challenge notification');
          return;
        }

        const defisChannel = guild.channels.cache.find(
          channel => channel.name.toLowerCase() === '🆚│défis' && channel instanceof TextChannel,
        ) as TextChannel | undefined;

        if (!defisChannel) {
          logger.error('Could not find "défis" channel for challenge notification');
          return;
        }

        // Find the "Caster" role
        const casterRole = guild.roles.cache.find(role => role.name === 'Caster');
        if (!casterRole) {
          logger.warn('Could not find "Caster" role for challenge notification');
        }

        // Create a more detailed embed for the public announcement
        const publicEmbed = createChallengeEmbed(
          challengeId,
          'Scheduled',
          `${StatusIcons.CALENDAR} A new challenge has been scheduled!`,
        ).addFields(
          {
            name: 'Teams',
            value: `${(challengerTeam.team as ITeam).discordRole || challengerTeam.team.name} vs ${(defendingTeam.team as any).discordRole || defendingTeam.team.name}`,
          },
          {
            name: 'Scheduled Date',
            value: formatTimestamp(selectedDate, 'F'),
          },
          {
            name: 'Tournament',
            value: challenge.tournamentId || 'Unknown Tournament',
          },
          {
            name: 'Tiers',
            value: `Challenger: Tier ${challenge.tierBefore.challenger}, Defender: Tier ${challenge.tierBefore.defending}`,
          },
        );

        // Add cast demand information if applicable
        if (challenge.castDemand) {
          publicEmbed.addFields({
            name: 'Cast Demand',
            value: `${StatusIcons.INFO} This is a cast demand challenge.`,
          });
        }

        // Send the announcement to the "défis" channel with Caster role ping if it's a cast demand
        if (challenge.castDemand && casterRole) {
          await defisChannel.send({ content: `<@&${casterRole.id}>`, embeds: [publicEmbed] });
        } else {
          await defisChannel.send({ embeds: [publicEmbed] });
        }
        logger.info(`Sent challenge announcement to "défis" channel for challenge ${challengeId}`);
      } catch (error) {
        logger.error('Error sending announcement to "défis" channel:', error as Error);
        // Don't fail the scheduling if announcement fails
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
