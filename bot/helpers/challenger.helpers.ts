import { IChallenge } from '../database/models/challenge.model';
import { ITournament } from '../database/models/tournament.model';
import { ITeamTournament } from '../database/models/team-tournament.model';
import { Challenge, Tournament } from '../database/models';
import { ChallengeStatus } from '../database/enums/challenge.enums';
import { logger } from '../utils/logger.utils';
import { v4 as uuidv4 } from 'uuid';
import { getTeamTournament } from './tournament.helpers';
import { TeamService } from '../services/tournament/team.services';
import { TournamentService } from '../services/tournament/tournament.services';
import { ChallengeStats } from '../types/challenge-stat.types';
import { TeamTournamentPair } from '../types/tournament-team-pair.types';
import { TeamPair } from '../types/team-pair.types';
import { Schema } from 'mongoose';

const teamService = new TeamService();
const tournamentService = new TournamentService();

// PRIVATE HELPER METHODS

/**
 * Check for existing pending/scheduled challenges between teams
 */
export const checkExistingChallenges = async (
  challengerTeamId: string,
  defendingTeamId: string,
): Promise<IChallenge | null> => {
  return Challenge.findOne({
    challengerTeamId,
    defendingTeamId,
    status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.SCHEDULED] },
  });
};

/**
 * Validate the tier difference requirement (challenger must be exactly one tier below defender)
 */
export const validateTierDifference = (
  challengerTeamTournament: ITeamTournament,
  defendingTeamTournament: ITeamTournament,
): boolean => {
  if (challengerTeamTournament.tier !== defendingTeamTournament.tier + 1) {
    logger.error(
      `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerTeamTournament.tier}, Defending: ${defendingTeamTournament.tier}`,
    );
    return false;
  }
  return true;
};

/**
 * Validate that the defending team is not in a protection period
 */
export const validateProtectionPeriod = (defendingTeamTournament: ITeamTournament): boolean => {
  if (
    defendingTeamTournament.protectedUntil &&
    defendingTeamTournament.protectedUntil > new Date()
  ) {
    logger.error(
      `Cannot challenge: Defending team is protected until ${defendingTeamTournament.protectedUntil}`,
    );
    return false;
  }
  return true;
};

/**
 * Validate that the challenger has not exceeded the monthly challenge limit
 */
export const validateChallengeLimit = async (
  challengerTeamId: string,
  tournament: ITournament,
): Promise<boolean> => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyCount = await Challenge.countDocuments({
    challengerTeamId,
    createdAt: { $gte: startOfMonth },
  });

  if (monthlyCount >= tournament.rules.maxChallengesPerMonth) {
    logger.error(`Team ${challengerTeamId} has already reached the monthly challenge limit`);
    return false;
  }
  return true;
};

/**
 * Create a new challenge record in the database
 */
