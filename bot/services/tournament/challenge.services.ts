import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.utils';
import Challenge, { IChallenge } from '../../database/models/challenge.model';
import { TeamService } from './team.services';
import { TournamentService } from './tournament.services';
import { getTeamTournament } from '../../helpers/tournament.helpers';
import { ITeam } from '../../database/models/team.model';
import { ITeamTournament } from '../../database/models/team-tournament.model';
import { ChallengeStatus } from '../../database/enums/challenge.enums';

// Define interfaces for better type safety
interface TeamPair {
  challenger: ITeam;
  defending: ITeam;
}

interface TeamTournamentPair {
  challengerTeamTournament: ITeamTournament;
  defendingTeamTournament: ITeamTournament;
}

interface ChallengeResult {
  winner: string;
  score: string;
  games: { winner: string; loser: string; duration?: number }[];
}

export class ChallengeService {
  private teamService: TeamService;
  private tournamentService: TournamentService;

  constructor() {
    this.teamService = new TeamService();
    this.tournamentService = new TournamentService();
  }

  /**
   * Creates a new challenge between two teams in a tournament
   * 
   * @param challengerTeamId - ID of the team initiating the challenge
   * @param defendingTeamId - ID of the team being challenged
   * @param tournamentId - ID of the tournament
   * @returns The created challenge object or null if validation fails
   * 
   * Validation rules:
   * - Teams must exist and belong to the tournament
   * - Challenger's tier must be exactly one tier below the defender's tier
   * - Defending team must not be in a protection period
   * - No existing pending/scheduled challenge between these teams
   * - Challenger must not exceed monthly challenge limit
   */
  async createChallenge(
    challengerTeamId: string,
    defendingTeamId: string,
    tournamentId: string,
  ): Promise<IChallenge | null> {
    try {
      // Validate tournament and teams in parallel for better performance
      const [teamValidation, tournament, existingChallenge] = await Promise.all([
        this.validateTeams(challengerTeamId, defendingTeamId, tournamentId),
        this.validateTournament(tournamentId),
        Challenge.findOne({
          challengerTeamId,
          defendingTeamId,
          status: { $in: ['pending', 'scheduled'] },
        }),
      ]);

      if (!teamValidation || !tournament) return null;

      const { challengerTeamTournament, defendingTeamTournament } = teamValidation;

      // Validate tier difference
      if (challengerTeamTournament.tier !== defendingTeamTournament.tier + 1) {
        logger.error(
          `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerTeamTournament.tier}, Defending: ${defendingTeamTournament.tier}`,
        );
        return null;
      }

      // Check protection period
      if (
        defendingTeamTournament.protectedUntil &&
        defendingTeamTournament.protectedUntil > new Date()
      ) {
        logger.error(
          `Cannot challenge: Defending team is protected until ${defendingTeamTournament.protectedUntil}`,
        );
        return null;
      }

      // Check existing challenge
      if (existingChallenge) {
        logger.error(
          `Challenge already exists between these teams (${existingChallenge.challengeId})`,
        );
        return null;
      }

      // Check monthly challenge limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await Challenge.countDocuments({
        challengerTeamId,
        createdAt: { $gte: startOfMonth },
      });

      if (monthlyCount >= tournament.rules.challengeTimeframeInDays) {
        logger.error(`Team ${challengerTeamId} has already reached the monthly challenge limit`);
        return null;
      }

