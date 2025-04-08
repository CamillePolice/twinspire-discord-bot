import { v4 as uuidv4 } from 'uuid';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import Team from '../../../../database/models/team.model';
import {
  StatusIcons,
  createErrorEmbed,
  createWarningEmbed,
  createTeamEmbed,
  addUserAvatar,
} from '../../../../helpers/message.helpers';

export async function handleCreateTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamName = interaction.options.getString('team_name', true);

    // Check for existing team
    const existingTeam = await Team.findOne({ name: teamName });
    if (existingTeam) {
      const warningEmbed = createWarningEmbed(
        'Team Already Exists',
        `A team with the name **${teamName}** already exists.`,
      );
      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    }

    // Generate unique team ID
    const teamId = uuidv4();

    // Create new team
    const team = new Team({
      teamId,
      name: teamName,
      captainId: interaction.user.id,
      members: [
        {
          discordId: interaction.user.id,
          username: interaction.user.username,
          isCaptain: true,
        },
      ],
    });

    await team.save();

    // Create success embed
    const embed = createTeamEmbed(
      teamName,
      `${StatusIcons.SUCCESS} Your team has been created successfully!\n\nYou are the team captain ${StatusIcons.CROWN}`,
    );

    // Add user avatar if available
    addUserAvatar(embed, interaction.user);

    embed.addFields(
      {
        name: `${StatusIcons.INFO} Team ID`,
        value: `\`${teamId}\``,
        inline: true,
      },
      {
        name: `${StatusIcons.CROWN} Captain`,
        value: `<@${interaction.user.id}>`,
        inline: true,
      },
      {
        name: `${StatusIcons.INFO} Next Steps`,
        value: [
          `• Use </team add_member:${interaction.commandId}> to add players to your team`,
          `• Use </team view:${interaction.commandId}> to view your team details`,
          `• Use </team-challenge:${interaction.commandId}> to challenge other teams once you've joined a tournament`,
        ].join('\n'),
      },
    );

    logger.info(
      `Team "${teamName}" (${teamId}) created by ${interaction.user.username} (${interaction.user.id})`,
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error creating team:', error as Error);

    const errorEmbed = createErrorEmbed(
      'Team Creation Failed',
      'An error occurred while creating your team. Please try again later.',
    );

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
