import { BaseService } from './base.service';
import { PlatformRoute } from '../types/riot-api.types';

/**
 * Service for League of Legends League API interactions
 */
export class LeagueService extends BaseService {
  private static instance: LeagueService;
  
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): LeagueService {
    if (!LeagueService.instance) {
      LeagueService.instance = new LeagueService();
    }
    return LeagueService.instance;
  }
  
  /**
   * Get league entries for a summoner
   */
  async getLeagueEntries(
    summonerId: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/league/v4/entries/by-summoner/${summonerId}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get challenger league for a given queue
   */
  async getChallengerLeague(
    queue: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/league/v4/challengerleagues/by-queue/${queue}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get grandmaster league for a given queue
   */
  async getGrandmasterLeague(
    queue: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/league/v4/grandmasterleagues/by-queue/${queue}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get master league for a given queue
   */
  async getMasterLeague(
    queue: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/league/v4/masterleagues/by-queue/${queue}`;
    return this.makeRequest(client, url);
  }
}

// Export the singleton instance
export default LeagueService.getInstance();