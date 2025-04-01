import { Client } from 'discord.js';
import { getDatabase } from '../database/connection';
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
    
    // Get the database instance
    const db = getDatabase();
    const guildConfigsCollection = db.collection('guildConfigs');
    
    // Log the number of guilds found
    logger.info(`Found ${guilds.size} guilds to synchronize`);
    
    // For each guild the bot is in
    for (const [guildId, guild] of guilds) {
      try {
        // Check if the guild already exists in the database
        const existingConfig = await guildConfigsCollection.findOne({ guildId });
        
        if (existingConfig) {
          // Update the existing config's updatedAt timestamp, name, and set active to true
          await guildConfigsCollection.updateOne(
            { guildId },
            { 
              $set: { 
                updatedAt: new Date(), 
                active: true,
                guildName: guild.name, // Add/update the guild name
                memberCount: guild.memberCount // Also store member count for analytics
              } 
            }
          );
          logger.info(`Updated existing guild in database: ${guild.name} (${guildId})`);
        } else {
          // Create a new guild config with default values
          const newGuildConfig = {
            guildId,
            guildName: guild.name, // Store the guild name
            memberCount: guild.memberCount, // Store member count
            prefix: process.env.PREFIX || '!',  // Default prefix from environment or fallback
            welcomeChannelId: null,  // Default to null until configured
            logChannelId: null,      // Default to null until configured
            moderationRoles: [],     // Default to empty array until configured
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Insert the new guild config
          await guildConfigsCollection.insertOne(newGuildConfig);
          logger.info(`Added new guild to database: ${guild.name} (${guildId})`);
        }
      } catch (error) {
        logger.error(`Error processing guild ${guild.id}:`, error as Error);
      }
    }
    
    // Optional: Clean up old guilds that the bot is no longer in
    try {
      const dbGuildIds = (await guildConfigsCollection.find({}).toArray()).map(g => g.guildId);
      const currentGuildIds = Array.from(guilds.keys());
      
      const removedGuildIds = dbGuildIds.filter(id => !currentGuildIds.includes(id));
      
      if (removedGuildIds.length > 0) {
        // Mark guilds as inactive instead of deleting (preferred for data retention)
        await guildConfigsCollection.updateMany(
          { guildId: { $in: removedGuildIds } },
          { $set: { active: false, updatedAt: new Date() } }
        );
        logger.info(`Marked ${removedGuildIds.length} guilds as inactive in database`);
      }
    } catch (error) {
      logger.error('Error cleaning up inactive guilds:', error as Error);
    }
    
    logger.info('Guild synchronization completed successfully');
  } catch (error) {
    logger.error('Error synchronizing guilds with database:', error as Error);
  }
}