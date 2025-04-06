import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleSubmitResult(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const winner = interaction.options.getString('winner', true);
    const score = interaction.options.getString('score', true);
    const games = interaction.options
      .getString('games', true)
      .split(',')
      .map(game => {
        const [winner, loser] = game.trim().split('-');
        return { winner, loser };
      });

    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge ${challengeId} not found`);
      return;
    }

    const winnerTeamId =
      winner === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      games,
    );

    if (success) {
      await interaction.editReply(
        `Challenge ${challengeId} result submitted. Winner: ${winner}, Score: ${score}`,
      );
    } else {
      await interaction.editReply(`Failed to submit result for challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error submitting challenge result:', error as Error);
    await interaction.editReply('An error occurred while submitting the challenge result');
  }
}
