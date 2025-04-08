import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.utils';
import Tournament, { ITournament } from '../../database/models/tournament.model';
import TeamTournament, { ITeamTournament } from '../../database/models/team-tournament.model';
import { Team } from '../../database/models';

export class TournamentService {
  constructor() {}

  /**
   * Creates a new tournament
   *
   * @param tournamentData - Tournament creation data (name, rules, etc.)
   * @returns The created tournament object
   */
  async createTournament(
    tournamentData: Omit<ITournament, 'tournamentId' | 'createdAt' | 'updatedAt' | '_id'>,
  ): Promise<ITournament> {
    try {
      const tournament = new Tournament({
        ...tournamentData,
        tournamentId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tournament.save();
      logger.info(`Created new tournament: ${tournament.name} (${tournament.tournamentId})`);

      return tournament;
    } catch (error) {
      logger.error('Error creating tournament:', error);
      throw error;
    }
  }

  /**
   * Retrieves a tournament by its ID
   *
   * @param tournamentId - ID of the tournament to retrieve
   * @returns Tournament object or null if not found
   */
  async getTournamentById(tournamentId: string): Promise<ITournament | null> {
    try {
      return await Tournament.findOne({ tournamentId });
    } catch (error) {
      logger.error(`Error fetching tournament by ID ${tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all active or upcoming tournaments
   *
   * @returns Array of active tournament objects
   */
  async getActiveTournaments(): Promise<ITournament[]> {
    try {
      return await Tournament.find({
        status: { $in: ['upcoming', 'active'] },
      });
    } catch (error) {
      logger.error('Error fetching active tournaments:', error);
      throw error;
    }
  }

  /**
   * Updates tournament details
   *
   * @param tournamentId - ID of the tournament
   * @param updateData - Object containing fields to update
   * @returns Boolean indicating success
   */
  async updateTournament(tournamentId: string, updateData: Partial<ITournament>): Promise<boolean> {
    try {
      const result = await Tournament.updateOne(
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
      logger.error(`Error updating tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Gets teams ranked by tier and prestige for a specific tournament
   *
   * @param tournamentId - ID of the tournament to get standings for
   * @returns Array of team tournament entries sorted by tier (ascending) and prestige (descending)
   */
  async getTournamentStandings(tournamentId: string): Promise<ITeamTournament[]> {
    try {
      // Find the tournament document to get its MongoDB _id
      const tournament = await Tournament.findOne({ tournamentId });
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return [];
      }

      // Find all team tournament entries for this tournament, sorted by tier and prestige
      return await TeamTournament.find({ tournament: tournament._id })
        .populate({
          path: 'team',
          select: 'name captainId',
        })
        .sort({ tier: 1, prestige: -1 });
    } catch (error) {
      logger.error(`Error fetching tournament standings for ${tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the tournament stats for a specific team in a specific tournament
   *
   * @param teamId - ID of the team
   * @param tournamentId - ID of the tournament
   * @returns TeamTournament object or null if not found
   */
  async getTeamTournamentStats(
    teamId: string,
    tournamentId: string,
  ): Promise<ITeamTournament | null> {
    try {
      // Find the team document to get its MongoDB _id
      const team = await Team.findOne({ teamId });
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return null;
      }

      // Find the tournament document to get its MongoDB _id
      const tournament = await Tournament.findOne({ tournamentId });
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return null;
      }

      // Find the team tournament entry using the MongoDB _ids
      const teamTournament = await TeamTournament.findOne({
        team: team._id,
        tournament: tournament._id,
      });

      if (!teamTournament) {
        logger.info(`Team ${teamId} is not part of tournament ${tournamentId}`);
        return null;
      }

      return teamTournament;
    } catch (error) {
      logger.error(
        `Error fetching team tournament stats for team ${teamId} in tournament ${tournamentId}:`,
        error,
      );
      throw error;
    }
  }
}
