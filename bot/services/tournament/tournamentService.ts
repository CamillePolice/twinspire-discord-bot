import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';
import { Tournament, Team, Challenge, TeamMember } from '../../database/models/tournament';

declare module 'uuid';
/**
 * Service for managing tournament-related operations
 */
export class TournamentService {
  private tournamentsCollection;
  private teamsCollection;
  private challengesCollection;

  constructor() {
    const db = getDatabase();
    this.tournamentsCollection = db.collection<Tournament>('tournaments');
    this.teamsCollection = db.collection<Team>('teams');
    this.challengesCollection = db.collection<Challenge>('challenges');
  }

  /**
   * Create a new tournament
   */
  async createTournament(
    tournamentData: Omit<Tournament, '_id' | 'tournamentId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Tournament> {
    try {
      const tournament: Tournament = {
        ...tournamentData,
        tournamentId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.tournamentsCollection.insertOne(tournament);
      logger.info(`Created new tournament: ${tournament.name} (${tournament.tournamentId})`);

      return { ...tournament, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating tournament:', error as Error);
      throw error;
    }
  }

  /**
   * Get tournament by ID
   */
  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    try {
      return await this.tournamentsCollection.findOne({ tournamentId });
    } catch (error) {
      logger.error(`Error fetching tournament ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get all active tournaments
   */
  async getActiveTournaments(): Promise<Tournament[]> {
    try {
      return await this.tournamentsCollection
        .find({
          status: { $in: ['upcoming', 'active'] },
        })
        .toArray();
    } catch (error) {
      logger.error('Error fetching active tournaments:', error as Error);
      throw error;
    }
  }

  /**
   * Update tournament details
   */
  async updateTournament(tournamentId: string, updateData: Partial<Tournament>): Promise<boolean> {
    try {
      const result = await this.tournamentsCollection.updateOne(
        { tournamentId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Updated tournament ${tournamentId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating tournament ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(
    teamData: Omit<
      Team,
      | '_id'
      | 'teamId'
      | 'tier'
      | 'prestige'
      | 'wins'
      | 'losses'
      | 'winStreak'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): Promise<Team> {
    try {
      const team: Team = {
        ...teamData,
        teamId: uuidv4(),
        tier: 5, // All teams start at the lowest tier (5)
        prestige: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.teamsCollection.insertOne(team);
      logger.info(`Created new team: ${team.name} (${team.teamId}) with captain ${team.captainId}`);

      return { ...team, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating team:', error as Error);
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      return await this.teamsCollection.findOne({ teamId });
    } catch (error) {
      logger.error(`Error fetching team ${teamId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get teams by tier
   */
  async getTeamsByTier(tier: number): Promise<Team[]> {
    try {
      return await this.teamsCollection.find({ tier }).toArray();
    } catch (error) {
      logger.error(`Error fetching teams for tier ${tier}:`, error as Error);
      throw error;
    }
  }

  /**
   * Add a member to a team
   */
  async addTeamMember(teamId: string, member: TeamMember): Promise<boolean> {
    try {
      const result = await this.teamsCollection.updateOne(
        { teamId },
        {
          $push: { members: member },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(`Added member ${member.username} (${member.discordId}) to team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error adding member to team ${teamId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: string, discordId: string): Promise<boolean> {
    try {
      const result = await this.teamsCollection.updateOne(
        { teamId },
        {
          $pull: { members: { discordId } },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(`Removed member ${discordId} from team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error removing member from team ${teamId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Create a new challenge
   */
  async createChallenge(
    challengerTeamId: string,
    defendingTeamId: string,
    tournamentId: string,
  ): Promise<Challenge | null> {
    try {
      // Get both teams
      const challengerTeam = await this.getTeamById(challengerTeamId);
      const defendingTeam = await this.getTeamById(defendingTeamId);

      if (!challengerTeam || !defendingTeam) {
        logger.error(
          `One of the teams doesn't exist: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
        );
        return null;
      }

      // Verify tiers are adjacent
      if (challengerTeam.tier !== defendingTeam.tier + 1) {
        logger.error(
          `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerTeam.tier}, Defending: ${defendingTeam.tier}`,
        );
        return null;
      }

      // Check if defending team is protected
      if (defendingTeam.protectedUntil && defendingTeam.protectedUntil > new Date()) {
        logger.error(
          `Cannot challenge: Defending team is protected until ${defendingTeam.protectedUntil}`,
        );
        return null;
      }

      // Check for existing challenges between these teams
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

      // Count monthly challenges
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await this.challengesCollection.countDocuments({
        challengerTeamId,
        createdAt: { $gte: startOfMonth },
      });

      // Get tournament rules
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return null;
      }

      if (monthlyCount >= tournament.rules.maxChallengesPerMonth) {
        logger.error(`Team ${challengerTeamId} has already reached the monthly challenge limit`);
        return null;
      }

      // Create challenge
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

  /**
   * Get challenge by ID
   */
  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      return await this.challengesCollection.findOne({ challengeId });
    } catch (error) {
      logger.error(`Error fetching challenge ${challengeId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get pending challenges for a team
   */
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

  /**
   * Propose dates for a challenge (by defending team)
   */
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

  /**
   * Schedule a challenge
   */
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

  /**
   * Submit result for a challenge
   */
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
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      const challengerTeam = await this.getTeamById(challenge.challengerTeamId);
      const defendingTeam = await this.getTeamById(challenge.defendingTeamId);

      if (!challengerTeam || !defendingTeam) {
        logger.error(`One of the teams doesn't exist`);
        return false;
      }

      // Determine prestige points based on outcome
      let challengerPrestige = 0;
      let defendingPrestige = 0;

      // Swap tiers if challenger won
      const tierAfter = {
        challenger: challengerTeam.tier,
        defending: defendingTeam.tier,
      };

      // Determine prestige points and update tiers
      if (winnerTeamId === challenge.challengerTeamId) {
        // Challenger wins and moves up
        challengerPrestige = 100 + challengerTeam.winStreak * 10;
        defendingPrestige = 10; // Consolation points for playing

        // Swap tiers
        tierAfter.challenger = defendingTeam.tier;
        tierAfter.defending = challengerTeam.tier;
      } else {
        // Defender successfully defends
        defendingPrestige = 50 + defendingTeam.winStreak * 10;
        challengerPrestige = 25; // Points for attempting a challenge
      }

      // Update the challenge with the result
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

      // Update the challenger team
      let challengerWinStreak = challengerTeam.winStreak;
      let challengerTier = challengerTeam.tier;

      if (winnerTeamId === challenge.challengerTeamId) {
        // Challenger won
        challengerWinStreak++;
        challengerTier = defendingTeam.tier; // Move up to defender's tier

        await this.teamsCollection.updateOne(
          { teamId: challenge.challengerTeamId },
          {
            $set: {
              tier: challengerTier,
              winStreak: challengerWinStreak,
              updatedAt: new Date(),
            },
            $inc: {
              prestige: challengerPrestige,
              wins: 1,
            },
          },
        );
      } else {
        // Challenger lost
        await this.teamsCollection.updateOne(
          { teamId: challenge.challengerTeamId },
          {
            $set: {
              winStreak: 0,
              updatedAt: new Date(),
            },
            $inc: {
              prestige: challengerPrestige,
              losses: 1,
            },
          },
        );
      }

      // Update the defending team
      let defendingWinStreak = defendingTeam.winStreak;
      let defendingTier = defendingTeam.tier;
      let protectedUntil = undefined;

      if (winnerTeamId === challenge.defendingTeamId) {
        // Defender won
        defendingWinStreak++;

        // Set protection period
        const protectionDays = tournament.rules.protectionDaysAfterDefense;
        protectedUntil = new Date();
        protectedUntil.setDate(protectedUntil.getDate() + protectionDays);

        await this.teamsCollection.updateOne(
          { teamId: challenge.defendingTeamId },
          {
            $set: {
              winStreak: defendingWinStreak,
              protectedUntil,
              updatedAt: new Date(),
            },
            $inc: {
              prestige: defendingPrestige,
              wins: 1,
            },
          },
        );
      } else {
        // Defender lost
        defendingTier = challengerTeam.tier; // Move down to challenger's tier

        await this.teamsCollection.updateOne(
          { teamId: challenge.defendingTeamId },
          {
            $set: {
              tier: defendingTier,
              winStreak: 0,
              updatedAt: new Date(),
            },
            $inc: {
              prestige: defendingPrestige,
              losses: 1,
            },
          },
        );
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

  /**
   * Get tournament standings (teams sorted by tier and prestige)
   */
  async getTournamentStandings(): Promise<Team[]> {
    try {
      return await this.teamsCollection.find().sort({ tier: 1, prestige: -1 }).toArray();
    } catch (error) {
      logger.error('Error fetching tournament standings:', error as Error);
      throw error;
    }
  }

  /**
   * Get pending challenges that are past the response deadline
   */
  async getPastDueDefenderResponses(tournamentId: string): Promise<Challenge[]> {
    try {
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return [];
      }

      // Calculate the deadline based on tournament rules
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

  /**
   * Forfeit a challenge (auto-forfeit or admin decision)
   */
  async forfeitChallenge(challengeId: string, forfeiterTeamId: string): Promise<boolean> {
    try {
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        logger.error(`Challenge ${challengeId} not found`);
        return false;
      }

      // Determine winner based on who forfeited
      const winnerTeamId =
        forfeiterTeamId === challenge.challengerTeamId
          ? challenge.defendingTeamId
          : challenge.challengerTeamId;

      // Create a simple result
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

  /**
   * Update a team member's role
   */
  async updateTeamMemberRole(teamId: string, discordId: string, role: string): Promise<boolean> {
    try {
      const result = await this.teamsCollection.updateOne(
        { teamId, 'members.discordId': discordId },
        {
          $set: {
            'members.$.role': role,
            updatedAt: new Date(),
          },
        },
      );

      logger.error(`Updated role for member ${discordId} in team ${teamId} to ${role}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating member role in team ${teamId}:`, error as Error);
      throw error;
    }
  }
}
