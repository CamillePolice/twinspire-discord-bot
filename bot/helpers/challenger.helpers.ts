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
import { ClientSession } from 'mongoose';

const teamService = new TeamService();
const tournamentService = new TournamentService();

// PRIVATE HELPER METHODS

/**
 * Check for existing pending/scheduled challenges between teams
 */
export const checkExistingChallenges = async (
  challengerTeamTournament: Schema.Types.ObjectId,
  defendingTeamTournament: Schema.Types.ObjectId,
): Promise<IChallenge | null> => {
  return Challenge.findOne({
    challengerTeamTournament,
    defendingTeamTournament,
    status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.SCHEDULED] },
  });
};

/**
 * Validate the tier difference requirement (challenger must be in the same tier OR exactly one tier below defender)
 */
export const validateTierDifference = (
  challengerTeamTournament: ITeamTournament,
  defendingTeamTournament: ITeamTournament,
): boolean => {
  // Valid cases:
  // 1. Same tier (e.g., tier 3 vs tier 3)
  // 2. Challenger is exactly one tier below (e.g., tier 4 vs tier 3)
  if (
    challengerTeamTournament.tier === defendingTeamTournament.tier ||
    challengerTeamTournament.tier === defendingTeamTournament.tier + 1
  ) {
    return true;
  }

  // If we reach here, the tiers are not valid for a challenge
  logger.error(
    `Cannot challenge: Invalid tier difference. Challenger: ${challengerTeamTournament.tier}, Defending: ${defendingTeamTournament.tier}. Teams must be in the same tier or challenger must be exactly one tier below.`,
  );
  return false;
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
  castDemand: boolean = false,
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
    castDemand,
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
 * Calculate prestige points based on tier difference and winner
 * @param isChallengerWinner - true if challenger won, false if defender won
 * @param challengerTier - the tier of the challenger team
 * @param defenderTier - the tier of the defending team
 */
export const calculatePrestigePoints = (
  isChallengerWinner: boolean,
  challengerTier: number,
  defenderTier: number,
): { challengerPrestige: number; defendingPrestige: number } => {
  let challengerPrestige = 0;
  let defendingPrestige = 0;

  // Calculate tier differences from each team's perspective
  const challengerTierDiff = defenderTier - challengerTier; // negative means challenger is higher tier
  const defenderTierDiff = challengerTier - defenderTier;   // negative means defender is higher tier

  if (isChallengerWinner) {
    // Challenger won
    if (challengerTierDiff > 0) {
      // Won against higher tier
      challengerPrestige = 10;
      defendingPrestige = 3;
    } else if (challengerTierDiff === 0) {
      // Won against same tier
      challengerPrestige = 6;
      defendingPrestige = 2;
    } else {
      // Won against lower tier
      challengerPrestige = 4;
      defendingPrestige = 1;
    }
  } else {
    // Defender won
    if (defenderTierDiff > 0) {
      // Defender won against higher tier
      defendingPrestige = 10;
      challengerPrestige = 3;
    } else if (defenderTierDiff === 0) {
      // Won against same tier
      defendingPrestige = 6;
      challengerPrestige = 2;
    } else {
      // Won against lower tier
      defendingPrestige = 4;
      challengerPrestige = 3;
    }
  }

  return { challengerPrestige, defendingPrestige };
};

/**
 * Calculate forfeit penalty if applicable
 */
export const calculateForfeitPenalty = (
  challenge: IChallenge,
  isChallengerWinner: boolean,
  challengerTeamTournament: ITeamTournament,
  challengerPrestige: number,
  defendingPrestige: number,
): { challengerPrestige: number; defendingPrestige: number } => {
  if (!challenge.unfairForfeit) {
    return { challengerPrestige, defendingPrestige };
  }

  // Determine which team forfeited
  const forfeiterTeamId = isChallengerWinner
    ? challenge.defendingTeamTournament.toString()
    : challenge.challengerTeamTournament.toString();

  // Apply custom penalty based on forfeit type
  let penalty = 10; // Default penalty

  if (challenge.forfeitType === 'no_show') {
    penalty = 15;
  } else if (challenge.forfeitType === 'give_up') {
    penalty = 20;
  } else if (challenge.forfeitPenalty) {
    penalty = challenge.forfeitPenalty;
  }

  // Apply penalty to the forfeiting team
  if (forfeiterTeamId === challengerTeamTournament._id.toString()) {
    challengerPrestige -= penalty;
  } else {
    defendingPrestige -= penalty;
  }

  return { challengerPrestige, defendingPrestige };
};

/**
 * Create team stats objects for challenger and defender
 */
export const createTeamStats = (
  isChallengerWinner: boolean,
  challengerTeamTournament: ITeamTournament,
  defendingTeamTournament: ITeamTournament,
  challengerPrestige: number,
  defendingPrestige: number,
  tournament: ITournament,
): { challengerStats: ChallengeStats; defenderStats: ChallengeStats } => {
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
    protectedUntil: !isChallengerWinner
      ? new Date(
          new Date().setDate(new Date().getDate() + tournament.rules.protectionDaysAfterDefense),
        )
      : undefined,
    wins: !isChallengerWinner ? 1 : 0,
    losses: !isChallengerWinner ? 0 : 1,
  };

  return { challengerStats, defenderStats };
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
  const tierAfter = {
    challenger: challengerTeamTournament.tier,
    defending: defendingTeamTournament.tier,
  };

  const isChallengerWinner = winnerTeamId === challenge.challengerTeamTournament.toString();
  const challengerTier = challengerTeamTournament.tier;
  const defenderTier = defendingTeamTournament.tier;

  // Calculate prestige points based on tier difference and winner
  let { challengerPrestige, defendingPrestige } = calculatePrestigePoints(
    isChallengerWinner,
    challengerTier,
    defenderTier,
  );

  // Swap tiers if challenger wins
  if (isChallengerWinner) {
    tierAfter.challenger = defendingTeamTournament.tier;
    tierAfter.defending = challengerTeamTournament.tier;
  }

  // Apply unfair forfeit penalty if applicable
  ({ challengerPrestige, defendingPrestige } = calculateForfeitPenalty(
    challenge,
    isChallengerWinner,
    challengerTeamTournament,
    challengerPrestige,
    defendingPrestige,
  ));

  // Create team stats objects
  const { challengerStats, defenderStats } = createTeamStats(
    isChallengerWinner,
    challengerTeamTournament,
    defendingTeamTournament,
    challengerPrestige,
    defendingPrestige,
    tournament,
  );

  return { tierAfter, challengerStats, defenderStats };
};

/**
 * Helper method to update team stats after a challenge
 *
 * @param team - Team object to update
 * @param stats - Object containing stats to update (tier, prestige, etc.)
 * @param session - Optional MongoDB session for transaction support
 */
export const updateTeamAfterChallenge = async (
  teamTournament: ITeamTournament,
  stats: ChallengeStats,
  session?: ClientSession,
): Promise<void> => {
  try {
    // Create a compatible stats object with required tier
    const compatibleStats = {
      tier: stats.tier !== undefined ? stats.tier : teamTournament.tier,
      prestige: stats.prestige,
      wins: stats.wins,
      losses: stats.losses,
      winStreak: stats.winStreak,
    };

    await teamService.updateTeamStats(teamTournament, compatibleStats, session);
  } catch (error) {
    logger.error(`Error updating team ${teamTournament.team.name} after challenge:`, error);
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
