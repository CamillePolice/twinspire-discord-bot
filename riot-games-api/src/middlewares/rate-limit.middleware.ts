import { Request, Response, NextFunction } from 'express';
import { config } from '../config/app.config';
import logger from '../utils/logger.utils';
import { ApiError } from '../utils/error-handler.utils';

// Store request counts per IP
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitInfo>();

/**
 * Basic rate limiting middleware
 * Limits requests based on client IP address
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  try {
    // Skip rate limiting for health check endpoint
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }
    
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Reset rate limits every minute (or as configured)
    const windowMs = config.api.rateLimit.windowMs;
    const resetTime = Math.floor(now / windowMs) * windowMs + windowMs;
    
    // Get or initialize request count for this IP
    const clientRequests = requestCounts.get(clientIp) || { count: 0, resetTime };
    
    // Reset count if we're in a new time window
    if (now >= clientRequests.resetTime) {
      clientRequests.count = 0;
      clientRequests.resetTime = resetTime;
    }
    
    // Check if rate limit exceeded
    if (clientRequests.count >= config.api.rateLimit.maxRequests) {
      const retryAfter = Math.ceil((clientRequests.resetTime - now) / 1000);
      
      logger.warn(`Rate limit exceeded for ${clientIp}`, {
        ip: clientIp,
        path: req.path,
        method: req.method,
        count: clientRequests.count,
        retryAfter
      });
      
      // Set retry-after header
      res.set('Retry-After', retryAfter.toString());
      
      throw new ApiError(429, 'Too many requests', { retryAfter });
    }
    
    // Increment request count
    clientRequests.count++;
    requestCounts.set(clientIp, clientRequests);
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', String(config.api.rateLimit.maxRequests));
    res.set('X-RateLimit-Remaining', String(config.api.rateLimit.maxRequests - clientRequests.count));
    res.set('X-RateLimit-Reset', String(Math.floor(clientRequests.resetTime / 1000)));
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Clean up old rate limit entries periodically
 */
export function startRateLimitCleanup(): void {
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  setInterval(() => {
    const now = Date.now();
    let expiredCount = 0;
    
    requestCounts.forEach((info, ip) => {
      if (now > info.resetTime) {
        requestCounts.delete(ip);
        expiredCount++;
      }
    });
    
    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired rate limit entries`);
    }
  }, CLEANUP_INTERVAL);
  
  logger.info('Rate limit cleanup scheduler started');
}