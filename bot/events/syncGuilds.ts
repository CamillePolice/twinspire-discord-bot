import { Client } from 'discord.js';
import { connectToDatabase } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Syncs all guilds the bot is in with the database
 * @param client The Discord.js client
 */
export async function syncGuildsWithDatabase(client: Client): Promise<void> {
  try {
    logger.info('Starting guild synchronization with database...');

    // Get all guilds from the client cache
    const guilds = client.guilds.cache;

    // Connect to the database
    const db = await connectToDatabase();
    const guildConfigsCollection = db.collection('guildConfigs');

    // Log the number of guilds found
    logger.info(`Found ${guilds.size} guilds to synchronize`);

    // For each guild the bot is in
    for (const [guildId, guild] of guilds) {
      // Check if the guild already exists in the database
      const existingConfig = await guildConfigsCollection.findOne({ guildId });

      if (existingConfig) {
        // Update the existing config's updatedAt timestamp and set active to true
        await guildConfigsCollection.updateOne(
          { guildId },
          { $set: { updatedAt: new Date(), active: true } },
        );
        logger.info(`Updated existing guild in database: ${guild.name} (${guildId})`);
      } else {
        // Create a new guild config with default values
        const newGuildConfig = {
          guildId,
          prefix: process.env.PREFIX || '!', // Default prefix from environment or fallback
          welcomeChannelId: null, // Default to null until configured
          logChannelId: null, // Default to null until configured
          moderationRoles: [], // Default to empty array until configured
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Insert the new guild config
        await guildConfigsCollection.insertOne(newGuildConfig);
        logger.info(`Added new guild to database: ${guild.name} (${guildId})`);
      }
    }

    // Optional: Clean up old guilds that the bot is no longer in
    const dbGuildIds = (await guildConfigsCollection.find({}).toArray()).map(g => g.guildId);
    const currentGuildIds = Array.from(guilds.keys());

    const removedGuildIds = dbGuildIds.filter(id => !currentGuildIds.includes(id));

    if (removedGuildIds.length > 0) {
      // Option 1: Delete guilds that no longer exist
      // await guildConfigsCollection.deleteMany({ guildId: { $in: removedGuildIds } });
      // logger.info(`Removed ${removedGuildIds.length} guilds from database that bot is no longer in`);

      // Option 2: Mark guilds as inactive instead of deleting (preferred for data retention)
      await guildConfigsCollection.updateMany(
        { guildId: { $in: removedGuildIds } },
        { $set: { active: false, updatedAt: new Date() } },
      );
      logger.info(`Marked ${removedGuildIds.length} guilds as inactive in database`);
    }

    logger.info('Guild synchronization completed successfully');
  } catch (error) {
    logger.error('Error synchronizing guilds with database:', error as Error);
  }
}
