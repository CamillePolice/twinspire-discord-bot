import { ChatInputCommandInteraction } from 'discord.js';
import {
  createErrorEmbed,
  getRoleIcon,
  createSuccessEmbed,
  StatusIcons,
  addUserAvatar,
} from '../../../../helpers/message.helpers';
import { logger } from '../../../../utils/logger.utils';
import { checkAdminRole } from '../../../../utils/role.utils';
import { Role } from '../../../../database/enums/role.enums';
import { Team } from '../../../../database/models';
import { TeamService } from '../../../../services/tournament/team.services';

export async function handleAdminUpdateTeamMember(
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
    const makeCaptain = interaction.options.getBoolean('make_captain') || false;

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
        embeds: [
          createErrorEmbed('Member Not Found', `${user.username} is not a member of this team.`),
        ],
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
    
    // Handle captain transfer if requested
    let captainTransferMessage = '';
    if (makeCaptain) {
      const teamService = new TeamService();
      const success = await teamService.transferCaptainRole(teamId, user.id);
      
      if (success) {
        captainTransferMessage = `\n${StatusIcons.CROWN} ${user.username} is now the team captain.`;
      } else {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              'Captain Transfer Failed',
              `Failed to transfer captaincy to ${user.username}.`,
            ),
          ],
        });
        return;
      }
    }
    
    await team.save();

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Team Member Updated',
      `${StatusIcons.SUCCESS} Successfully updated ${user.username}'s role in team **${team.name}**${captainTransferMessage}`,
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
      `Admin ${interaction.user.id} updated role for member ${user.id} in team ${team.teamId} from ${oldRole} to ${role}${makeCaptain ? ' and made captain' : ''}`,
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
