import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.utils';
import Tournament, { ITournament } from '../../database/models/Tournament';
import Team, { ITeam, ITeamMember } from '../../database/models/Team';
import Challenge, { IChallenge } from '../../database/models/Challenge';
import TeamTournament, { ITeamTournament } from '../../database/models/TeamTournament';

export class TournamentService {
  constructor() {}

  /**
   * Creates a new tournament
   *
   * @param tournamentData - Tournament creation data (name, rules, etc.)
   * @returns The created tournament object
   */
  async createTournament(
    tournamentData: Omit<ITournament, 'tournamentId' | 'createdAt' | 'updatedAt'>,
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
      logger.error(`Error fetching tournament ${tournamentId}:`, error);
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
      // Find TeamTournament entries for the specified tournament
      const standings = await TeamTournament.find({ tournament: tournamentId })
        .sort({ tier: 1, prestige: -1 })
        // Populate with team details
        .populate('team');

      logger.info(`Fetched standings for tournament ${tournamentId}`);
      return standings;
    } catch (error) {
      logger.error(`Error fetching tournament standings for ${tournamentId}:`, error);
      throw error;
    }
  }
}
