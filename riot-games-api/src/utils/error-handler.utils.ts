import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from './logger.utils';

/**
 * API error class for custom error handling
 */
export class ApiError extends Error {
  statusCode: number;
  data?: any;
  
  constructor(statusCode: number, message: string, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Handle API errors
 */
export function handleApiError(error: any, req: Request, res: Response, next: NextFunction): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let data = undefined;
  
  // Handle explicit ApiError instances
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    data = error.data;
  }
  // Handle Axios errors (Riot API responses)
  else if (axios.isAxiosError(error)) {
    if (error.response) {
      statusCode = error.response.status;
      message = error.message;
      data = error.response.data;
      
      // Special handling for rate limits
      if (statusCode === 429) {
        const retryAfter = error.response.headers['retry-after'];
        data = { 
          ...data,
          retryAfter: retryAfter || 60 
        };
      }
    } else if (error.request) {
      statusCode = 503;
      message = 'Service Unavailable';
      data = { error: 'No response received from upstream API' };
    }
  }
  
  // Log the error
  logger.error(`${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.stack : String(error),
    data
  });
  
  // Send response to client
  res.status(statusCode).json({
    error: message,
    ...(data && { data }),
    ...(config.server.nodeEnv === 'development' && error instanceof Error ? { stack: error.stack } : {})
  });
}

/**
 * Handler for 404 Not Found
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.path} not found` });
}

// Import after declaration to avoid circular dependencies
import { config } from '../config/app.config';