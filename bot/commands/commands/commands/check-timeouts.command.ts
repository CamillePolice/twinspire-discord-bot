import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleCheckTimeouts(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);
    const pastDueChallenges = await challengeService.getPastDueDefenderResponses(tournamentId);

    if (pastDueChallenges.length === 0) {
      await interaction.editReply('No past due challenges found');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Past Due Challenges')
      .setDescription(`Found ${pastDueChallenges.length} challenges that need attention`);

    for (const challenge of pastDueChallenges) {
      embed.addFields({
        name: `Challenge ${challenge.challengeId}`,
        value: `Challenger: ${challenge.challengerTeamTournament}\nDefender: ${challenge.defendingTeamTournament}\nStatus: ${challenge.status}`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error checking timeouts:', error as Error);
    await interaction.editReply('An error occurred while checking timeouts');
  }
}
