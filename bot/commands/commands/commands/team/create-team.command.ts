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
    const discordRole = interaction.options.getString('discord_role');

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

    // Verify Discord role exists if provided
    if (discordRole) {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed('Server Required', 'This command can only be used in a server.'),
          ],
        });
        return;
      }

      // Check if the role is provided as a mention
      const roleIdMatch = discordRole.match(/<@&(\d+)>/);
      let roleExists = false;

      if (roleIdMatch && roleIdMatch[1]) {
        // Role was provided as a mention, check by ID
        const roleId = roleIdMatch[1];
        roleExists = guild.roles.cache.has(roleId);
      } else {
        // Role was provided as a name, check by name
        roleExists = guild.roles.cache.some(role => role.name === discordRole);
      }

      if (!roleExists) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              'Role Not Found',
              `Discord role "${discordRole}" not found in this server.`,
            ),
          ],
        });
        return;
      }
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
      discordRole: discordRole || '',
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
    );

    if (discordRole) {
      embed.addFields({
        name: `${StatusIcons.INFO} Discord Role`,
        value: discordRole,
        inline: true,
      });
    }

    embed.addFields({
      name: `${StatusIcons.INFO} Next Steps`,
      value: [
        `• Use </team add_member:${interaction.commandId}> to add players to your team`,
        `• Use </team view:${interaction.commandId}> to view your team details`,
        `• Use </team-challenge:${interaction.commandId}> to challenge other teams once you've joined a tournament`,
      ].join('\n'),
    });

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
