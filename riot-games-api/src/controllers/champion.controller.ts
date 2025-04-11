import { Request, Response, NextFunction } from 'express';
import { PlatformRoute } from '../types/riot-api.types';
import { championService } from '../services';
import { ApiError } from '../utils/error-handler.utils';
import logger from '../utils/logger.utils';

/**
 * Champion controller for League of Legends champion mastery endpoints
 */
export class ChampionController {
  /**
   * Get champion mastery for a summoner
   */
  async getChampionMastery(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      
      logger.info(`Getting champion mastery for summoner ID: ${summonerId} in ${platform}`);
      
      // Call service to get champion mastery
      const championMastery = await championService.getChampionMastery(summonerId, platform as PlatformRoute);
      
      // Return the data
      res.json(championMastery);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get champion mastery for a specific champion
   */
  async getChampionMasteryByChampionId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { summonerId, championId } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      
      // Input validation
      if (!summonerId || !championId) {
        throw new ApiError(400, 'Missing required parameters: summonerId and/or championId');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      logger.info(`Getting champion mastery for summoner ID: ${summonerId} and champion ID: ${championId} in ${platform}`);
      
      // Call service to get champion mastery for specific champion
      const championMastery = await championService.getChampionMasteryByChampionId(
        summonerId, 
        parseInt(championId), 
        platform as PlatformRoute
      );
      
      // Return the data
      res.json(championMastery);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get total champion mastery score for a summoner
   */
  async getChampionMasteryScore(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      
      logger.info(`Getting champion mastery score for summoner ID: ${summonerId} in ${platform}`);
      
      // Call service to get champion mastery score
      const masteryScore = await championService.getChampionMasteryScore(summonerId, platform as PlatformRoute);
      
      // Return the data
      res.json({ score: masteryScore });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get top champion masteries for a summoner
   */
  async getTopChampionMasteries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { summonerId } = req.params;
      const platform = (req.query.platform as PlatformRoute) || PlatformRoute.EUW1;
      const count = req.query.count ? parseInt(req.query.count as string) : 3;
      
      // Input validation
      if (!summonerId) {
        throw new ApiError(400, 'Missing required parameter: summonerId');
      }
      
      // Validate platform
      if (!Object.values(PlatformRoute).includes(platform as PlatformRoute)) {
        throw new ApiError(400, `Invalid platform: ${platform}. Valid platforms are: ${Object.values(PlatformRoute).join(', ')}`);
      }
      
      // Validate count
      if (isNaN(count) || count < 1) {
        throw new ApiError(400, 'Invalid count parameter. Must be a positive integer.');
      }
      
      logger.info(`Getting top ${count} champion masteries for summoner ID: ${summonerId} in ${platform}`);
      
      // Call service to get top champion masteries
      const topMasteries = await championService.getTopChampionMasteries(summonerId, count, platform as PlatformRoute);
      
      // Return the data
      res.json(topMasteries);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ChampionController();