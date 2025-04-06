import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleForfeit(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const forfeiter = interaction.options.getString('forfeiter', true);
    const reason = interaction.options.getString('reason', true);

    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      await interaction.editReply(`Challenge ${challengeId} not found`);
      return;
    }

    const forfeiterTeamId =
      forfeiter === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const success = await challengeService.forfeitChallenge(challengeId, forfeiterTeamId);

    if (success) {
      await interaction.editReply(
        `Challenge ${challengeId} forfeited by ${forfeiter}. Reason: ${reason}`,
      );
    } else {
      await interaction.editReply(`Failed to process forfeit for challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error processing forfeit:', error as Error);
    await interaction.editReply('An error occurred while processing the forfeit');
  }
}
