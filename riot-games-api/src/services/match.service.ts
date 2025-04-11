import { BaseService } from './base.service';
import { RegionalRoute } from '../types/riot-api.types';

/**
 * Service for League of Legends Match API interactions
 */
export class MatchService extends BaseService {
  private static instance: MatchService;
  
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MatchService {
    if (!MatchService.instance) {
      MatchService.instance = new MatchService();
    }
    return MatchService.instance;
  }
  
  /**
   * Get match history for a player
   */
  async getMatchHistory(
    puuid: string,
    region: RegionalRoute = RegionalRoute.EUROPE,
    start: number = 0,
    count: number = 20
  ): Promise<any> {
    const client = this.getRegionalClient(region);
    const url = `/lol/match/v5/matches/by-puuid/${puuid}/ids`;
    return this.makeRequest(client, url, { params: { start, count } });
  }
  
  /**
   * Get match details
   */
  async getMatchDetails(
    matchId: string,
    region: RegionalRoute = RegionalRoute.EUROPE
  ): Promise<any> {
    const client = this.getRegionalClient(region);
    const url = `/lol/match/v5/matches/${matchId}`;
    return this.makeRequest(client, url);
  }
  
  /**
   * Get match timeline
   */
  async getMatchTimeline(
    matchId: string,
    region: RegionalRoute = RegionalRoute.EUROPE
  ): Promise<any> {
    const client = this.getRegionalClient(region);
    const url = `/lol/match/v5/matches/${matchId}/timeline`;
    return this.makeRequest(client, url);
  }
}

// Export the singleton instance
export default MatchService.getInstance();