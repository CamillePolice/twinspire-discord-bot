import { BaseService } from './base.service';
import { PlatformRoute } from '../types/riot-api.types';

/**
 * Service for League of Legends Summoner API interactions
 */
export class SummonerService extends BaseService {
  private static instance: SummonerService;
  
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): SummonerService {
    if (!SummonerService.instance) {
      SummonerService.instance = new SummonerService();
    }
    return SummonerService.instance;
  }
  
  /**
   * Get summoner by PUUID
   */
  async getSummonerByPuuid(
    puuid: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.makeRequest(client, url);
  }
  
  /**
   * Get summoner by summoner name
   */
  async getSummonerByName(
    name: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`;
    return this.makeRequest(client, url);
  }
  
  /**
   * Get summoner by account ID
   */
  async getSummonerByAccountId(
    accountId: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/summoner/v4/summoners/by-account/${accountId}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get summoner by summoner ID
   */
  async getSummonerById(
    summonerId: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/summoner/v4/summoners/${summonerId}`;
    return this.makeRequest(client, url);
  }
}

// Export the singleton instance
export default SummonerService.getInstance();