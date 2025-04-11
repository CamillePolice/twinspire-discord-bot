import { BaseService } from './base.service';
import { RegionalRoute } from '../types/riot-api.types';

/**
 * Service for Riot Account API interactions
 */
export class AccountService extends BaseService {
  private static instance: AccountService;
  
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
  }
  
  /**
   * Get account by Riot ID
   */
  async getAccountByRiotId(
    gameName: string,
    tagLine: string,
    region: RegionalRoute = RegionalRoute.EUROPE
  ): Promise<any> {
    const client = this.getRegionalClient(region);
    const url = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.makeRequest(client, url);
  }
  
  /**
   * Get account by PUUID
   */
  async getAccountByPuuid(
    puuid: string,
    region: RegionalRoute = RegionalRoute.EUROPE
  ): Promise<any> {
    const client = this.getRegionalClient(region);
    const url = `/riot/account/v1/accounts/by-puuid/${puuid}`;
    return this.makeRequest(client, url);
  }
}

// Export the singleton instance
export default AccountService.getInstance();