import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';

export async function handleTransferCaptain(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const newCaptainId = interaction.options.getUser('new_captain', true);

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.editReply('Team not found');
      return;
    }

    const currentCaptain = team.members.find(
      member => member.discordId === interaction.user.id && member.isCaptain,
    );

    if (!currentCaptain) {
      await interaction.editReply('Only the current team captain can transfer captaincy');
      return;
    }

    const newCaptainIndex = team.members.findIndex(member => member.discordId === newCaptainId.id);
    if (newCaptainIndex === -1) {
      await interaction.editReply('New captain must be a member of the team');
      return;
    }

    const currentCaptainIndex = team.members.findIndex(
      member => member.discordId === interaction.user.id,
    );

    team.members[currentCaptainIndex].isCaptain = false;
    team.members[newCaptainIndex].isCaptain = true;

    await team.save();
    await interaction.editReply(`Transferred captaincy to ${newCaptainId.username}`);
  } catch (error) {
    logger.error('Error transferring captaincy:', error as Error);
    await interaction.editReply('An error occurred while transferring captaincy');
  }
}
