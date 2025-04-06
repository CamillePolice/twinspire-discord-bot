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

export async function handleAddMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    // Get the user and optional role from the interaction
    const user = interaction.options.getUser('user', true);
    const role = interaction.options.getString('role');

    logger.info(
      `Attempting to add ${user.username} (${user.id}) to a team with role: ${role || 'Not specified'}`,
    );

    // Check if the user is already in a team
    const existingTeamMember = await Team.findOne({
      'members.discordId': user.id,
    });

    if (existingTeamMember) {
      const warningEmbed = createWarningEmbed(
        'User Already in Team',
        `${user.username} is already a member of team **${existingTeamMember.name}**`,
      );

      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    }

    // Find the team where the interaction user is a captain
    const captainTeam = await Team.findOne({
      members: {
        $elemMatch: {
          discordId: interaction.user.id,
          isCaptain: true,
        },
      },
    });

    if (!captainTeam) {
      const errorEmbed = createErrorEmbed(
        'Permission Denied',
        'You must be a team captain to add members.',
      );

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Validate the role if provided
    if (role && !Object.values(Role).includes(role as Role)) {
      const validRoles = Object.values(Role).join(', ');
      const errorEmbed = createErrorEmbed(
        'Invalid Role',
        `"${role}" is not a valid team role.`,
        `Valid roles: ${validRoles}`,
      );

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Add the new member to the team
    captainTeam.members.push({
      discordId: user.id,
      username: user.username,
      role: (role as Role) || undefined,
      isCaptain: false,
    });

    await captainTeam.save();

    logger.info(
      `Added ${user.username} (${user.id}) to team ${captainTeam.name} with role: ${role || 'Not specified'}`,
    );

    // Format role display with icon if specified
    const roleDisplay = role ? `${getRoleIcon(role as Role)} ${role}` : 'Not specified';

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Member Added',
      `Successfully added ${user.username} to team **${captainTeam.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Role', value: roleDisplay, inline: true },
    );

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    logger.error('Error adding member:', error as Error);

    const errorEmbed = createErrorEmbed(
      'Error Adding Member',
      'An error occurred while adding the member to your team.',
      'Please try again later or contact an administrator if the problem persists.',
    );

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
