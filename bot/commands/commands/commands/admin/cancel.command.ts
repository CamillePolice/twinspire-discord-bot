import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { checkAdminRole } from '../../../../utils/role.utils';

const challengeService = new ChallengeService();

export async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const challengeId = interaction.options.getString('challenge_id', true);
    const reason = interaction.options.getString('reason', true);

    const success = await challengeService.cancelChallenge(challengeId);

    if (success) {
      await interaction.editReply(`Challenge ${challengeId} cancelled. Reason: ${reason}`);
    } else {
      await interaction.editReply(`Failed to cancel challenge ${challengeId}`);
    }
  } catch (error) {
    logger.error('Error cancelling challenge:', error as Error);
    await interaction.editReply('An error occurred while cancelling the challenge');
  }
}
