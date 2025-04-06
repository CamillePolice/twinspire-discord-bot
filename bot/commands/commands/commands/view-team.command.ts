import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team, { ITeam } from '../../../database/models/team.model';

export async function handleViewTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const teamId = interaction.options.getString('team_id', true);
    const team = await Team.findOne({ teamId });

    if (!team) {
      await interaction.editReply('Team not found');
      return;
    }

    const teamData = team.toObject() as ITeam;
    const members = teamData.members
      .map(member => `${member.username}${member.isCaptain ? ' (Captain)' : ''}`)
      .join('\n');

    await interaction.editReply({
      content: `**Team: ${teamData.name}**\n\n**Members:**\n${members}`,
    });
  } catch (error) {
    logger.error('Error viewing team:', error as Error);
    await interaction.editReply('An error occurred while viewing the team');
  }
}
