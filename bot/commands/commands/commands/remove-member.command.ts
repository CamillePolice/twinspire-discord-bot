import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';

export async function handleRemoveMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const memberId = interaction.options.getUser('member', true);

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.editReply('Team not found');
      return;
    }

    const isCaptain = team.members.some(
      member => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!isCaptain) {
      await interaction.editReply('Only team captains can remove members');
      return;
    }

    const memberIndex = team.members.findIndex(member => member.discordId === memberId.id);
    if (memberIndex === -1) {
      await interaction.editReply('Member not found in the team');
      return;
    }

    if (team.members[memberIndex].isCaptain) {
      await interaction.editReply('Cannot remove the team captain');
      return;
    }

    team.members.splice(memberIndex, 1);
    await team.save();
    await interaction.editReply(`Removed ${memberId.username} from the team`);
  } catch (error) {
    logger.error('Error removing member:', error as Error);
    await interaction.editReply('An error occurred while removing the member');
  }
}
