import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';

export async function handleUpdateMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const memberId = interaction.options.getUser('member', true);
    const isCaptainOption = interaction.options.getBoolean('is_captain');

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.editReply('Team not found');
      return;
    }

    const currentCaptain = team.members.find(
      member => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!currentCaptain) {
      await interaction.editReply('Only team captains can update member roles');
      return;
    }

    const memberIndex = team.members.findIndex(member => member.discordId === memberId.id);
    if (memberIndex === -1) {
      await interaction.editReply('Member not found in the team');
      return;
    }

    if (isCaptainOption === null) {
      await interaction.editReply('No changes specified for the member');
      return;
    }

    team.members[memberIndex].isCaptain = isCaptainOption;
    await team.save();
    await interaction.editReply(
      `Updated ${memberId.username}'s role to ${isCaptainOption ? 'Captain' : 'Member'}`,
    );
  } catch (error) {
    logger.error('Error updating member:', error as Error);
    await interaction.editReply('An error occurred while updating the member');
  }
}
