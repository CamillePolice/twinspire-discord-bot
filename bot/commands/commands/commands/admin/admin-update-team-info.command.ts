import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TeamService } from '../../../../services/tournament/team.services';
import { checkAdminRole } from '../../../../utils/role.utils';
import {
  createErrorEmbed,
  createSuccessEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';

export const handleAdminUpdateTeamInfo = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has admin permissions
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const teamName = interaction.options.getString('team_name', true);
    const newName = interaction.options.getString('new_name');
    const discordRole = interaction.options.getString('discord_role');

    // Check if at least one field is provided for update
    if (!newName && !discordRole) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Missing Update Fields',
            'You must provide at least one field to update (new_name or discord_role).',
          ),
        ],
      });
      return;
    }

    // Get the team
    const teamService = new TeamService();
    const team = await teamService.getTeamByTeamName(teamName);
    if (!team) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Team Not Found', `Team "${teamName}" not found.`)],
      });
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

    // Prepare update data
    const updateData: Record<string, string> = {};
    if (newName) updateData.name = newName;
    if (discordRole) updateData.discordRole = discordRole;

    // Update the team
    const success = await teamService.updateTeam(team.teamId, updateData);
    if (!success) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed('Update Failed', 'Failed to update the team. Please try again later.'),
        ],
      });
      return;
    }

    // Prepare response message
    const updatedFields = [];
    if (newName) updatedFields.push(`name to "${newName}"`);
    if (discordRole) updatedFields.push('discord role');

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Team Updated',
          `${StatusIcons.SUCCESS} Team "${teamName}" has been updated with new ${updatedFields.join(
            ', ',
          )}.`,
        ),
      ],
    });

    logger.info(
      `Admin ${interaction.user.tag} (${interaction.user.id}) updated team "${teamName}" (${team.teamId})`,
    );
  } catch (error) {
    logger.error('Error updating team:', error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Updating Team',
          'An error occurred while updating the team. Please try again later.',
          'Check server logs for details.',
        ),
      ],
    });
  }
};
