import { Request, Response, NextFunction } from 'express';
import { RegionalRoute } from '../types/riot-api.types';
import { accountService } from '../services';
import { ApiError } from '../utils/error-handler.utils';
import logger from '../utils/logger.utils';

/**
 * Account controller for Riot Account endpoints
 */
export class AccountController {
  /**
   * Get account information by Riot ID and tag line
   */
  async getAccountByRiotId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gameName, tagLine } = req.params;
      const region = (req.query.region as RegionalRoute) || RegionalRoute.EUROPE;
      
      // Input validation
      if (!gameName || !tagLine) {
        throw new ApiError(400, 'Missing required parameters: gameName and tagLine');
      }
      
      // Validate region
      if (!Object.values(RegionalRoute).includes(region as RegionalRoute)) {
        throw new ApiError(400, `Invalid region: ${region}. Valid regions are: ${Object.values(RegionalRoute).join(', ')}`);
      }
      
      logger.info(`Looking up Riot account: ${gameName}#${tagLine} in ${region}`);
      
      // Call service to get account data
      const accountData = await accountService.getAccountByRiotId(gameName, tagLine, region as RegionalRoute);
      
      // Return the data
      res.json(accountData);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get account information by PUUID
   */
  async getAccountByPuuid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { puuid } = req.params;
      const region = (req.query.region as RegionalRoute) || RegionalRoute.EUROPE;
      
      // Input validation
      if (!puuid) {
        throw new ApiError(400, 'Missing required parameter: puuid');
      }
      
      // Validate region
      if (!Object.values(RegionalRoute).includes(region as RegionalRoute)) {
        throw new ApiError(400, `Invalid region: ${region}. Valid regions are: ${Object.values(RegionalRoute).join(', ')}`);
      }
      
      logger.info(`Looking up Riot account by PUUID: ${puuid} in ${region}`);
      
      // Call service to get account data
      const accountData = await accountService.getAccountByPuuid(puuid, region as RegionalRoute);
      
      // Return the data
      res.json(accountData);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new AccountController();