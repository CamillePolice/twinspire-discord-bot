import { logger } from '../utils/logger.utils';
import mongoose from 'mongoose';
import { mongooseConfig } from './config';

// Get MongoDB URI from environment variables with fallback
const getMongoUri = (): string => {
  if (process.env.NODE_ENV === 'production') {
    const username = process.env.MONGODB_USER || 'admin';
    const password = process.env.MONGODB_PASSWORD || 'password';
    const host = process.env.MONGODB_HOST || 'mongo';
    const database = process.env.MONGODB_DATABASE || 'twinspire';
    return `mongodb://${username}:${password}@${host}:27017/${database}?authSource=admin`;
  }
  return 'mongodb://admin:password@mongo:27017/twinspire?authSource=admin';
};

/**
 * Connect to MongoDB and initialize the database connection
 * This should be called once at application startup
 */
export const initializeDatabaseConnection = async (): Promise<void> => {
  try {
    const url = getMongoUri();
    logger.info(`Connecting to MongoDB at ${url}`);

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
