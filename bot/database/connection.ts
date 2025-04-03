import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

// Parse MongoDB URI from environment or use default with auth
const url = 'mongodb://admin:password@mongo:27017/twinspire?authSource=admin';

// Database Name
const dbName = 'twinspire';

// Create a new MongoClient
const client = new MongoClient(url);

// MongoDB connection instance
let db: Db | null = null;

/**
 * Connect to MongoDB and initialize the database connection
 * This should be called once at application startup
 */
export const initializeDatabaseConnection = async (): Promise<void> => {
  try {
    logger.info(`Connecting to MongoDB at ${url.replace(/\/\/(.+?)@/, '//****:****@')}`); // Hide credentials in logs
    await client.connect();

    db = client.db(dbName);
    logger.info('Successfully connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
    throw error;
  }
};

/**
 * Get the database instance
 * This should be used throughout the application to access the database
 */
export const getDatabase = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabaseConnection first.');
  }
  return db;
};

/**
 * Close the database connection
 * This should be called when the application is shutting down
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    if (client) {
      await client.close();
      db = null;
      logger.info('MongoDB connection closed');
    }
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
