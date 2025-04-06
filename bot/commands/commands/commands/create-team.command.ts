import { v4 as uuidv4 } from 'uuid';
import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import Team from '../../../database/models/team.model';

export async function handleCreateTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamName = interaction.options.getString('team_name', true);

    const existingTeam = await Team.findOne({ teamName });
    if (existingTeam) {
      await interaction.editReply('A team with this name already exists in the tournament');
      return;
    }

    const team = new Team({
      teamId: uuidv4(),
      name: teamName,
      captainId: interaction.user.id,
      members: [
        {
          discordId: interaction.user.id,
          username: interaction.user.username,
          isCaptain: true,
        },
      ],
    });

    await team.save();
    await interaction.editReply(`Team "${teamName}" created successfully!`);
  } catch (error) {
    logger.error('Error creating team:', error as Error);
    await interaction.editReply('An error occurred while creating the team');
  }
}
