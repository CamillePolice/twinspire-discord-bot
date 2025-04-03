import { Guild } from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';

export async function guildCreate(guild: Guild): Promise<void> {
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    // Get the database instance
    const db = getDatabase();
    const guildConfigsCollection = db.collection('guildConfigs');

    // Check if the guild already exists in the database
    const existingConfig = await guildConfigsCollection.findOne({ guildId: guild.id });

    if (existingConfig) {
      // If the guild already exists, just update it and set it as active
      await guildConfigsCollection.updateOne(
        { guildId: guild.id },
        {
          $set: {
            guildName: guild.name, // Update the guild name
            memberCount: guild.memberCount, // Update member count
            updatedAt: new Date(),
            active: true, // In case it was previously marked inactive
          },
        },
      );
      logger.info(`Updated existing guild in database: ${guild.name} (${guild.id})`);
    } else {
      // Create a new guild config
      const newGuildConfig = {
        guildId: guild.id,
        guildName: guild.name, // Store the guild name
        memberCount: guild.memberCount, // Store member count
        prefix: process.env.PREFIX || '!',
        welcomeChannelId: null,
        logChannelId: null,
        moderationRoles: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert the new guild config
      await guildConfigsCollection.insertOne(newGuildConfig);
      logger.info(`Added new guild to database: ${guild.name} (${guild.id})`);
    }
  } catch (error) {
    logger.error(`Error adding guild ${guild.id} to database:`, error as Error);
  }
}
