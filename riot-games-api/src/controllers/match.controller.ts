import { Request, Response, NextFunction } from 'express';
import { RegionalRoute } from '../types/riot-api.types';
import { matchService } from '../services';
import { ApiError } from '../utils/error-handler.utils';
import logger from '../utils/logger.utils';

/**
 * Match controller for League of Legends Match endpoints
 */
export class MatchController {
  /**
   * Get match IDs for a player by PUUID
   */
  async getMatchIdsByPuuid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { puuid } = req.params;
      const region = (req.query.region as RegionalRoute) || RegionalRoute.EUROPE;
      const start = req.query.start ? parseInt(req.query.start as string) : 0;
      const count = req.query.count ? parseInt(req.query.count as string) : 20;
      
      // Input validation
      if (!puuid) {
        throw new ApiError(400, 'Missing required parameter: puuid');
      }
      
      // Validate region
      if (!Object.values(RegionalRoute).includes(region as RegionalRoute)) {
        throw new ApiError(400, `Invalid region: ${region}. Valid regions are: ${Object.values(RegionalRoute).join(', ')}`);
      }
      
      // Validate start and count
      if (isNaN(start) || start < 0) {
        throw new ApiError(400, 'Invalid start parameter. Must be a non-negative integer.');
      }
      
      if (isNaN(count) || count < 1 || count > 100) {
        throw new ApiError(400, 'Invalid count parameter. Must be an integer between 1 and 100.');
      }
      
      logger.info(`Getting match history for PUUID: ${puuid} in ${region} (start: ${start}, count: ${count})`);
      
      // Call service to get match IDs
      const matchIds = await matchService.getMatchHistory(puuid, region as RegionalRoute, start, count);
      
      // Return the data
      res.json(matchIds);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get match details by match ID
   */
  async getMatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId } = req.params;
      const region = (req.query.region as RegionalRoute) || RegionalRoute.EUROPE;
      
      // Input validation
      if (!matchId) {
        throw new ApiError(400, 'Missing required parameter: matchId');
      }
      
      // Validate region
      if (!Object.values(RegionalRoute).includes(region as RegionalRoute)) {
        throw new ApiError(400, `Invalid region: ${region}. Valid regions are: ${Object.values(RegionalRoute).join(', ')}`);
      }
      
      logger.info(`Getting match details for match ID: ${matchId} in ${region}`);
      
      // Call service to get match details
      const matchDetails = await matchService.getMatchDetails(matchId, region as RegionalRoute);
      
      // Return the data
      res.json(matchDetails);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get match timeline by match ID
   */
  async getMatchTimelineById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId } = req.params;
      const region = (req.query.region as RegionalRoute) || RegionalRoute.EUROPE;
      
      // Input validation
      if (!matchId) {
        throw new ApiError(400, 'Missing required parameter: matchId');
      }
      
      // Validate region
      if (!Object.values(RegionalRoute).includes(region as RegionalRoute)) {
        throw new ApiError(400, `Invalid region: ${region}. Valid regions are: ${Object.values(RegionalRoute).join(', ')}`);
      }
      
      logger.info(`Getting match timeline for match ID: ${matchId} in ${region}`);
      
      // Call service to get match timeline
      const matchTimeline = await matchService.getMatchTimeline(matchId, region as RegionalRoute);
      
      // Return the data
      res.json(matchTimeline);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new MatchController();