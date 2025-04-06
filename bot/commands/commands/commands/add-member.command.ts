import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';

export async function handleAddMember(interaction: ChatInputCommandInteraction): Promise<void> {
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
      await interaction.editReply('Only team captains can add members');
      return;
    }

    if (team.members.some(member => member.discordId === memberId.id)) {
      await interaction.editReply('Member is already in the team');
      return;
    }

    team.members.push({
      discordId: memberId.id,
      username: memberId.username,
      isCaptain: false,
    });

    await team.save();
    await interaction.editReply(`Added ${memberId.username} to the team`);
  } catch (error) {
    logger.error('Error adding member:', error as Error);
    await interaction.editReply('An error occurred while adding the member');
  }
}
