import { logger } from '../utils/logger.utils';
import mongoose from 'mongoose';
import { mongooseConfig } from './config';

// Parse MongoDB URI from environment or use default with auth
const url = 'mongodb://admin:password@mongo:27017/twinspire?authSource=admin';

/**
 * Connect to MongoDB and initialize the database connection
 * This should be called once at application startup
 */
export const initializeDatabaseConnection = async (): Promise<void> => {
  try {
    logger.info(`Connecting to MongoDB at ${url.replace(/\/\/(.+?)@/, '//****:****@')}`);

    await mongoose.connect(url, mongooseConfig);

    mongoose.connection.on('error', error => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    logger.info('Successfully connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
    throw error;
  }
};

/**
 * Close the database connection
 * This should be called when the application is shutting down
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', error as Error);
  }
};

// Handle application shutdown
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
