// src/commands/commands/tournament/view.command.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';

const tournamentService = new TournamentService();

export async function handleViewTournament(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id');

    // If no tournament ID is provided, show the most recent active tournament
    let tournament;
    if (!tournamentId) {
      const activeTournaments = await tournamentService.getActiveTournaments();
      if (activeTournaments.length === 0) {
        await interaction.editReply('No active tournaments found.');
        return;
      }

      // Sort by start date, descending
      tournament = activeTournaments.sort(
        (a, b) => b.startDate.getTime() - a.startDate.getTime(),
      )[0];
    } else {
      tournament = await tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        await interaction.editReply(`Tournament with ID ${tournamentId} not found.`);
        return;
      }
    }

    // Create tier visualization
    let tiersDisplay = '';
    for (let i = 0; i < tournament.maxTiers; i++) {
      const tier = i + 1;
      const limit = tournament.tierLimits[i];
      tiersDisplay += `**Tier ${tier}**: ${limit} team${limit !== 1 ? 's' : ''} max\n`;
    }

    // Create rules display
    const rules = tournament.rules;
    const rulesDisplay = [
      `• Challenges must be completed within **${rules.challengeTimeframeInDays} days**`,
      `• Teams are protected for **${rules.protectionDaysAfterDefense} days** after successful defense`,
      `• Teams can initiate up to **${rules.maxChallengesPerMonth} challenges per month**`,
      `• Defending teams must propose at least **${rules.minRequiredDateOptions} schedule options**`,
    ].join('\n');

    // Create rewards display
    const rewards = tournament.rewards;
    const rewardsDisplay = [
      `• 1st Place: €${rewards.first}`,
      `• 2nd Place: €${rewards.second}`,
      `• 3rd Place: €${rewards.third}`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(tournament.name)
      .setDescription(tournament.description || 'No description provided.')
      .addFields(
        {
          name: 'Status',
          value: tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1),
          inline: true,
        },
        { name: 'Game', value: tournament.game, inline: true },
        { name: 'Format', value: tournament.format, inline: true },
        {
          name: 'Start Date',
          value: `<t:${Math.floor(tournament.startDate.getTime() / 1000)}:D>`,
          inline: true,
        },
        {
          name: 'End Date',
          value: `<t:${Math.floor(tournament.endDate.getTime() / 1000)}:D>`,
          inline: true,
        },
        { name: 'Tournament ID', value: tournament.tournamentId, inline: true },
        { name: 'Tier Structure', value: tiersDisplay, inline: false },
        { name: 'Rules', value: rulesDisplay, inline: false },
        { name: 'Rewards', value: rewardsDisplay, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing tournament:', error);
    await interaction.editReply('Failed to retrieve tournament details. Check logs for details.');
  }
}
