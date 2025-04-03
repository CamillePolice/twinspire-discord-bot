// src/events/guildDelete.ts - Handles guild leave event
import { Guild } from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';

export async function guildDelete(guild: Guild): Promise<void> {
  logger.info(`Left guild: ${guild.name} (${guild.id})`);

  try {
    // Get the database instance
    const db = getDatabase();
    const guildConfigsCollection = db.collection('guildConfigs');

    // Mark the guild as inactive (preferred for data retention)
    await guildConfigsCollection.updateOne(
      { guildId: guild.id },
      { $set: { active: false, updatedAt: new Date() } },
    );

    logger.info(`Marked guild as inactive in database: ${guild.id}`);
  } catch (error) {
    logger.error(`Error updating guild ${guild.id} in database:`, error as Error);
  }
}
