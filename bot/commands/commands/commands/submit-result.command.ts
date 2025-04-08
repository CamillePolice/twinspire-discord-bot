import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';
import {
  createErrorEmbed,
  createChallengeEmbed,
  StatusIcons,
} from '../../../helpers/message.helpers';
import { TeamTournament, Team } from '../../../database/models';
import { Schema } from 'mongoose';

const challengeService = new ChallengeService();

export async function handleSubmitResult(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const result = interaction.options.getString('result', true);
    const score = interaction.options.getString('score', true);

    // Parse the score to determine the number of games
    const [winnerScore, loserScore] = score.split('-').map(Number);
    const totalGames = winnerScore + loserScore;

    // Create game results based on the score
    // For simplicity, we'll assume the first games were won by the winner
    const games = [];
    for (let i = 0; i < totalGames; i++) {
      if (i < winnerScore) {
        games.push({ winner: 'winner', loser: 'loser' });
      } else {
        games.push({ winner: 'loser', loser: 'winner' });
      }
    }

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

    // Get team names for better display
    // Check if challengerTeamTournament is an ObjectId or already populated
    const challengerTeamTournamentId = typeof challenge.challengerTeamTournament === 'string' 
      ? challenge.challengerTeamTournament 
      : (challenge.challengerTeamTournament as any)._id || challenge.challengerTeamTournament;
    
    const challengerTeamTournament = await TeamTournament.findById(
      challengerTeamTournamentId
    ).populate({
      path: 'team',
      select: 'name',
    });
    console.log(
      `LOG || handleSubmitResult || challengerTeamTournament ->`,
      challengerTeamTournament,
    );

    // Check if defendingTeamTournament is an ObjectId or already populated
    const defendingTeamTournamentId = typeof challenge.defendingTeamTournament === 'string' 
      ? challenge.defendingTeamTournament 
      : (challenge.defendingTeamTournament as any)._id || challenge.defendingTeamTournament;
    
    const defendingTeamTournament = await TeamTournament.findById(
      defendingTeamTournamentId
    ).populate({
      path: 'team',
      select: 'name',
    });
    console.log(`LOG || handleSubmitResult || defendingTeamTournament ->`, defendingTeamTournament);

    const challengerTeamName = challengerTeamTournament?.team?.name || 'Challenger Team';
    const defendingTeamName = defendingTeamTournament?.team?.name || 'Defending Team';

    // Determine which team the user belongs to
    const challengerTeam = await Team.findById(challengerTeamTournament?.team);
    const defendingTeam = await Team.findById(defendingTeamTournament?.team);

    const isChallengerMember = challengerTeam?.members.some(
      member => member.discordId === interaction.user.id,
    );
    const isDefenderMember = defendingTeam?.members.some(
      member => member.discordId === interaction.user.id,
    );

    if (!isChallengerMember && !isDefenderMember) {
      const embed = createErrorEmbed(
        'Permission Denied',
        'You must be a member of one of the teams involved in this challenge to submit a result.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Determine winner based on the user's team and the result
    const isWinner = result === 'win';
    const winnerTeamId = isChallengerMember
      ? isWinner
        ? challengerTeamTournamentId.toString()
        : defendingTeamTournamentId.toString()
      : isWinner
        ? defendingTeamTournamentId.toString()
        : challengerTeamTournamentId.toString();

    const loserTeamId = isChallengerMember
      ? isWinner
        ? defendingTeamTournamentId.toString()
        : challengerTeamTournamentId.toString()
      : isWinner
        ? challengerTeamTournamentId.toString()
        : defendingTeamTournamentId.toString();

    const winnerTeamName = isChallengerMember
      ? isWinner
        ? challengerTeamName
        : defendingTeamName
      : isWinner
        ? defendingTeamName
        : challengerTeamName;

    const loserTeamName = isChallengerMember
      ? isWinner
        ? defendingTeamName
        : challengerTeamName
      : isWinner
        ? challengerTeamName
        : defendingTeamName;

    // Map the generic 'winner'/'loser' to actual team IDs
    const mappedGames = games.map(game => ({
      winner: game.winner === 'winner' ? winnerTeamId : loserTeamId,
      loser: game.loser === 'winner' ? winnerTeamId : loserTeamId,
    }));

    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      mappedGames,
    );

    if (success) {
      const embed = createChallengeEmbed(
        challengeId,
        'Completed',
        `${StatusIcons.TROPHY} Challenge result submitted successfully!`,
      ).addFields(
        { name: 'Winner', value: winnerTeamName, inline: true },
        { name: 'Loser', value: loserTeamName, inline: true },
        { name: 'Score', value: score, inline: true },
        {
          name: 'Game Details',
          value: mappedGames
            .map((game, i) => {
              const gameWinnerName = game.winner === winnerTeamId ? winnerTeamName : loserTeamName;
              const gameLoserName = game.loser === loserTeamId ? loserTeamName : winnerTeamName;
              return `Game ${i + 1}: ${gameWinnerName} defeated ${gameLoserName}`;
            })
            .join('\n'),
        },
        {
          name: 'Tier Changes',
          value: 'Team tiers and prestige points have been updated based on this result.',
        },
      );

      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = createErrorEmbed(
        'Submission Failed',
        `Failed to submit result for challenge ${challengeId}.`,
        'Please verify that the challenge is in a valid state for result submission.',
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error submitting challenge result:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while submitting the challenge result.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
