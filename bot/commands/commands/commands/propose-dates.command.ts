import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleProposeDates(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const dates = interaction.options
      .getString('dates', true)
      .split(',')
      .map(date => new Date(date.trim()));

    const success = await challengeService.proposeDates(challengeId, dates);

    if (success) {
      await interaction.editReply(
        `Proposed dates for challenge ${challengeId}: ${dates.join(', ')}`,
      );
    } else {
      await interaction.editReply(`Failed to propose dates for challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error proposing dates:', error as Error);
    await interaction.editReply('An error occurred while proposing dates');
  }
}