export const createChallengeRecord = async (
  tournamentId: string,
  challengerTeamId: string,
  defendingTeamId: string,
  challengerTier: number,
  defendingTier: number,
  challengerTeamTournament: Schema.Types.ObjectId,
  defendingTeamTournament: Schema.Types.ObjectId,
): Promise<IChallenge> => {
  const challenge = new Challenge({
    challengeId: uuidv4(),
    tournamentId,
    challengerTeamId,
    defendingTeamId,
    challengerTeamTournament,
    defendingTeamTournament,
    status: ChallengeStatus.PENDING,
    tierBefore: {
      challenger: challengerTier,
      defending: defendingTier,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await challenge.save();
  logger.info(
    `Created challenge ${challenge.challengeId} between ${challengerTeamId} and ${defendingTeamId}`,
  );

  return challenge;
};

/**
 * Calculate the outcome of a challenge (tiers, prestige, win streaks)
 */
export const calculateChallengeOutcome = (
  challenge: IChallenge,
  winnerTeamId: string,
  challengerTeamTournament: ITeamTournament,
  defendingTeamTournament: ITeamTournament,
  tournament: ITournament,
): {
  tierAfter: { challenger: number; defending: number };
  challengerStats: ChallengeStats;
  defenderStats: ChallengeStats;
} => {
  let challengerPrestige = 0;
  let defendingPrestige = 0;

  const tierAfter = {
    challenger: challengerTeamTournament.tier,
    defending: defendingTeamTournament.tier,
  };

  const isChallengerWinner = winnerTeamId === challenge.challengerTeamTournament.toString();

  const protectionDays = tournament.rules.protectionDaysAfterDefense;
  let protectedUntil = undefined;

  if (!isChallengerWinner) {
    defendingPrestige = 50 + defendingTeamTournament.winStreak * 10;
    challengerPrestige = 25;

    protectedUntil = new Date();
    protectedUntil.setDate(protectedUntil.getDate() + protectionDays);
  } else {
    challengerPrestige = 100 + challengerTeamTournament.winStreak * 10;
    defendingPrestige = 10;
    tierAfter.challenger = defendingTeamTournament.tier;
    tierAfter.defending = challengerTeamTournament.tier;
  }

  const challengerStats: ChallengeStats = {
    tier: isChallengerWinner ? defendingTeamTournament.tier : undefined,
    prestige: challengerPrestige,
    winStreak: isChallengerWinner ? challengerTeamTournament.winStreak + 1 : 0,
    wins: isChallengerWinner ? 1 : 0,
    losses: isChallengerWinner ? 0 : 1,
  };

  const defenderStats: ChallengeStats = {
    tier: !isChallengerWinner ? undefined : challengerTeamTournament.tier,
    prestige: defendingPrestige,
    winStreak: !isChallengerWinner ? defendingTeamTournament.winStreak + 1 : 0,
    protectedUntil: protectedUntil,
    wins: !isChallengerWinner ? 1 : 0,
    losses: !isChallengerWinner ? 0 : 1,
  };

  return { tierAfter, challengerStats, defenderStats };
};

/**
 * Helper method to update team stats after a challenge
 *
 * @param teamId - ID of the team to update
 * @param stats - Object containing stats to update (tier, prestige, etc.)
 */
export const updateTeamAfterChallenge = async (
  teamId: string,
  stats: ChallengeStats,
): Promise<void> => {
  try {
    await teamService.updateTeamStats(teamId, stats);
  } catch (error) {
    logger.error(`Error updating team ${teamId} after challenge:`, error);
    throw error;
  }
};

/**
 * Validate both teams exist and belong to the tournament
 *
 * @param challengerTeamId - ID of the challenger team
 * @param defendingTeamId - ID of the defending team
 * @param tournamentId - ID of the tournament
 * @returns Object containing team and tournament data or null if validation fails
 */
export const validateTeams = async (
  challengerTeamId: string,
  defendingTeamId: string,
  tournamentId: string,
): Promise<(TeamPair & TeamTournamentPair) | null> => {
  try {
    const [challengerTeam, defendingTeam] = await Promise.all([
      teamService.getTeamByTeamId(challengerTeamId),
      teamService.getTeamByTeamId(defendingTeamId),
    ]);
    console.log(`LOG || defendingTeam ->`, defendingTeam)
    console.log(`LOG || challengerTeam ->`, challengerTeam)
    
    if (!challengerTeam || !defendingTeam) {
      logger.error(
        `One of the teams doesn't exist: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
      );
      return null;
    }

    const mongoTournament = await Tournament.findOne({ tournamentId });

    if (!mongoTournament) {
      logger.error(`Tournament ${tournamentId} not found`);
      return null;
    }
    
    const challengerTeamTournament = getTeamTournament(
      mongoTournament._id,
      challengerTeam.tournaments || [],
    );
    const defendingTeamTournament = getTeamTournament(
      mongoTournament._id,
      defendingTeam.tournaments || [],
    );

    if (!challengerTeamTournament || !defendingTeamTournament) {
      logger.error(
        `One of the teams is not part of tournament ${tournamentId}: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
      );
      return null;
    }

    return {
      challenger: challengerTeam,
      defending: defendingTeam,
      challengerTeamTournament,
      defendingTeamTournament,
    };
  } catch (error) {
    logger.error('Error validating teams:', error);
    throw error;
  }
};

/**
 * Validate tournament exists
 *
 * @param tournamentId - ID of the tournament to validate
 * @returns Tournament object or null if not found
 */
export const validateTournament = async (tournamentId: string): Promise<ITournament | null> => {
  try {
    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      logger.error(`Tournament ${tournamentId} not found`);
      return null;
    }
    return tournament;
  } catch (error) {
    logger.error(`Error validating tournament ${tournamentId}:`, error);
    throw error;
  }
};
