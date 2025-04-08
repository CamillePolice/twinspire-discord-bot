import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { checkAdminRole } from '../../../../utils/role.utils';
import Team from '../../../../database/models/team.model';
import { Role } from '../../../../database/enums/role.enums';
import {
  createSuccessEmbed,
  createErrorEmbed,
  addUserAvatar,
  getRoleIcon,
  StatusIcons,
} from '../../../../helpers/message.helpers';

export async function handleAdminUpdateMember(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has admin permissions
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const teamId = interaction.options.getString('team_id', true);
    const user = interaction.options.getUser('user', true);
    const role = interaction.options.getString('role', true) as Role;
    const opgg = interaction.options.getString('opgg', true);

    // Find the team
    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Team Not Found', `Team with ID "${teamId}" not found.`)],
      });
      return;
    }

    // Find the member to update
    const memberIndex = team.members.findIndex(member => member.discordId === user.id);
    if (memberIndex === -1) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Member Not Found', `${user.username} is not a member of this team.`)],
      });
      return;
    }

    // Get the old role for messaging
    const oldRole = team.members[memberIndex].role || 'Unassigned';
    const oldRoleDisplay =
      oldRole !== 'Unassigned' ? `${getRoleIcon(oldRole)} ${oldRole}` : 'Unassigned';
    const newRoleDisplay = `${getRoleIcon(role)} ${role}`;

    // Update the member's role and OP.GG
    team.members[memberIndex].role = role;
    team.members[memberIndex].opgg = opgg;
    await team.save();

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Team Member Updated',
      `${StatusIcons.SUCCESS} Successfully updated ${user.username}'s role in team **${team.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Previous Role', value: oldRoleDisplay, inline: true },
      { name: 'New Role', value: newRoleDisplay, inline: true },
      { name: 'OP.GG', value: opgg, inline: true },
    );

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(
      `Admin ${interaction.user.id} updated role for member ${user.id} in team ${team.teamId} from ${oldRole} to ${role}`,
    );
  } catch (error) {
    logger.error('Error updating member:', error as Error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Updating Member',
          'An error occurred while updating the member.',
          'Please try again later or contact an administrator if the problem persists.',
        ),
      ],
    });
  }
}

export async function handleAdminRemoveMember(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has admin permissions
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const teamId = interaction.options.getString('team_id', true);
    const user = interaction.options.getUser('user', true);

    // Find the team
    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Team Not Found', `Team with ID "${teamId}" not found.`)],
      });
      return;
    }

    // Find the member to remove
    const memberIndex = team.members.findIndex(member => member.discordId === user.id);
    if (memberIndex === -1) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Member Not Found', `${user.username} is not a member of this team.`)],
      });
      return;
    }

    // Store member info before removal for the response
    const memberRole = team.members[memberIndex].role || 'No role';
    const wasCaptain = team.members[memberIndex].isCaptain;

    // Remove the member
    team.members.splice(memberIndex, 1);

    // If we removed the captain, assign a new captain if there are other members
    if (wasCaptain && team.members.length > 0) {
      team.members[0].isCaptain = true;
      team.captainId = team.members[0].discordId;
    }

    await team.save();

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Member Removed',
      `${StatusIcons.SUCCESS} Successfully removed ${user.username} from team **${team.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Previous Role', value: memberRole, inline: true },
      { name: 'Team Members', value: `${team.members.length} remaining`, inline: true },
    );

    if (wasCaptain && team.members.length > 0) {
      successEmbed.addFields({
        name: 'New Captain',
        value: `${StatusIcons.CROWN} <@${team.captainId}>`,
        inline: true,
      });
    }

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(`Admin ${interaction.user.id} removed member ${user.id} from team ${team.teamId}`);
  } catch (error) {
    logger.error('Error removing member:', error as Error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Removing Member',
          'An error occurred while removing the member from the team.',
          'Please try again later or contact an administrator if the problem persists.',
        ),
      ],
    });
  }
} 