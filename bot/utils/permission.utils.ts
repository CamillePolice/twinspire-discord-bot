import { TeamService } from '../services/tournament/team.services';

/**
 * Checks if a user is the captain of a team
 * 
 * @param discordId - The Discord ID of the user
 * @param teamId - The ID of the team
 * @returns A boolean indicating if the user is the captain
 */
export const isTeamCaptain = async (discordId: string, teamId: string): Promise<boolean> => {
  try {
    const teamService = new TeamService();
    const team = await teamService.getTeamByTeamId(teamId);
    if (!team) {
      return false;
    }
    
    return team.captainId === discordId;
  } catch (error) {
    console.error('Error checking if user is team captain:', error);
    return false;
  }
}; 