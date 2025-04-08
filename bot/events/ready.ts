// Update to src/events/ready.ts

import { Client } from 'discord.js';
import { loadCommands, registerCommands } from '../commands';
import { syncGuildsWithDatabase } from '../events/guilds/guild-sync.events';
import { logger } from '../utils/logger.utils';
import { syncAllGuildMembers } from '../events/guilds/guild-members.events';
import { TournamentMaintenanceScheduler } from '../schedulers/tournament-maintenance.schedulers';
import { setMaintenanceScheduler } from '../commands/commands/maintenance.commands';

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

    // Initialize and start tournament maintenance scheduler
    const maintenanceScheduler = new TournamentMaintenanceScheduler(client);
    maintenanceScheduler.start();

    // Store reference to scheduler for command access
    setMaintenanceScheduler(maintenanceScheduler);
    logger.info('Tournament maintenance scheduler initialized');

    // Log guild information
    logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
  } catch (error) {
    logger.error('Error during ready event:', error as Error);
  }
}
