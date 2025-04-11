import { Request, Response, NextFunction } from 'express';
import { config } from '../config/app.config';
import logger from '../utils/logger.utils';
import { ApiError } from '../utils/error-handler.utils';

/**
 * Middleware to authenticate API requests using an API key
 * 
 * Skip authentication for health check endpoints
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Skip authentication for health check endpoint
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }
    
    // Development mode bypass (optional - remove in production)
    if (config.server.nodeEnv === 'development' && !config.api.key) {
      return next();
    }
    
    // Check for API key in headers
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey || apiKey !== config.api.key) {
      logger.warn(`Unauthorized API access attempt from ${req.ip}`, { 
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      throw new ApiError(401, 'Unauthorized - Invalid API key');
    }
    
    // Authentication successful
    next();
  } catch (error) {
    next(error);
  }
}