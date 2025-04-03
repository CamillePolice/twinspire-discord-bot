import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';
import { Challenge } from '../../database/models/tournament';
import { TeamService } from './teamService';
import { TournamentService } from './tournamentService';

export class ChallengeService {
  private challengesCollection;
  private teamService: TeamService;
  private tournamentService: TournamentService;

  constructor() {
    const db = getDatabase();
    this.challengesCollection = db.collection<Challenge>('challenges');
    this.teamService = new TeamService();
    this.tournamentService = new TournamentService();
  }

  async createChallenge(
    challengerTeamId: string,
    defendingTeamId: string,
    tournamentId: string,
  ): Promise<Challenge | null> {
    try {
      const challengerTeam = await this.teamService.getTeamById(challengerTeamId);
      const defendingTeam = await this.teamService.getTeamById(defendingTeamId);

      if (!challengerTeam || !defendingTeam) {
        logger.error(
          `One of the teams doesn't exist: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
        );
        return null;
      }

      if (challengerTeam.tier !== defendingTeam.tier + 1) {
        logger.error(
          `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerTeam.tier}, Defending: ${defendingTeam.tier}`,
        );
        return null;
      }

      if (defendingTeam.protectedUntil && defendingTeam.protectedUntil > new Date()) {
        logger.error(
          `Cannot challenge: Defending team is protected until ${defendingTeam.protectedUntil}`,
        );
        return null;
      }

      const existingChallenge = await this.challengesCollection.findOne({
        challengerTeamId,
        defendingTeamId,
        status: { $in: ['pending', 'scheduled'] },
      });

      if (existingChallenge) {
        logger.error(
          `Challenge already exists between these teams (${existingChallenge.challengeId})`,
        );
        return null;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await this.challengesCollection.countDocuments({
        challengerTeamId,
        createdAt: { $gte: startOfMonth },
      });

      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return null;
      }

      if (monthlyCount >= tournament.rules.maxChallengesPerMonth) {
        logger.error(`Team ${challengerTeamId} has already reached the monthly challenge limit`);
        return null;
      }

      const challenge: Challenge = {
        challengeId: uuidv4(),
        tournamentId,
        challengerTeamId,
        defendingTeamId,
        status: 'pending',
        tierBefore: {
          challenger: challengerTeam.tier,
          defending: defendingTeam.tier,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.challengesCollection.insertOne(challenge);
      logger.info(
        `Created challenge ${challenge.challengeId} between ${challengerTeamId} and ${defendingTeamId}`,
      );

      return { ...challenge, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating challenge:', error as Error);
      throw error;
    }
  }

  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      return await this.challengesCollection.findOne({ challengeId });
    } catch (error) {
      logger.error(`Error fetching challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }

  async getPendingChallengesForTeam(teamId: string): Promise<Challenge[]> {
    try {
      return await this.challengesCollection
        .find({
          $or: [{ challengerTeamId: teamId }, { defendingTeamId: teamId }],
          status: { $in: ['pending', 'scheduled'] },
        })
        .toArray();
    } catch (error) {
      logger.error(`Error fetching pending challenges for team ${teamId}:`, error as Error);
      throw error;
    }
  }

  async proposeDates(challengeId: string, dates: Date[]): Promise<boolean> {
    try {
      const result = await this.challengesCollection.updateOne(
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
      logger.error(`Error proposing dates for challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }

  async scheduleChallenge(challengeId: string, scheduledDate: Date): Promise<boolean> {
    try {
      const result = await this.challengesCollection.updateOne(
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
      logger.error(`Error scheduling challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }

  async submitChallengeResult(
    challengeId: string,
    winnerTeamId: string,
    score: string,
    games: { winner: string; loser: string; duration?: number }[],
  ): Promise<boolean> {
    try {
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      const tournamentId = challenge.tournamentId;
      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      const challengerTeam = await this.teamService.getTeamById(challenge.challengerTeamId);
      const defendingTeam = await this.teamService.getTeamById(challenge.defendingTeamId);

      if (!challengerTeam || !defendingTeam) {
        logger.error(`One of the teams doesn't exist`);
        return false;
      }

      let challengerPrestige = 0;
      let defendingPrestige = 0;

      const tierAfter = {
        challenger: challengerTeam.tier,
        defending: defendingTeam.tier,
      };

      if (winnerTeamId === challenge.challengerTeamId) {
        challengerPrestige = 100 + challengerTeam.winStreak * 10;
        defendingPrestige = 10;
        tierAfter.challenger = defendingTeam.tier;
        tierAfter.defending = challengerTeam.tier;
      } else {
        defendingPrestige = 50 + defendingTeam.winStreak * 10;
        challengerPrestige = 25;
      }

      const resultUpdate = await this.challengesCollection.updateOne(
        { challengeId },
        {
          $set: {
            status: 'completed',
            result: {
              winner: winnerTeamId,
              score,
              games,
            },
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

      let challengerWinStreak = challengerTeam.winStreak;
      let challengerTier = challengerTeam.tier;

      if (winnerTeamId === challenge.challengerTeamId) {
        challengerWinStreak++;
        challengerTier = defendingTeam.tier;

        await this.teamService.updateTeamStats(challenge.challengerTeamId, {
          tier: challengerTier,
          winStreak: challengerWinStreak,
          prestige: challengerPrestige,
          wins: 1,
        });
      } else {
        await this.teamService.updateTeamStats(challenge.challengerTeamId, {
          winStreak: 0,
          prestige: challengerPrestige,
          losses: 1,
        });
      }

      let defendingWinStreak = defendingTeam.winStreak;
      let defendingTier = defendingTeam.tier;
      let protectedUntil = undefined;

      if (winnerTeamId === challenge.defendingTeamId) {
        defendingWinStreak++;

        const protectionDays = tournament.rules.protectionDaysAfterDefense;
        protectedUntil = new Date();
        protectedUntil.setDate(protectedUntil.getDate() + protectionDays);

        await this.teamService.updateTeamStats(challenge.defendingTeamId, {
          winStreak: defendingWinStreak,
          protectedUntil,
          prestige: defendingPrestige,
          wins: 1,
        });
      } else {
        defendingTier = challengerTeam.tier;

        await this.teamService.updateTeamStats(challenge.defendingTeamId, {
          tier: defendingTier,
          winStreak: 0,
          prestige: defendingPrestige,
          losses: 1,
        });
      }

      logger.info(
        `Processed result for challenge ${challengeId}: ${winnerTeamId} won with score ${score}`,
      );
      return true;
    } catch (error) {
      logger.error(`Error submitting result for challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }

  async getPastDueDefenderResponses(tournamentId: string): Promise<Challenge[]> {
    try {
      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return [];
      }

      const deadline = new Date();
      deadline.setDate(deadline.getDate() - tournament.rules.challengeTimeframeInDays);

      return await this.challengesCollection
        .find({
          tournamentId,
          status: 'pending',
          proposedDates: { $exists: false },
          createdAt: { $lt: deadline },
        })
        .toArray();
    } catch (error) {
      logger.error(
        `Error fetching past due defender responses for tournament ${tournamentId}:`,
        error as Error,
      );
      throw error;
    }
  }

  async forfeitChallenge(challengeId: string, forfeiterTeamId: string): Promise<boolean> {
    try {
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      const winnerTeamId =
        forfeiterTeamId === challenge.challengerTeamId
          ? challenge.defendingTeamId
          : challenge.challengerTeamId;

      return await this.submitChallengeResult(
        challengeId,
        winnerTeamId,
        forfeiterTeamId === challenge.challengerTeamId ? '0-2' : '2-0',
        [
          {
            winner: winnerTeamId,
            loser: forfeiterTeamId,
          },
          {
            winner: winnerTeamId,
            loser: forfeiterTeamId,
          },
        ],
      );
    } catch (error) {
      logger.error(`Error forfeiting challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }
} 