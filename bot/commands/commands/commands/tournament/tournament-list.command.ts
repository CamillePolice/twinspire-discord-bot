// src/commands/commands/tournament/list.command.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';

const tournamentService = new TournamentService();

export async function handleListTournaments(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const tournaments = await tournamentService.getActiveTournaments();

    if (tournaments.length === 0) {
      await interaction.editReply('No active tournaments found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Active Tournaments')
      .setDescription(`Found ${tournaments.length} active tournament(s)`)
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    // Add each tournament as a field
    tournaments.forEach((tournament, index) => {
      embed.addFields({
        name: `${index + 1}. ${tournament.name}`,
        value: [
          `**ID**: ${tournament.tournamentId}`,
          `**Game**: ${tournament.game}`,
          `**Format**: ${tournament.format}`,
          `**Status**: ${tournament.status}`,
          `**Period**: <t:${Math.floor(tournament.startDate.getTime() / 1000)}:D> to <t:${Math.floor(tournament.endDate.getTime() / 1000)}:D>`,
        ].join('\n'),
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing tournaments:', error);
    await interaction.editReply('Failed to retrieve tournaments list. Check logs for details.');
  }
}
