import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';

const challengeService = new ChallengeService();

export async function handleViewChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const challenge = await challengeService.getChallengeById(challengeId);

    if (!challenge) {
      await interaction.editReply(`Challenge ${challengeId} not found`);
      return;
    }

    const embed = new EmbedBuilder().setTitle(`Challenge ${challengeId}`).addFields(
      { name: 'Status', value: challenge.status, inline: true },
      { name: 'Challenger', value: challenge.challengerTeamTournament.toString(), inline: true },
      { name: 'Defender', value: challenge.defendingTeamTournament.toString(), inline: true },
      {
        name: 'Tier',
        value: `Challenger: ${challenge.tierBefore.challenger}, Defender: ${challenge.tierBefore.defending}`,
        inline: false,
      },
    );

    if (challenge.result) {
      embed.addFields(
        { name: 'Winner', value: challenge.result.winner, inline: true },
        { name: 'Score', value: challenge.result.score, inline: true },
      );
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing challenge:', error as Error);
    await interaction.editReply('An error occurred while viewing the challenge');
  }
}
