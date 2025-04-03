import { Client } from 'discord.js';
import { loadCommands, registerCommands } from '../commands';
import { syncGuildsWithDatabase } from '../guilds/syncGuilds';
import { logger } from '../utils/logger';
import { syncAllGuildMembers } from '../guilds/syncGuildMembers';

export async function ready(client: Client): Promise<void> {
  if (!client.user) {
    logger.error('Client user is null in ready event');
    return;
  }

  logger.info(`Ready! Logged in as ${client.user.tag}`);

  try {
    // Load all command modules
    await loadCommands();

    // Register commands with Discord API
    await registerCommands(client);

    // Sync guilds with database
    await syncGuildsWithDatabase(client);

    // Sync all members from all guilds with database
    await syncAllGuildMembers(client);

    // Log guild information
    logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
  } catch (error) {
    logger.error('Error during ready event:', error as Error);
  }
}
