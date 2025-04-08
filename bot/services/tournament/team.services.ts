import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.utils';
import Team, { ITeam, ITeamMember } from '../../database/models/team.model';
import { Challenge, ITeamTournament, TeamTournament, Tournament } from '../../database/models';
import { ChallengeStatus } from '../../database/enums/challenge.enums';
import { ClientSession } from 'mongoose';

export class TeamService {
  constructor() {}

  /**
   * Creates a new team
   *
   * @param teamData - Team creation data (name, captain, etc.)
   * @returns The created team object
   *
   * Initial values:
   * - tier: 5 (lowest tier)
   * - prestige: 0
   * - wins: 0
   * - losses: 0
   * - winStreak: 0
   */
  async createTeam(
    teamData: Omit<
      ITeam,
      'teamId' | 'tier' | 'prestige' | 'wins' | 'losses' | 'winStreak' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<ITeam> {
    try {
      const team = new Team({
        ...teamData,
        teamId: uuidv4(),
        tier: 5, // starting at the lowest tier
        prestige: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await team.save();
      logger.info(`Created new team: ${team.name} (${team.teamId}) with captain ${team.captainId}`);

      return team;
    } catch (error) {
      logger.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Retrieves a team by its ID
   *
   * @param teamId - ID of the team to retrieve
   * @returns Team object with tournaments populated or null if not found
   */
  async getTeamByTeamId(teamId: string): Promise<ITeam | null> {
    try {
      return Team.findOne({ teamId }).populate('tournaments');
    } catch (error) {
      logger.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a team by its ID
   *
   * @param teamId - ID of the team to retrieve
   * @returns Team object with tournaments populated or null if not found
   */
  async getTeamByTeamName(name: string): Promise<ITeam | null> {
    try {
      return Team.findOne({ name }).populate('tournaments');
    } catch (error) {
      logger.error(`Error fetching team ${name}:`, error);
      throw error;
    }
  }

  /**
   * Gets all teams in a specific tier
   *
   * @param tier - Tier number to filter teams by
   * @returns Array of team objects in the specified tier
   */
  async getTeamsByTier(tier: number): Promise<ITeam[]> {
    try {
      // Find all team tournaments with the specified tier
      const teamTournaments = await TeamTournament.find({ tier });

      // Extract the team IDs from these tournaments
      const teamIds = teamTournaments.map(tournament => tournament.team);

      // Find all teams with these IDs
      const teams = await Team.find({ _id: { $in: teamIds } });

      return teams;
    } catch (error) {
      logger.error(`Error fetching teams for tier ${tier}:`, error);
      throw error;
    }
  }

  /**
   * Adds a new member to a team
   *
   * @param teamId - ID of the team
   * @param member - Member object with username, discordId, and role
   * @returns Boolean indicating success
   */
  async addTeamMember(teamId: string, member: ITeamMember): Promise<boolean> {
    try {
      const result = await Team.updateOne(
        { teamId },
        {
          $push: { members: member },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(`Added member ${member.username} (${member.discordId}) to team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error adding member to team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Removes a member from a team
   *
   * @param teamId - ID of the team
   * @param discordId - Discord ID of the member to remove
   * @returns Boolean indicating success
   */
  async removeTeamMember(teamId: string, discordId: string): Promise<boolean> {
    try {
      const result = await Team.updateOne(
        { teamId },
        {
          $pull: { members: { discordId } },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(`Removed member ${discordId} from team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error removing member from team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the role of a team member
   *
   * @param teamId - ID of the team
   * @param discordId - Discord ID of the member
   * @param role - New role for the member
   * @returns Boolean indicating success
   */
  async updateTeamMemberRole(teamId: string, discordId: string, role: string): Promise<boolean> {
    try {
      const result = await Team.updateOne(
        { teamId, 'members.discordId': discordId },
        {
          $set: {
            'members.$.role': role,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Updated role for member ${discordId} in team ${teamId} to ${role}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating member role in team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Updates team stats after a challenge
   *
   * @param teamTournament - Team tournament object to update
   * @param stats - Stats to update (tier, prestige, etc.)
   * @param session - Optional MongoDB session for transaction support
   * @returns Boolean indicating success
   */
  async updateTeamStats(
    teamTournament: ITeamTournament,
    stats: { tier: number; prestige: number; wins?: number; losses?: number; winStreak?: number },
    session?: ClientSession,
  ): Promise<boolean> {
    try {
      const updateData: any = {
        tier: stats.tier,
        prestige: stats.prestige,
        updatedAt: new Date(),
      };

      // Add optional fields if provided
      if (stats.wins !== undefined) updateData.wins = stats.wins;
      if (stats.losses !== undefined) updateData.losses = stats.losses;
      if (stats.winStreak !== undefined) updateData.winStreak = stats.winStreak;

      // Update the team tournament entry
      const result = await TeamTournament.updateOne(
        { _id: teamTournament._id },
        { $set: updateData },
        session ? { session } : {},
      );

      if (result.modifiedCount === 0) {
        logger.error(`Failed to update stats for team tournament ${teamTournament._id}`);
        return false;
      }

      logger.info(`Updated stats for team tournament ${teamTournament._id}`);
      return true;
    } catch (error) {
      logger.error(`Error updating team stats for ${teamTournament._id}:`, error);
      throw error;
    }
  }

  /**
   * Transfers team captaincy to another team member
   *
   * @param teamId - ID of the team
   * @param newCaptainId - Discord ID of the new captain
   * @returns Boolean indicating success
   *
   * Validation:
   * - Verifies the new captain is already a team member
   */
  async transferCaptainRole(teamId: string, newCaptainId: string): Promise<boolean> {
    try {
      const team = await this.getTeamByTeamId(teamId);
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

      // First remove captain status from all members
      const update1 = await Team.updateOne(
        { teamId },
        {
          $set: {
            'members.$[].isCaptain': false,
            updatedAt: new Date(),
          },
        },
      );

      // Set the new captain and update the captainId
      const update2 = await Team.updateOne(
        { teamId, 'members.discordId': newCaptainId },
        {
          $set: {
            captainId: newCaptainId,
            'members.$.isCaptain': true,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Transferred captain role in team ${teamId} to ${newCaptainId}`);
      return update1.modifiedCount > 0 || update2.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error transferring captain role in team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Adds a team to a tournament
   *
   * @param teamId - ID of the team to add
   * @param tournamentId - ID of the tournament to add the team to
   * @param initialTier - Initial tier to place the team in (defaults to lowest tier)
   * @returns Boolean indicating success
   *
   * Creates a TeamTournament record that links the team and tournament
   * with initial values for tier, prestige, wins, losses, etc.
   */
  async addTeamToTournament(
    teamId: string,
    tournamentId: string,
    initialTier?: number,
  ): Promise<boolean> {
    try {
      // Verify the team exists
      const team = await this.getTeamByTeamId(teamId);
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return false;
      }

      // Verify the tournament exists
      const tournament = await Tournament.findOne({ tournamentId });
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      // Get the MongoDB _id from the team document
      const teamDocument = await Team.findOne({ teamId });
      if (!teamDocument) {
        logger.error(`Team document for ${teamId} not found`);
        return false;
      }

      // Check if the team is already in this tournament
      const existingEntry = await TeamTournament.findOne({
        team: teamDocument._id,
        tournament: tournament._id,
      });

      if (existingEntry) {
        logger.error(`Team ${teamId} is already registered for tournament ${tournamentId}`);
        return false;
      }

      // Determine the initial tier (default to the lowest tier if not specified)
      const tier = initialTier || tournament.maxTiers;

      // Create the team tournament entry
      const teamTournament = new TeamTournament({
        team: teamDocument._id,
        tournament: tournament._id,
        tier: tier,
        prestige: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await teamTournament.save();

      console.log(`LOG || teamTournament ->`, teamTournament);

      // Add this tournament entry to the team's tournaments array
      await Team.updateOne(
        { teamId },
        {
          $addToSet: { tournaments: teamTournament._id },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(
        `Added team ${team.name} (${teamId}) to tournament ${tournament.name} (${tournamentId}) at tier ${tier}`,
      );
      return true;
    } catch (error) {
      logger.error(`Error adding team ${teamId} to tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Removes a team from a tournament
   *
   * @param teamId - ID of the team to remove
   * @param tournamentId - ID of the tournament to remove the team from
   * @returns Boolean indicating success
   */
  async removeTeamFromTournament(teamId: string, tournamentId: string): Promise<boolean> {
    try {
      // Find the team document to get its MongoDB _id
      const team = await Team.findOne({ teamId });
      if (!team) {
        logger.error(`Team ${teamId} not found`);
        return false;
      }

      // Find the tournament document to get its MongoDB _id
      const tournament = await Tournament.findOne({ tournamentId });
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return false;
      }

      // Find the team tournament entry
      const teamTournament = await TeamTournament.findOne({
        team: team._id,
        tournament: tournament._id,
      });

      if (!teamTournament) {
        logger.error(`Team ${teamId} is not part of tournament ${tournamentId}`);
        return false;
      }

      // Check if there are any pending challenges involving this team in this tournament
      const pendingChallenges = await Challenge.find({
        tournamentId,
        $or: [{ challengerTeamId: teamId }, { defendingTeamId: teamId }],
        status: { $in: [ChallengeStatus.PENDING, ChallengeStatus.SCHEDULED] },
      });

      if (pendingChallenges.length > 0) {
        logger.error(
          `Cannot remove team ${teamId} from tournament ${tournamentId} with pending challenges`,
        );
        return false;
      }

      // Remove the team tournament entry
      await TeamTournament.deleteOne({ _id: teamTournament._id });

      // Remove reference to this tournament from the team's tournaments array
      await Team.updateOne(
        { teamId },
        {
          $pull: { tournaments: teamTournament._id },
          $set: { updatedAt: new Date() },
        },
      );

      logger.info(`Removed team ${teamId} from tournament ${tournamentId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing team ${teamId} from tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}
