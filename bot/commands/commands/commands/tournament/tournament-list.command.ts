import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import {
  MessageColors,
  StatusIcons,
  formatTimestamp,
  createTournamentEmbed,
} from '../../../../helpers/message.helpers';

const tournamentService = new TournamentService();

export async function handleListTournaments(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const tournaments = await tournamentService.getActiveTournaments();

    if (tournaments.length === 0) {
      const emptyEmbed = createTournamentEmbed(
        'Tournament Listing',
        `${StatusIcons.INFO} No active tournaments found at this time.`,
      );
      await interaction.editReply({ embeds: [emptyEmbed] });
      return;
    }

    // Create the main embed using helper function
    const embed = createTournamentEmbed(
      'Active Tournaments',
      `${StatusIcons.TROPHY} Found **${tournaments.length}** active tournament${tournaments.length !== 1 ? 's' : ''}`,
    );

    // Add each tournament as a field with consistent styling
    tournaments.forEach((tournament, index) => {
      const statusIcon =
        tournament.status === 'active'
          ? StatusIcons.UNLOCKED
          : tournament.status === 'upcoming'
            ? StatusIcons.TIME
            : StatusIcons.TROPHY;

      embed.addFields({
        name: `${index + 1}. ${tournament.name}`,
        value: [
          `${StatusIcons.INFO} **ID**: \`${tournament.tournamentId}\``,
          `🎮 **Game**: ${tournament.game}`,
          `📊 **Format**: ${tournament.format}`,
          `${statusIcon} **Status**: ${tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}`,
          `${StatusIcons.CALENDAR} **Period**: ${formatTimestamp(tournament.startDate, 'D')} to ${formatTimestamp(tournament.endDate, 'D')}`,
          `${StatusIcons.STAR} **Tiers**: ${tournament.maxTiers} (max)`,
        ].join('\n'),
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing tournaments:', error);
    const errorEmbed = new EmbedBuilder()
      .setColor(MessageColors.ERROR)
      .setTitle(`${StatusIcons.ERROR} Tournament List Error`)
      .setDescription('Failed to retrieve tournaments list.')
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot • Check logs for details' });

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
