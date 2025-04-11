import { BaseService } from './base.service';
import { PlatformRoute } from '../types/riot-api.types';

/**
 * Service for League of Legends Champion Mastery API interactions
 */
export class ChampionService extends BaseService {
  private static instance: ChampionService;
  
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ChampionService {
    if (!ChampionService.instance) {
      ChampionService.instance = new ChampionService();
    }
    return ChampionService.instance;
  }
  
  /**
   * Get champion mastery for a summoner
   */
  async getChampionMastery(
    summonerId: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get champion mastery for a specific champion
   */
  async getChampionMasteryByChampionId(
    summonerId: string,
    championId: number,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}/by-champion/${championId}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get total champion mastery score for a summoner
   */
  async getChampionMasteryScore(
    summonerId: string,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    const client = this.getPlatformClient(platform);
    const url = `/lol/champion-mastery/v4/scores/by-summoner/${summonerId}`;
    return this.makeRequest(client, url);
  }

  /**
   * Get top champion masteries for a summoner
   */
  async getTopChampionMasteries(
    summonerId: string,
    count: number = 3,
    platform: PlatformRoute = PlatformRoute.EUW1
  ): Promise<any> {
    // First get all masteries
    const masteries = await this.getChampionMastery(summonerId, platform);
    // Then sort and limit
    return masteries
      .sort((a: any, b: any) => b.championPoints - a.championPoints)
      .slice(0, count);
  }
}

// Export the singleton instance
export default ChampionService.getInstance();