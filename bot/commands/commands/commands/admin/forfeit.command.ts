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

const challengeService = new ChallengeService();

export async function handleForfeit(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const challengeId = interaction.options.getString('challenge_id', true);
    const forfeiter = interaction.options.getString('forfeiter', true).toLowerCase();
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

    // Validate forfeiter
    if (forfeiter !== 'challenger' && forfeiter !== 'defender') {
      const embed = createErrorEmbed(
        'Invalid Forfeiter',
        'Forfeiter must be either "challenger" or "defender".',
        'Please specify which team is forfeiting the challenge.',
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

    const forfeiterTeamId =
      forfeiter === 'challenger'
        ? challenge.challengerTeamTournament.toString()
        : challenge.defendingTeamTournament.toString();

    const forfeiterTeamName = forfeiter === 'challenger' ? challengerTeamName : defendingTeamName;
    const winnerTeamName = forfeiter === 'challenger' ? defendingTeamName : challengerTeamName;

    const success = await challengeService.forfeitChallenge(challengeId, forfeiterTeamId);

    if (success) {
      const embed = createChallengeEmbed(
        challengeId,
        'Forfeited',
        `${StatusIcons.WARNING} Challenge has been forfeited by admin action.`,
      ).addFields(
        { name: 'Forfeiting Team', value: forfeiterTeamName, inline: true },
        { name: 'Winning Team', value: winnerTeamName, inline: true },
        { name: 'Reason', value: reason },
        {
          name: 'Result',
          value:
            'The winning team has been awarded prestige points and tier adjustments have been made if applicable.',
        },
      );

      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed(
        'Forfeit Failed',
        `Failed to process forfeit for challenge ${challengeId}.`,
        'The challenge may already be completed or cancelled.',
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error processing forfeit:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while processing the forfeit.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
