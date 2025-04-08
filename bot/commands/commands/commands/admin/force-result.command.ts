import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { checkAdminRole } from '../../../../utils/role.utils';
import {
  createErrorEmbed,
  createChallengeEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { TeamTournament } from '../../../../database/models';
import { ChallengeStatus } from '../../../../database/enums/challenge.enums';

const challengeService = new ChallengeService();

export async function handleForceResult(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const challengeId = interaction.options.getString('challenge_id', true);
    const winner = interaction.options.getString('winner', true);
    const score = interaction.options.getString('score', true);
    const reason = interaction.options.getString('reason', true);

    // Get challenge details
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      const embed = createErrorEmbed(
        'Challenge Not Found',
        `Challenge ${challengeId} does not exist.`,
        'Please verify the challenge ID and try again.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if challenge is already completed
    if (
      challenge.status === ChallengeStatus.COMPLETED ||
      challenge.status === ChallengeStatus.CANCELLED
    ) {
      const embed = createErrorEmbed(
        'Challenge Already Completed',
        `Challenge ${challengeId} has already been completed.`,
        'Force result cannot be used on completed challenges.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Get team names for better display
    const challengerTeamTournament = await TeamTournament.findById(
      challenge.challengerTeamTournament,
    ).populate({
      path: 'team',
      select: 'name',
    });

    const defendingTeamTournament = await TeamTournament.findById(
      challenge.defendingTeamTournament,
    ).populate({
      path: 'team',
      select: 'name',
    });

    const challengerTeamName = challengerTeamTournament?.team?.name || 'Challenger Team';
    const defendingTeamName = defendingTeamTournament?.team?.name || 'Defending Team';

    const winnerTeamId =
      winner === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const loserTeamId =
      winner === 'challenger'
        ? challenge.defendingTeamTournament.toString()
        : challenge.challengerTeamTournament.toString();

    const winnerTeamName = winner === 'challenger' ? challengerTeamName : defendingTeamName;
    const loserTeamName = winner === 'challenger' ? defendingTeamName : challengerTeamName;

    // Create game results array
    const games = [
      {
        winner: winnerTeamId,
        loser: loserTeamId,
      },
    ];

    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      games,
    );

    if (success) {
      const embed = createChallengeEmbed(
        challengeId,
        'Completed',
        `${StatusIcons.CROWN} Challenge result has been administratively forced.`,
      ).addFields(
        { name: 'Winner', value: winnerTeamName, inline: true },
        { name: 'Loser', value: loserTeamName, inline: true },
        { name: 'Score', value: score, inline: true },
        { name: 'Admin Reason', value: reason },
        {
          name: 'Result Impact',
          value: 'Team tiers and prestige points have been updated based on this result.',
        },
      );

      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed(
        'Force Result Failed',
        `Failed to force result for challenge ${challengeId}.`,
        'The challenge may be in a state that cannot be modified.',
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error forcing challenge result:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while forcing the challenge result.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
