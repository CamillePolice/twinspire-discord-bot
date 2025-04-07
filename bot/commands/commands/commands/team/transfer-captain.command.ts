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

export async function handleTransferCaptain(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const newCaptainUser = interaction.options.getUser('new_captain', true);

    // Find the team where the user is a member
    const team = await Team.findOne({
      members: { $elemMatch: { discordId: interaction.user.id } },
    });

    if (!team) {
      await interaction.editReply({
        embeds: [createWarningEmbed('Team Not Found', 'You are not a member of any team.')],
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
          createErrorEmbed(
            'Permission Denied',
            `${StatusIcons.CROWN} Only the current team captain can transfer captaincy.`,
          ),
        ],
      });
      return;
    }

    // Find the new captain in the team members
    const newCaptainIndex = team.members.findIndex(
      member => member.discordId === newCaptainUser.id,
    );
    if (newCaptainIndex === -1) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Member Not Found',
            `${newCaptainUser.username} must be a member of the team to become captain.`,
            'Please add them to the team first or select a different member.',
          ),
        ],
      });
      return;
    }

    // Store the new captain's role for display
    const newCaptainRole = team.members[newCaptainIndex].role || 'No role';

    // Find the current captain in the team
    const currentCaptainIndex = team.members.findIndex(
      member => member.discordId === interaction.user.id,
    );

    // Transfer captaincy
    team.members[currentCaptainIndex].isCaptain = false;
    team.members[newCaptainIndex].isCaptain = true;
    team.captainId = newCaptainUser.id;

    await team.save();

    // Create a success embed with detailed information
    const successEmbed = createSuccessEmbed(
      'Captaincy Transferred',
      `${StatusIcons.CROWN} Successfully transferred team leadership to ${newCaptainUser.username}`,
    ).addFields(
      { name: 'Team', value: team.name, inline: true },
      { name: 'Previous Captain', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'New Captain', value: `<@${newCaptainUser.id}>`, inline: true },
    );

    if (newCaptainRole !== 'No role') {
      successEmbed.addFields({ name: 'Captain Role', value: newCaptainRole, inline: true });
    }

    // Add new captain's avatar if available
    addUserAvatar(successEmbed, newCaptainUser);

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(
      `Transferred captaincy in team ${team.teamId} from ${interaction.user.id} to ${newCaptainUser.id}`,
    );
  } catch (error) {
    logger.error('Error transferring captaincy:', error as Error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Transferring Captaincy',
          'An error occurred while transferring team captaincy.',
          'Please try again later or contact an administrator if the problem persists.',
        ),
      ],
    });
  }
}
