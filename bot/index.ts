// src/index.ts - Main entry point
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { initializeDatabaseConnection } from './database/connection';
import { registerEvents } from './events';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  logger.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

if (!process.env.APPLICATION_ID) {
  logger.error('Missing APPLICATION_ID environment variable');
  process.exit(1);
}

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Register all event handlers
registerEvents(client);

// Start the bot
(async () => {
  try {
    // Connect to MongoDB first - this establishes the connection for the entire application
    await initializeDatabaseConnection();
    
    // Then login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
    logger.info('Bot successfully started');
  } catch (error) {
    logger.error('Failed to start the bot:', error as Error);
    process.exit(1);
  }
})();

// Handle process shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});