import { createApp, initializeServices } from './src/app';
import { config, validateConfig } from './src/config/app.config';
import logger from './src/utils/logger.utils';

// Validate essential configuration
validateConfig();

// Create Express app
const app = createApp();

// Initialize background services
initializeServices();

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port} in ${config.server.nodeEnv} mode`);
  logger.info(`Riot API configured: ${config.riot.apiKey ? 'Yes' : 'No'}`);
});

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

/**
 * Handle graceful shutdown
 */
function gracefulShutdown(): void {
  logger.info('Received shutdown signal, closing server...');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}