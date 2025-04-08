import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import Team from '../../../../database/models/team.model';
import {
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  addUserAvatar,
  StatusIcons,
} from '../../../../helpers/message.helpers';

export async function handleRemoveMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);

    // Find the team where the user is a member
    const team = await Team.findOne({ members: { $elemMatch: { discordId: user.id } } });

    if (!team) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed('Team Not Found', `${user.username} is not a member of any team.`),
        ],
      });
      return;
    }

    // Check if the command user is the team captain
    const isCaptain = team.members.some(
      member => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isCaptain) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Permission Denied',
            'Only team captains can remove members from the team.',
          ),
        ],
      });
      return;
    }

    // Find the member to remove
    const memberIndex = team.members.findIndex(member => member.discordId === user.id);
    if (memberIndex === -1) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Member Not Found',
            `${user.username} is not a member of team **${team.name}**.`,
          ),
        ],
      });
      return;
    }

    // Check if trying to remove a captain
    if (team.members[memberIndex].isCaptain) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed(
            'Cannot Remove Captain',
            `${StatusIcons.CROWN} Team captains cannot be removed. Use the \`transfer_captain\` command first to change captaincy.`,
          ),
        ],
      });
      return;
    }

    // Store member info before removal for the response
    const memberRole = team.members[memberIndex].role || 'No role';

    // Remove the member
    team.members.splice(memberIndex, 1);
    await team.save();

    // Create success embed
    const successEmbed = createSuccessEmbed(
      'Member Removed',
      `Successfully removed ${user.username} from team **${team.name}**`,
    ).addFields(
      { name: 'Member', value: `<@${user.id}>`, inline: true },
      { name: 'Previous Role', value: memberRole, inline: true },
      { name: 'Team Members', value: `${team.members.length} remaining`, inline: true },
    );

    // Add user avatar if available
    addUserAvatar(successEmbed, user);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(`Removed member ${user.id} from team ${team.teamId}`);
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
