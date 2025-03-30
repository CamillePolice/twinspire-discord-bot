// src/database/connection.ts
import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

// Connection URL
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/twinspire';

// Database Name
const dbName = 'twinspire';

// Create a new MongoClient
const client = new MongoClient(url);

// MongoDB connection instance
let db: Db | null = null;

/**
 * Connect to MongoDB
 */
export const connectToDatabase = async (): Promise<Db> => {
  try {
    if (db) {
      logger.info('Using existing database connection');
      return db;
    }

    logger.info(`Connecting to MongoDB at ${url}`);
    await client.connect();
    
    db = client.db(dbName);
    logger.info('Successfully connected to MongoDB');
    
    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
    process.exit(1);
  }
};

/**
 * Close the database connection
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