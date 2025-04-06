import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleScheduleChallenge(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const date = new Date(interaction.options.getString('date', true));

    const success = await challengeService.scheduleChallenge(challengeId, date);

    if (success) {
      await interaction.editReply(`Challenge ${challengeId} scheduled for ${date}`);
    } else {
      await interaction.editReply(`Failed to schedule challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error scheduling challenge:', error as Error);
    await interaction.editReply('An error occurred while scheduling the challenge');
  }
}
