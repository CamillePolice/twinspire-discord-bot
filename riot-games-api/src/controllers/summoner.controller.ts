import { Request, Response, NextFunction } from 'express';
import { PlatformRoute } from '../types/riot-api.types';
import { summonerService } from '../services';
import { ApiError } from '../utils/error-handler.utils';
import logger from '../utils/logger.utils';

/**
 * Summoner controller for League of Legends Summoner endpoints
 */
export class SummonerController {
  /**
   * Get summoner information by summoner name
   */
  async getSummonerByName(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!name) {
        throw new ApiError(400, 'Missing required parameter: name');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Looking up summoner by name: ${name} in ${platform}`);
      
      // Call service to get summoner data
      const summonerData = await summonerService.getSummonerByName(name, platform as PlatformRoute);
      
      // Return the data
      res.json(summonerData);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get summoner information by account ID
   */
  async getSummonerByAccountId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!accountId) {
        throw new ApiError(400, 'Missing required parameter: accountId');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Looking up summoner by account ID: ${accountId} in ${platform}`);
      
      // Call service to get summoner data
      const summonerData = await summonerService.getSummonerByAccountId(accountId, platform as PlatformRoute);
      
      // Return the data
      res.json(summonerData);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get summoner information by PUUID
   */
  async getSummonerByPuuid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { puuid } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!puuid) {
        throw new ApiError(400, 'Missing required parameter: puuid');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Looking up summoner by PUUID: ${puuid} in ${platform}`);
      
      // Call service to get summoner data
      const summonerData = await summonerService.getSummonerByPuuid(puuid, platform as PlatformRoute);
      
      // Return the data
      res.json(summonerData);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get summoner information by summoner ID
   */
  async getSummonerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!id) {
        throw new ApiError(400, 'Missing required parameter: id');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Looking up summoner by ID: ${id} in ${platform}`);
      
      // Call service to get summoner data
      const summonerData = await summonerService.getSummonerById(id, platform as PlatformRoute);
      
      // Return the data
      res.json(summonerData);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new SummonerController();