import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.utils';
import Team, { ITeam, ITeamMember } from '../../database/models/team.model';
import { TeamTournament } from '../../database/models';

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
      logger.info(`Created new team: ${team.name} (${team.teamId}) with captain ${team.captain}`);

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
   * Updates a team's statistics
   * 
   * @param teamId - ID of the team
   * @param updates - Object containing stats to update:
   *   - tier: New tier ranking
   *   - winStreak: Current win streak
   *   - protectedUntil: Protection period end date
   *   - prestige: Prestige points to add
   *   - wins: Wins to add
   *   - losses: Losses to add
   * @returns Boolean indicating success
   */
  async updateTeamStats(
    teamId: string,
    updates: {
      tier?: number;
      winStreak?: number;
      protectedUntil?: Date;
      prestige?: number;
      wins?: number;
      losses?: number;
    },
  ): Promise<boolean> {
    try {
      interface UpdateOperation {
        $set: Record<string, unknown>;
        $inc?: Record<string, number>;
      }

      const updateObj: Record<string, unknown> = { ...updates, updatedAt: new Date() };
      const incFields: Record<string, number> = {};

      if (updates.wins) incFields.wins = updates.wins;
      if (updates.losses) incFields.losses = updates.losses;
      if (updates.prestige) incFields.prestige = updates.prestige;

      const updateOperation: UpdateOperation = { $set: updateObj };
      if (Object.keys(incFields).length > 0) {
        updateOperation.$inc = incFields;
        Object.keys(incFields).forEach(key => {
          delete updateOperation.$set[key];
        });
      }

      const result = await Team.updateOne({ teamId }, updateOperation);

      logger.info(`Updated stats for team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating team stats for ${teamId}:`, error);
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
}