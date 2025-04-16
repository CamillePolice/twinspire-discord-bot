import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { checkAdminRole } from '../../../../utils/role.utils';
import {
  createErrorEmbed,
  createChallengeEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { TeamTournament, Challenge } from '../../../../database/models';

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
    const unfair = interaction.options.getBoolean('unfair', false) || false;
    const forfeitType = interaction.options.getString('forfeit_type', false);

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
        ? challenge.challengerTeamTournament._id.toString()
        : challenge.defendingTeamTournament._id.toString();

    const forfeiterTeamName = forfeiter === 'challenger' ? challengerTeamName : defendingTeamName;
    const winnerTeamName = forfeiter === 'challenger' ? defendingTeamName : challengerTeamName;

    // Set the unfairForfeit flag and forfeit type
    if (unfair || forfeitType) {
      await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            unfairForfeit: true,
            forfeitType: forfeitType || (unfair ? 'unfair' : undefined),
            forfeitPenalty: forfeitType === 'no_show' ? 15 : forfeitType === 'give_up' ? 20 : 10,
          },
        },
      );
    }

    const success = await challengeService.forfeitChallenge(challengeId, forfeiterTeamId, unfair);

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
            forfeitType === 'no_show'
              ? 'The winning team has been awarded prestige points and tier adjustments have been made. The forfeiting team has been penalized with -15 points.'
              : forfeitType === 'give_up'
                ? 'The winning team has been awarded prestige points and tier adjustments have been made. The forfeiting team has been penalized with -20 points.'
                : unfair
                  ? 'The winning team has been awarded prestige points and tier adjustments have been made. The forfeiting team has been penalized with -10 points.'
                  : 'The winning team has been awarded prestige points and tier adjustments have been made if applicable.',
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
