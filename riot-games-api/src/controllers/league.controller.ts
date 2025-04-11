import { Request, Response, NextFunction } from 'express';
import { PlatformRoute } from '../types/riot-api.types';
import { leagueService } from '../services';
import { ApiError } from '../utils/error-handler.utils';
import logger from '../utils/logger.utils';

/**
 * League controller for League of Legends ranked endpoints
 */
export class LeagueController {
  /**
   * Get league entries for a summoner by summoner ID
   */
  async getLeagueBySummonerId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { summonerId } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!summonerId) {
        throw new ApiError(400, 'Missing required parameter: summonerId');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Getting league entries for summoner ID: ${summonerId} in ${platform}`);
      
      // Call service to get league entries
      const leagueEntries = await leagueService.getLeagueEntries(summonerId, platform as PlatformRoute);
      
      // Return the data
      res.json(leagueEntries);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get challenger league for a given queue
   */
  async getChallengerLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queue } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!queue) {
        throw new ApiError(400, 'Missing required parameter: queue');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Getting challenger league for queue: ${queue} in ${platform}`);
      
      // Call service to get challenger league
      const challengerLeague = await leagueService.getChallengerLeague(queue, platform as PlatformRoute);
      
      // Return the data
      res.json(challengerLeague);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get grandmaster league for a given queue
   */
  async getGrandmasterLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queue } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!queue) {
        throw new ApiError(400, 'Missing required parameter: queue');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Getting grandmaster league for queue: ${queue} in ${platform}`);
      
      // Call service to get grandmaster league
      const grandmasterLeague = await leagueService.getGrandmasterLeague(queue, platform as PlatformRoute);
      
      // Return the data
      res.json(grandmasterLeague);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get master league for a given queue
   */
  async getMasterLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { queue } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!queue) {
        throw new ApiError(400, 'Missing required parameter: queue');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Getting master league for queue: ${queue} in ${platform}`);
      
      // Call service to get master league
      const masterLeague = await leagueService.getMasterLeague(queue, platform as PlatformRoute);
      
      // Return the data
      res.json(masterLeague);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new LeagueController();