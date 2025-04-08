import { Client } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import GuildConfig from '../../database/models/guild-config.model';

/**
 * Syncs all guilds the bot is in with the database
 *
 * @param client - The Discord.js client
 * @returns Promise resolving when synchronization is complete
 *
 * Actions:
 * - Adds new guilds to the database
 * - Updates existing guilds
 * - Marks guilds that the bot is no longer in as inactive
 */
export async function syncGuildsWithDatabase(client: Client): Promise<void> {
  try {
    logger.info('Starting guild synchronization with database...');

    // Get all guilds from the client cache
    const guilds = client.guilds.cache;

    // Log the number of guilds found
    logger.info(`Found ${guilds.size} guilds to synchronize`);

    // For each guild the bot is in
    for (const [guildId, guild] of guilds) {
      try {
        // Check if the guild already exists in the database
        const existingConfig = await GuildConfig.findOne({ guildId });

        if (existingConfig) {
          // Update the existing config
          await GuildConfig.updateOne(
            { guildId },
            {
              $set: {
                guildName: guild.name,
                memberCount: guild.memberCount,
                active: true,
                updatedAt: new Date(),
              },
            },
          );
          logger.info(`Updated existing guild in database: ${guild.name} (${guildId})`);
        } else {
          // Create a new guild config with default values
          const newGuildConfig = new GuildConfig({
            guildId,
            guildName: guild.name,
            memberCount: guild.memberCount,
            prefix: process.env.PREFIX || '!', // Default prefix from environment or fallback
            welcomeChannelId: null, // Default to null until configured
            logChannelId: null, // Default to null until configured
            moderationRoles: [], // Default to empty array until configured
            active: true,
            settings: {
              autoSyncMembers: process.env.AUTO_SYNC_MEMBERS === 'true',
              enableLogging: true,
              enableWelcomeMessages: false,
            },
          });

          // Save the new guild config
          await newGuildConfig.save();
          logger.info(`Added new guild to database: ${guild.name} (${guildId})`);
        }
      } catch (error) {
        logger.error(`Error processing guild ${guildId}:`, error as Error);
      }
    }

    // Mark guilds that the bot is no longer in as inactive
    try {
      // Get all guild IDs from the database where active is true
      const activeGuilds = await GuildConfig.find({ active: true });
      const dbGuildIds = activeGuilds.map(g => g.guildId);
      const currentGuildIds = Array.from(guilds.keys());

      // Find guilds that are in the database but not in the client
      const removedGuildIds = dbGuildIds.filter(id => !currentGuildIds.includes(id));

      if (removedGuildIds.length > 0) {
        // Mark guilds as inactive
        await GuildConfig.updateMany(
          { guildId: { $in: removedGuildIds } },
          { $set: { active: false, updatedAt: new Date() } },
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
