import logger from '../utils/logger.utils';
import accountService from './account.service';
import summonerService from './summoner.service';
import matchService from './match.service';
import leagueService from './league.service';
import championService from './champion.service';

/**
 * Service for managing the cache across all other services
 */
export class CacheService {
  private static instance: CacheService;
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
  
  /**
   * Clear the cache from all services
   */
  clearAllCaches(): void {
    // Clear each service's cache
    accountService.clearCache();
    summonerService.clearCache();
    matchService.clearCache();
    leagueService.clearCache();
    championService.clearCache();
    
    logger.info('All caches cleared successfully');
  }
}

// Export the singleton instance
export default CacheService.getInstance();