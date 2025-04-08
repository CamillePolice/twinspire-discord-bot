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

export async function handleAdminAddTeamMember(
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

    // Check if the user is already in a team
    const existingTeamMember = await Team.findOne({
      'members.discordId': user.id,
    });

    if (existingTeamMember) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'User Already in Team',
            `${user.username} is already a member of team **${existingTeamMember.name}**`,
          ),
        ],
      });
      return;
    }

    // Add the new member to the team
    team.members.push({
      discordId: user.id,
      username: user.username,
      role: role,
      isCaptain: false,
      opgg: opgg,
    });

    await team.save();

    // Create success embed
    const roleDisplay = `${getRoleIcon(role)} ${role}`;
    const successEmbed = createSuccessEmbed(
      'Member Added',
      `${StatusIcons.SUCCESS} Successfully added ${user.username} to team **${team.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Role', value: roleDisplay, inline: true },
      { name: 'OP.GG', value: opgg, inline: true },
    );

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(
      `Admin ${interaction.user.id} added ${user.username} (${user.id}) to team ${team.teamId} with role: ${role}`,
    );
  } catch (error) {
    logger.error('Error adding member:', error as Error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Adding Member',
          'An error occurred while adding the member to the team.',
          'Please try again later or contact an administrator if the problem persists.',
        ),
      ],
    });
  }
} 