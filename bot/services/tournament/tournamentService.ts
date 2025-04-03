import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';
import { Tournament, Team, Challenge, TeamMember, TeamTournament } from '../../database/models/tournament';

declare module 'uuid';
/**
 * Service for managing tournament-related operations
 */
export class TournamentService {
  private tournamentsCollection;
  private teamsCollection;
  private challengesCollection;
  private teamTournamentsCollection;

  constructor() {
    const db = getDatabase();
    this.tournamentsCollection = db.collection<Tournament>('tournaments');
    this.teamsCollection = db.collection<Team>('teams');
    this.challengesCollection = db.collection<Challenge>('challenges');
    this.teamTournamentsCollection = db.collection<TeamTournament>('team_tournaments');
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
    teamData: Omit<Team, '_id' | 'teamId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Team> {
    try {
      const team: Team = {
        ...teamData,
        teamId: uuidv4(),
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
   * Get teams by tier across all tournaments
   */
  async getTeamsByTierInAllTournaments(tier: number): Promise<Team[]> {
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
      // Get both teams' tournament stats
      const challengerStats = await this.getTeamTournamentStats(challengerTeamId, tournamentId);
      const defendingStats = await this.getTeamTournamentStats(defendingTeamId, tournamentId);

      if (!challengerStats || !defendingStats) {
        logger.error(
          `One of the teams doesn't exist in tournament: Challenger: ${challengerTeamId}, Defending: ${defendingTeamId}`,
        );
        return null;
      }

      // Verify tiers are adjacent
      if (challengerStats.tier !== defendingStats.tier + 1) {
        logger.error(
          `Cannot challenge: Tiers are not adjacent. Challenger: ${challengerStats.tier}, Defending: ${defendingStats.tier}`,
        );
        return null;
      }

      // Check if defending team is protected
      if (defendingStats.protectedUntil && defendingStats.protectedUntil > new Date()) {
        logger.error(
          `Cannot challenge: Defending team is protected until ${defendingStats.protectedUntil}`,
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
          challenger: challengerStats.tier,
          defending: defendingStats.tier,
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

      const challengerStats = await this.getTeamTournamentStats(challenge.challengerTeamId, tournamentId);
      const defendingStats = await this.getTeamTournamentStats(challenge.defendingTeamId, tournamentId);

      if (!challengerStats || !defendingStats) {
        logger.error(`One of the teams doesn't exist in tournament`);
        return false;
      }

      // Determine prestige points based on outcome
      let challengerPrestige = 0;
      let defendingPrestige = 0;

      // Swap tiers if challenger won
      const tierAfter = {
        challenger: challengerStats.tier,
        defending: defendingStats.tier,
      };

      // Determine prestige points and update tiers
      if (winnerTeamId === challenge.challengerTeamId) {
        // Challenger wins and moves up
        challengerPrestige = 100 + challengerStats.winStreak * 10;
        defendingPrestige = 10; // Consolation points for playing

        // Swap tiers
        tierAfter.challenger = defendingStats.tier;
        tierAfter.defending = challengerStats.tier;
      } else {
        // Defender successfully defends
        defendingPrestige = 50 + defendingStats.winStreak * 10;
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

      // Update the challenger team's tournament stats
      if (winnerTeamId === challenge.challengerTeamId) {
        // Challenger won
        await this.teamTournamentsCollection.updateOne(
          { teamId: challenge.challengerTeamId, tournamentId },
          {
            $set: {
              tier: defendingStats.tier,
              winStreak: challengerStats.winStreak + 1,
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
        await this.teamTournamentsCollection.updateOne(
          { teamId: challenge.challengerTeamId, tournamentId },
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

      // Update the defending team's tournament stats
      if (winnerTeamId === challenge.defendingTeamId) {
        // Defender won
        const protectionDays = tournament.rules.protectionDaysAfterDefense;
        const protectedUntil = new Date();
        protectedUntil.setDate(protectedUntil.getDate() + protectionDays);

        await this.teamTournamentsCollection.updateOne(
          { teamId: challenge.defendingTeamId, tournamentId },
          {
            $set: {
              winStreak: defendingStats.winStreak + 1,
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
        await this.teamTournamentsCollection.updateOne(
          { teamId: challenge.defendingTeamId, tournamentId },
          {
            $set: {
              tier: challengerStats.tier,
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
   * Get tournament standings
   */
  async getTournamentStandings(tournamentId: string): Promise<TeamTournament[]> {
    try {
      const standings = await this.teamTournamentsCollection
        .find({ tournamentId })
        .sort({ tier: 1, prestige: -1 })
        .toArray();

      return standings;
    } catch (error) {
      logger.error(`Error getting tournament standings for ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get teams by tier in a tournament
   */
  async getTeamsByTier(tournamentId: string, tier: number): Promise<TeamTournament[]> {
    try {
      const teams = await this.teamTournamentsCollection
        .find({ tournamentId, tier })
        .sort({ prestige: -1 })
        .toArray();

      return teams;
    } catch (error) {
      logger.error(`Error getting teams for tier ${tier} in tournament ${tournamentId}:`, error as Error);
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
    console.log(`LOG || updateTeamMemberRole || role ->`, role)
    try {
      const result = await this.teamsCollection.updateOne(
        { teamId, 'members.discordId': discordId },
        {
          $set: {
            'members.$.role': role.toUpperCase(),
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

  /**
   * Transfer captain role to another team member
   */
  async transferCaptainRole(teamId: string, newCaptainId: string): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return false;
      }

      // Verify the new captain is a member of the team
      const isMember = team.members.some(member => member.discordId === newCaptainId);
      if (!isMember) {
        logger.error(`User ${newCaptainId} is not a member of team ${teamId}`);
        return false;
      }

      // Update the captain ID and isCaptain flags
      const result = await this.teamsCollection.updateOne(
        { teamId },
        {
          $set: {
            captainId: newCaptainId,
            updatedAt: new Date(),
            'members.$[elem].isCaptain': true,
          },
          $unset: {
            'members.$[].isCaptain': 1,
          },
        },
        {
          arrayFilters: [{ 'elem.discordId': newCaptainId }],
        },
      );

      logger.info(`Transferred captain role in team ${teamId} to ${newCaptainId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error transferring captain role in team ${teamId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Add a team to a tournament
   */
  async addTeamToTournament(teamId: string, tournamentId: string): Promise<boolean> {
    try {
      // Check if team exists
      const team = await this.getTeamById(teamId);
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return false;
      }

      // Check if tournament exists
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      // Check if team is already in this tournament
      const existingAssociation = await this.teamTournamentsCollection.findOne({
        teamId,
        tournamentId,
      });

      if (existingAssociation) {
        logger.error(`Team ${teamId} is already in tournament ${tournamentId}`);
        return false;
      }

      // Create team-tournament association
      const teamTournament: TeamTournament = {
        teamId,
        tournamentId,
        tier: 5, // Start at lowest tier
        prestige: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.teamTournamentsCollection.insertOne(teamTournament);
      logger.info(`Added team ${teamId} to tournament ${tournamentId}`);
      return result.insertedId !== undefined;
    } catch (error) {
      logger.error(`Error adding team ${teamId} to tournament ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Remove a team from a tournament
   */
  async removeTeamFromTournament(teamId: string, tournamentId: string): Promise<boolean> {
    try {
      // Check if team exists
      const team = await this.getTeamById(teamId);
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return false;
      }

      // Check if tournament exists
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      // Check if team is in this tournament
      const existingAssociation = await this.teamTournamentsCollection.findOne({
        teamId,
        tournamentId,
      });

      if (!existingAssociation) {
        logger.error(`Team ${teamId} is not in tournament ${tournamentId}`);
        return false;
      }

      // Remove team from tournament
      const result = await this.teamTournamentsCollection.deleteOne({
        teamId,
        tournamentId,
      });

      logger.info(`Removed team ${teamId} from tournament ${tournamentId}`);
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`Error removing team ${teamId} from tournament ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get teams in a tournament
   */
  async getTeamsInTournament(tournamentId: string): Promise<Team[]> {
    try {
      const associations = await this.teamTournamentsCollection
        .find({ tournamentId })
        .toArray();

      const teamIds = associations.map(assoc => assoc.teamId);
      return await this.teamsCollection.find({ teamId: { $in: teamIds } }).toArray();
    } catch (error) {
      logger.error(`Error fetching teams in tournament ${tournamentId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get tournaments a team is in
   */
  async getTeamTournaments(teamId: string): Promise<Tournament[]> {
    try {
      const associations = await this.teamTournamentsCollection
        .find({ teamId })
        .toArray();

      const tournamentIds = associations.map(assoc => assoc.tournamentId);
      return await this.tournamentsCollection
        .find({ tournamentId: { $in: tournamentIds } })
        .toArray();
    } catch (error) {
      logger.error(`Error fetching tournaments for team ${teamId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get team's stats in a specific tournament
   */
  async getTeamTournamentStats(teamId: string, tournamentId: string): Promise<TeamTournament | null> {
    try {
      return await this.teamTournamentsCollection.findOne({
        teamId,
        tournamentId,
      });
    } catch (error) {
      logger.error(
        `Error fetching tournament stats for team ${teamId} in tournament ${tournamentId}:`,
        error as Error,
      );
      throw error;
    }
  }
}
