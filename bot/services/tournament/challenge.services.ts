import { logger } from '../../utils/logger.utils';
import Challenge, { IChallenge } from '../../database/models/challenge.model';
import { calculateForfeitResult } from '../../helpers/tournament.helpers';
import { ChallengeStatus } from '../../database/enums/challenge.enums';
import {
  calculateChallengeOutcome,
  checkExistingChallenges,
  createChallengeRecord,
  updateTeamAfterChallenge,
  validateChallengeLimit,
  validateProtectionPeriod,
  validateTierDifference,
} from '../../helpers/challenger.helpers';
import { validateTournament } from '../../helpers/challenger.helpers';
import { validateTeams } from '../../helpers/challenger.helpers';
import { ChallengeResult } from '../../types/challenge-result.types';

/**
 * Service class for managing team challenges within tournaments
 */
export class ChallengeService {
  private lastValidationError: string | null = null;

  constructor() {}

  /**
   * Gets the last validation error that occurred during challenge creation
   */
  getLastValidationError(): string | null {
    return this.lastValidationError;
  }

  /**
   * Creates a new challenge between two teams in a tournament
   *
   * @param challengerTeamId - ID of the team initiating the challenge
   * @param defendingTeamId - ID of the team being challenged
   * @param tournamentId - ID of the tournament
   * @returns The created challenge object or null if validation fails
   */
  async createChallenge(
    challengerTeamId: string,
    defendingTeamId: string,
    tournamentId: string,
  ): Promise<IChallenge | null> {
    try {
      // Reset validation error
      this.lastValidationError = null;

      // Validate tournament and teams in parallel for better performance
      const [teamValidation, tournament] = await Promise.all([
        validateTeams(challengerTeamId, defendingTeamId, tournamentId),
        validateTournament(tournamentId),
      ]);

      if (!teamValidation || !tournament) {
        this.lastValidationError = 'One or both teams are not part of the tournament.';
        return null;
      }

      const { challengerTeamTournament, defendingTeamTournament } = teamValidation;
      
      // Check for existing challenges
      const existingChallenge = await checkExistingChallenges(
        challengerTeamTournament._id,
        defendingTeamTournament._id,
      );
      
      // Run all validations
      if (!validateTierDifference(challengerTeamTournament, defendingTeamTournament)) {
        this.lastValidationError = `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerTeamTournament.tier}, Defending: ${defendingTeamTournament.tier}`;
        return null;
      }
      if (!validateProtectionPeriod(defendingTeamTournament)) {
        this.lastValidationError = `Cannot challenge: Defending team is protected until ${defendingTeamTournament.protectedUntil}`;
        return null;
      }
      if (existingChallenge) {
        this.lastValidationError = `Cannot challenge: An existing challenge (${existingChallenge.challengeId}) is already pending between these teams.`;
        return null;
      }

      if (!(await validateChallengeLimit(challengerTeamId, tournament))) {
        this.lastValidationError = `Cannot challenge: You have reached the monthly challenge limit of ${tournament.rules.maxChallengesPerMonth}.`;
        return null;
      }

      // Create and save challenge
      const challenge = await createChallengeRecord(
        tournamentId,
        challengerTeamId,
        defendingTeamId,
        challengerTeamTournament.tier,
        defendingTeamTournament.tier,
        challengerTeamTournament._id,
        defendingTeamTournament._id,
      );

      console.log("test")
      console.log(`LOG || challenge ->`, challenge)

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
        $or: [{ challengerTeamTournament: teamId }, { defendingTeamTournament: teamId }],
        status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.SCHEDULED] },
      });
    } catch (error) {
      logger.error(`Error fetching pending challesnges for team ${teamId}:`, error);
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
            status: ChallengeStatus.SCHEDULED,
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
   */
  async submitChallengeResult(
    challengeId: string,
    winnerTeamId: string,
    score: string,
    games: { winner: string; loser: string; duration?: number }[],
  ): Promise<boolean> {
    try {
      // Create a properly typed result object
      const result: ChallengeResult = { winner: winnerTeamId, score, games };

      // Get challenge data
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      const tournamentId = challenge.tournamentId;

      // Validate tournament and teams
      const [tournament, teamValidation] = await Promise.all([
        validateTournament(tournamentId),
        validateTeams(
          challenge.challengerTeamTournament.toString(),
          challenge.defendingTeamTournament.toString(),
          tournamentId,
        ),
      ]);

      if (!tournament || !teamValidation) return false;

      const { challengerTeamTournament, defendingTeamTournament } = teamValidation;

      // Process the challenge result
      const { tierAfter, challengerStats, defenderStats } = calculateChallengeOutcome(
        challenge,
        winnerTeamId,
        challengerTeamTournament,
        defendingTeamTournament,
        tournament,
      );

      // Update challenge with result
      const resultUpdate = await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            status: ChallengeStatus.COMPLETED,
            result,
            tierAfter,
            prestigeAwarded: {
              challenger: challengerStats.prestige,
              defending: defenderStats.prestige,
            },
            updatedAt: new Date(),
          },
        },
      );

      if (resultUpdate.modifiedCount === 0) {
        logger.error(`Failed to update challenge ${challengeId} with result`);
        return false;
      }

      // Update team stats
      await Promise.all([
        updateTeamAfterChallenge(challenge.challengerTeamTournament.toString(), challengerStats),
        updateTeamAfterChallenge(challenge.defendingTeamTournament.toString(), defenderStats),
      ]);

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
   * Gets challenges where the defender has not responded within the required timeframe
   *
   * @param tournamentId - ID of the tournament
   * @returns Array of past due challenges
   */
  async getPastDueDefenderResponses(tournamentId: string): Promise<IChallenge[]> {
    try {
      const tournament = await validateTournament(tournamentId);
      if (!tournament) return [];

      const deadline = new Date();
      deadline.setDate(deadline.getDate() - tournament.rules.challengeTimeframeInDays);

      return await Challenge.find({
        tournamentId,
        status: ChallengeStatus.PENDING,
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

      // Get the tournament to determine the format
      const tournament = await validateTournament(challenge.tournamentId);
      if (!tournament) {
        logger.error(`Tournament for challenge ${challengeId} not found`);
        return false;
      }

      const isChallenger = forfeiterTeamId === challenge.challengerTeamTournament.toString();
      const winnerTeamId = isChallenger
        ? challenge.defendingTeamTournament.toString()
        : challenge.challengerTeamTournament.toString();

      // Use the calculateForfeitResult helper function
      const forfeitResult = calculateForfeitResult(tournament, winnerTeamId, forfeiterTeamId);

      return await this.submitChallengeResult(
        challengeId,
        winnerTeamId,
        forfeitResult.score,
        forfeitResult.games,
      );
    } catch (error) {
      logger.error(`Error forfeiting challenge ${challengeId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending challenges for a team tournament
   * @param teamTournamentId - ID of the team tournament
   * @returns Array of pending challenges
   */
  async getPendingChallenges(teamTournamentId: string): Promise<IChallenge[]> {
    try {
      return await Challenge.find({
        $or: [
          { challengerTeamTournament: teamTournamentId },
          { defendingTeamTournament: teamTournamentId },
        ],
        status: { $in: ['pending', 'scheduled'] },
      })
        .populate({
          path: 'challengerTeamTournament',
          populate: {
            path: 'team',
            select: 'name',
          },
        })
        .populate({
          path: 'defendingTeamTournament',
          populate: {
            path: 'team',
            select: 'name',
          },
        });
    } catch (error) {
      logger.error(
        `Error fetching pending challenges for team tournament ${teamTournamentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cancels a challenge without affecting team stats
   *
   * @param challengeId - ID of the challenge to cancel
   * @returns Boolean indicating success
   */
  async cancelChallenge(challengeId: string): Promise<boolean> {
    try {
      const result = await Challenge.updateOne(
        { challengeId },
        {
          $set: {
            status: ChallengeStatus.CANCELLED,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Cancelled challenge ${challengeId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error cancelling challenge ${challengeId}:`, error);
      throw error;
    }
  }
}
