import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authenticate } from './middleware/auth.middleware';
import { rateLimit, startRateLimitCleanup } from './middleware/rate-limit.middleware';
import { handleApiError, notFoundHandler } from './utils/error-handler.utils';
import { logHttpRequest } from './utils/logger.utils';
import routes from './routes/index.routes';
import { config } from './config/app.config';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  // Create Express app
  const app = express();
  
  // Basic middleware
  app.use(helmet()); // Security headers
  app.use(cors()); // CORS support
  app.use(compression()); // Compress responses
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
  
  // Request logging
  app.use(logHttpRequest);
  
  // Rate limiting and authentication middleware
  app.use(rateLimit);
  app.use(authenticate);
  
  // Root health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
  });
  
  // API routes
  app.use('/api', routes);
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Error handler
  app.use(handleApiError);
  
  return app;
}

/**
 * Start rate limit cleanup process
 */
export function initializeServices(): void {
  startRateLimitCleanup();
}