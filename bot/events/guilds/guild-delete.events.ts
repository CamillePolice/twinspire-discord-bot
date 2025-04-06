// src/events/guilds/guild-delete.events.ts - Handles guild leave event
import { Guild } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import GuildConfig from '../../database/models/guild-config.model';

/**
 * Handles the event when the bot leaves a guild
 *
 * @param guild - The Discord guild the bot left
 * @returns Promise resolving when the guild has been marked as inactive
 *
 * Actions:
 * - Marks the guild as inactive in the database (for data retention)
 * - Updates the updatedAt timestamp
 */
export async function guildDelete(guild: Guild): Promise<void> {
  try {
    logger.info(`Left guild: ${guild.name} (${guild.id})`);

    // Mark the guild as inactive (preferred for data retention)
    await GuildConfig.updateOne(
      { guildId: guild.id },
      {
        $set: {
          active: false,
          updatedAt: new Date(),
        },
      },
    );

    logger.info(`Marked guild as inactive in database: ${guild.id}`);
  } catch (error) {
    logger.error(`Error updating guild ${guild.id} in database:`, error as Error);
  }
}
