import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import { TournamentStatus } from '../../../../database/enums/tournament-status.enums';

const tournamentService = new TournamentService();

export async function handleUpdateStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);
    const newStatus = interaction.options.getString('status', true) as TournamentStatus;

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      await interaction.editReply(`Tournament with ID ${tournamentId} not found.`);
      return;
    }

    // Update the tournament status
    const success = await tournamentService.updateTournament(tournamentId, { status: newStatus });

    if (success) {
      await interaction.editReply(
        `Tournament **${tournament.name}** status updated to **${newStatus}**.`,
      );

      // Send notification to channel
      if (interaction.channel && 'send' in interaction.channel) {
        const publicEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Tournament Status Updated')
          .setDescription(`**${tournament.name}** is now **${newStatus}**.`)
          .setTimestamp()
          .setFooter({ text: 'Twinspire Bot' });

        await interaction.channel.send({ embeds: [publicEmbed] });
      }
    } else {
      await interaction.editReply(`Failed to update tournament status.`);
    }
  } catch (error) {
    logger.error('Error updating tournament status:', error);
    await interaction.editReply('Failed to update tournament status. Check logs for details.');
  }
}
