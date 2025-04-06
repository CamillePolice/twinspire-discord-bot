import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleForceResult(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const winner = interaction.options.getString('winner', true);
    const score = interaction.options.getString('score', true);
    const reason = interaction.options.getString('reason', true);

    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge ${challengeId} not found`);
      return;
    }

    const winnerTeamId =
      winner === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const success = await challengeService.submitChallengeResult(challengeId, winnerTeamId, score, [
      {
        winner: winnerTeamId,
        loser:
          winner === 'challenger'
            ? challenge.defendingTeamTournament.toString()
            : challenge.challengerTeamTournament.toString(),
      },
    ]);

    if (success) {
      await interaction.editReply(
        `Challenge ${challengeId} result forced. Winner: ${winner}, Score: ${score}, Reason: ${reason}`,
      );
    } else {
      await interaction.editReply(`Failed to force result for challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error forcing challenge result:', error as Error);
    await interaction.editReply('An error occurred while forcing the challenge result');
  }
}
