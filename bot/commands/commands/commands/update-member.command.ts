import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';
import { Role } from '../../../database/enums/role.enums';
import {
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  addUserAvatar,
  getRoleIcon,
} from '../../../helpers/message.helpers';

export async function handleUpdateMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const role = interaction.options.getString('role', true);
    const user = interaction.options.getUser('user', true);

    // Find the team where this user is a member
    const team = await Team.findOne({ members: { $elemMatch: { discordId: user.id } } });
    if (!team) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed('User Not in Team', `${user.username} is not a member of any team.`),
        ],
      });
      return;
    }

    // Check if the command user is the team captain
    const currentCaptain = team.members.find(
      member => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!currentCaptain) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed('Permission Denied', 'Only team captains can update member roles.'),
        ],
      });
      return;
    }

    // Find the member to update
    const memberIndex = team.members.findIndex(member => member.discordId === user.id);
    if (memberIndex === -1) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Member Not Found', 'Member not found in the team.')],
      });
      return;
    }

    // Verify that the role is valid
    if (!Object.values(Role).includes(role as Role)) {
      const validRoles = Object.values(Role).join(', ');
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Invalid Role',
            `"${role}" is not a valid team role.`,
            `Valid roles: ${validRoles}`,
          ),
        ],
      });
      return;
    }

    // Get the old role for messaging
    const oldRole = team.members[memberIndex].role || 'Unassigned';
    const oldRoleDisplay =
      oldRole !== 'Unassigned' ? `${getRoleIcon(oldRole)} ${oldRole}` : 'Unassigned';
    const newRoleDisplay = `${getRoleIcon(role)} ${role}`;

    // Update the member's role
    team.members[memberIndex].role = role;
    await team.save();

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Team Member Updated',
      `Successfully updated ${user.username}'s role in team **${team.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Previous Role', value: oldRoleDisplay, inline: true },
      { name: 'New Role', value: newRoleDisplay, inline: true },
    );

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(
      `Updated role for member ${user.id} in team ${team.teamId} from ${oldRole} to ${role}`,
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