      // Create and save challenge
      const challenge = new Challenge({
        challengeId: uuidv4(),
        tournamentId,
        challengerTeamId,
        defendingTeamId,
        status: ChallengeStatus.PENDING,
        tierBefore: {
          challenger: challengerTeamTournament.tier,
          defending: defendingTeamTournament.tier,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await challenge.save();
      logger.info(
        `Created challenge ${challenge.challengeId} between ${challengerTeamId} and ${defendingTeamId}`,
      );

      return challenge;
    } catch (error) {
      logger.error('Error creating challenge:', error);
      throw error;
    }
  }

  /**
   * Retrieves a challenge by its ID
   * 
   * @param challengeId - ID of the challenge to retrieve
   * @returns Challenge object or null if not found
   */
  async getChallengeById(challengeId: string): Promise<IChallenge | null> {
    try {
      return await Challenge.findOne({ challengeId });
    } catch (error) {
      logger.error(`Error fetching challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all pending or scheduled challenges for a specific team
   * 
   * @param teamId - ID of the team
   * @returns Array of challenge objects where the team is either challenger or defender
   */
  async getPendingChallengesForTeam(teamId: string): Promise<IChallenge[]> {
    try {
      return await Challenge.find({
        $or: [{ challengerTeamId: teamId }, { defendingTeamId: teamId }],
        status: { $in: ['pending', 'scheduled'] },
      });
    } catch (error) {
      logger.error(`Error fetching pending challenges for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Updates a challenge with proposed dates for the match
   * 
   * @param challengeId - ID of the challenge
   * @param dates - Array of proposed dates
   * @returns Boolean indicating success
   */
  async proposeDates(challengeId: string, dates: Date[]): Promise<boolean> {
    try {
      const result = await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            proposedDates: dates,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Updated proposed dates for challenge ${challengeId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error proposing dates for challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Schedules a challenge for a specific date
   * 
   * @param challengeId - ID of the challenge
   * @param scheduledDate - Date when the challenge will take place
   * @returns Boolean indicating success
   */
  async scheduleChallenge(challengeId: string, scheduledDate: Date): Promise<boolean> {
    try {
      const result = await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            scheduledDate,
            status: 'scheduled',
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Scheduled challenge ${challengeId} for ${scheduledDate}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error scheduling challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Submits and processes the result of a completed challenge
   * 
   * @param challengeId - ID of the challenge
   * @param winnerTeamId - ID of the winning team
   * @param score - String representation of the score (e.g., "2-1")
   * @param games - Array of game results with winner and loser for each game
   * @returns Boolean indicating success
   * 
   * Actions:
   * - Updates challenge status to completed
   * - Records the result and awards prestige
   * - Updates team statistics (prestige, tier, win/loss records)
   * - Applies protection period to defending team if applicable
   */
  async submitChallengeResult(
    challengeId: string,
    winnerTeamId: string,
    score: string,
    games: { winner: string; loser: string; duration?: number }[],
  ): Promise<boolean> {
    try {
      // Create a properly typed result object
      const result: ChallengeResult = {
        winner: winnerTeamId,
        score,
        games,
      };
      // Get challenge data
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      const tournamentId = challenge.tournamentId;

      // Validate tournament and teams
      const [tournament, teamValidation] = await Promise.all([
        this.validateTournament(tournamentId),
        this.validateTeams(challenge.challengerTeamId, challenge.defendingTeamId, tournamentId),
      ]);

      if (!tournament || !teamValidation) return false;

      const { challengerTeamTournament, defendingTeamTournament } = teamValidation;

      // Calculate prestige and new tiers
      let challengerPrestige = 0;
      let defendingPrestige = 0;

      const tierAfter = {
        challenger: challengerTeamTournament.tier,
        defending: defendingTeamTournament.tier,
      };

      const isChallenger = winnerTeamId === challenge.challengerTeamId;

      if (isChallenger) {
        // Challenger wins
        challengerPrestige = 100 + challengerTeamTournament.winStreak * 10;
        defendingPrestige = 10;
        tierAfter.challenger = defendingTeamTournament.tier;
        tierAfter.defending = challengerTeamTournament.tier;
      } else {
        // Defender wins
        defendingPrestige = 50 + defendingTeamTournament.winStreak * 10;
        challengerPrestige = 25;
      }

      // Update challenge with result
      const resultUpdate = await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            status: 'completed',
            result,
            tierAfter,
            prestigeAwarded: {
              challenger: challengerPrestige,
              defending: defendingPrestige,
            },
            updatedAt: new Date(),
          },
        },
      );

      if (resultUpdate.modifiedCount === 0) {
        logger.error(`Failed to update challenge ${challengeId} with result`);
        return false;
      }

      // Update challenger team stats
      await this.updateTeamAfterChallenge(challenge.challengerTeamId, isChallenger, {
        tier: isChallenger ? defendingTeamTournament.tier : undefined,
        prestige: challengerPrestige,
        winStreak: isChallenger ? challengerTeamTournament.winStreak + 1 : 0,
        wins: isChallenger ? 1 : 0,
        losses: isChallenger ? 0 : 1,
      });

      // Update defender team stats
      const protectionDays = tournament.rules.protectionDaysAfterDefense;
      let protectedUntil = undefined;

      if (!isChallenger) {
        protectedUntil = new Date();
        protectedUntil.setDate(protectedUntil.getDate() + protectionDays);
      }

      await this.updateTeamAfterChallenge(challenge.defendingTeamId, !isChallenger, {
        tier: !isChallenger ? undefined : challengerTeamTournament.tier,
        prestige: defendingPrestige,
        winStreak: !isChallenger ? defendingTeamTournament.winStreak + 1 : 0,
        protectedUntil: protectedUntil,
        wins: !isChallenger ? 1 : 0,
        losses: !isChallenger ? 0 : 1,
      });

      logger.info(
        `Processed result for challenge ${challengeId}: ${winnerTeamId} won with score ${score}`,
      );
      return true;
    } catch (error) {
      logger.error(`Error submitting result for challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to update team stats after a challenge
   * 
   * @param teamId - ID of the team to update
   * @param isWinner - Whether the team won the challenge
   * @param stats - Object containing stats to update (tier, prestige, etc.)
   */
  private async updateTeamAfterChallenge(
    teamId: string,
    isWinner: boolean,
    stats: {
      tier?: number;
      prestige: number;
      winStreak: number;
      protectedUntil?: Date;
      wins?: number;
      losses?: number;
    },
  ): Promise<void> {
    try {
      await this.teamService.updateTeamStats(teamId, stats);
    } catch (error) {
      logger.error(`Error updating team ${teamId} after challenge:`, error);
      throw error;
    }
  }

  /**
   * Gets challenges where the defender has not responded within the required timeframe
   * 
   * @param tournamentId - ID of the tournament
   * @returns Array of past due challenges
   */
  async getPastDueDefenderResponses(tournamentId: string): Promise<IChallenge[]> {
    try {
      const tournament = await this.validateTournament(tournamentId);
      if (!tournament) return [];

      const deadline = new Date();
      deadline.setDate(deadline.getDate() - tournament.rules.challengeTimeframeInDays);

      return await Challenge.find({
        tournamentId,
        status: 'pending',
        proposedDates: { $exists: false },
        createdAt: { $lt: deadline },
      });
    } catch (error) {
      logger.error(
        `Error fetching past due defender responses for tournament ${tournamentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Marks a challenge as forfeited by one team
   * 
   * @param challengeId - ID of the challenge
   * @param forfeiterTeamId - ID of the team forfeiting
   * @returns Boolean indicating success
   */
  async forfeitChallenge(challengeId: string, forfeiterTeamId: string): Promise<boolean> {
    try {
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      const isChallenger = forfeiterTeamId === challenge.challengerTeamId;
      const winnerTeamId = isChallenger ? challenge.defendingTeamId : challenge.challengerTeamId;
      const score = isChallenger ? '0-2' : '2-0';

      const defaultGames = [
        { winner: winnerTeamId, loser: forfeiterTeamId },
        { winner: winnerTeamId, loser: forfeiterTeamId },
      ];
      return await this.submitChallengeResult(challengeId, winnerTeamId, score, defaultGames);
    } catch (error) {
      logger.error(`Error forfeiting challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Validate both teams exist and belong to the tournament
   * 
   * @param challengerTeamId - ID of the challenger team
   * @param defendingTeamId - ID of the defending team
   * @param tournamentId - ID of the tournament
   * @returns Object containing team and tournament data or null if validation fails
   */
  private async validateTeams(
    challengerTeamId: string,
    defendingTeamId: string,
    tournamentId: string,
  ): Promise<(TeamPair & TeamTournamentPair) | null> {
    try {
      // Fetch both teams in parallel to improve performance
      const [challengerTeam, defendingTeam] = await Promise.all([
        this.teamService.getTeamByTeamId(challengerTeamId),
        this.teamService.getTeamByTeamId(defendingTeamId),
      ]);

      if (!challengerTeam || !defendingTeam) {
        logger.error(
          `One of the teams doesn't exist: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
        );
        return null;
      }

      const challengerTeamTournament = getTeamTournament(
        tournamentId,
        challengerTeam.tournaments || [],
      );
      const defendingTeamTournament = getTeamTournament(
        tournamentId,
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
  }

  /**
   * Validate tournament exists
   * 
   * @param tournamentId - ID of the tournament to validate
   * @returns Tournament object or null if not found
   */
  private async validateTournament(tournamentId: string): Promise<any | null> {
    try {
      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return null;
      }
      return tournament;
    } catch (error) {
      logger.error(`Error validating tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}