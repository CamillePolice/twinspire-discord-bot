import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';
import Team from '../../../database/models/team.model';
import {
  createErrorEmbed,
  createChallengeEmbed,
  StatusIcons,
} from '../../../helpers/message.helpers';

const challengeService = new ChallengeService();

export async function handleChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const defendingTeamId = interaction.options.getString('defending_team', true);
    const tournamentId = interaction.options.getString('tournament_id', true);
    const castDemand = interaction.options.getBoolean('cast_demand') || false;

    // Get the challenger team (current user's team)
    const teams = await Team.find({
      'members.discordId': interaction.user.id,
      'members.isCaptain': true,
    });

    if (teams.length === 0) {
      const embed = createErrorEmbed(
        'Challenge Error',
        'You must be a team captain to issue a challenge.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const challengerTeam = teams[0];

    // Get the defending team to find their captain
    const defendingTeam = await Team.findOne({ teamId: defendingTeamId });
    if (!defendingTeam) {
      const embed = createErrorEmbed('Challenge Error', 'Defending team not found.');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const defendingCaptain = defendingTeam.members.find(member => member.isCaptain);
    if (!defendingCaptain) {
      const embed = createErrorEmbed('Challenge Error', 'Defending team captain not found.');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const challenge = await challengeService.createChallenge(
      challengerTeam.teamId,
      defendingTeamId,
      tournamentId,
      castDemand,
    );

    if (challenge) {
      const embed = createChallengeEmbed(
        challenge.challengeId,
        challenge.status,
        `${StatusIcons.SUCCESS} Challenge issued successfully!`,
      ).addFields(
        { name: 'Challenger', value: challengerTeam.name, inline: true },
        { name: 'Defender', value: defendingTeam.name, inline: true },
        {
          name: 'Next Steps',
          value: 'The defending team should propose dates using `/team-challenge propose_dates`',
        },
      );

      if (challenge.castDemand) {
        embed.addFields({
          name: 'Cast Demand',
          value: `${StatusIcons.INFO} This is a cast demand challenge.`,
        });
      }

      await interaction.editReply({ embeds: [embed] });

      // Send private message to defending team captain
      try {
        const defendingCaptainUser = await interaction.client.users.fetch(
          defendingCaptain.discordId,
        );
        const challengeMessage = await interaction.fetchReply();

        const captainEmbed = createChallengeEmbed(
          challenge.challengeId,
          challenge.status,
          `${StatusIcons.INFO} Your team has been challenged!`,
        ).addFields(
          { name: 'Challenger', value: challengerTeam.name, inline: true },
          { name: 'Defender', value: defendingTeam.name, inline: true },
          {
            name: 'Challenge Details',
            value: `[Click here to view the challenge message](${challengeMessage.url})\n\nUse \`/team-challenge propose_dates\` to propose match dates`,
          },
        );

        if (challenge.castDemand) {
          captainEmbed.addFields({
            name: 'Cast Demand',
            value: `${StatusIcons.INFO} This is a cast demand challenge.`,
          });
        }

        await defendingCaptainUser.send({ embeds: [captainEmbed] });
      } catch (error) {
        logger.error('Error sending DM to defending captain:', error as Error);
        // Don't fail the challenge if DM fails
      }
    } else {
      // Get the specific validation error from the service
      const validationError = challengeService.getLastValidationError();
      let errorMessage = 'Failed to create challenge.';

      if (validationError) {
        errorMessage = validationError;
      } else {
        errorMessage =
          'Please verify that all requirements are met:\n• You must be one tier below the defender\n• The defending team must not be protected\n• You cannot have an existing challenge with this team\n• You must not exceed the monthly challenge limit';
      }

      const embed = createErrorEmbed('Challenge Error', errorMessage);

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error creating challenge:', error as Error);

    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while creating the challenge.',
      error instanceof Error ? error.message : 'Unknown error',
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
