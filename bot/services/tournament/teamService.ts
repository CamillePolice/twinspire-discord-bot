import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';
import { Team, TeamMember } from '../../database/models/tournament';

export class TeamService {
  private teamsCollection;

  constructor() {
    const db = getDatabase();
    this.teamsCollection = db.collection<Team>('teams');
  }

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
        tier: 5,
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

  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      return await this.teamsCollection.findOne({ teamId });
    } catch (error) {
      logger.error(`Error fetching team ${teamId}:`, error as Error);
      throw error;
    }
  }

  async getTeamsByTier(tier: number): Promise<Team[]> {
    try {
      return await this.teamsCollection.find({ tier }).toArray();
    } catch (error) {
      logger.error(`Error fetching teams for tier ${tier}:`, error as Error);
      throw error;
    }
  }

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

      logger.info(`Updated role for member ${discordId} in team ${teamId} to ${role}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating member role in team ${teamId}:`, error as Error);
      throw error;
    }
  }

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
      const result = await this.teamsCollection.updateOne(
        { teamId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
      );

      logger.info(`Updated stats for team ${teamId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Error updating team stats for ${teamId}:`, error as Error);
      throw error;
    }
  }

  async getTournamentStandings(): Promise<Team[]> {
    try {
      return await this.teamsCollection.find().sort({ tier: 1, prestige: -1 }).toArray();
    } catch (error) {
      logger.error('Error fetching tournament standings:', error as Error);
      throw error;
    }
  }
} 