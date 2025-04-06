import { Guild } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { syncGuildMembers } from '../../guilds/sync-members.guilds';
import GuildConfig from '../../database/models/guild-config.model';

/**
 * Handles the event when the bot joins a new guild
 *
 * @param guild - The Discord guild the bot joined
 * @returns Promise resolving when the guild has been added to the database
 *
 * Actions:
 * - Adds guild to database or updates existing entry
 * - Sets guild as active
 * - Updates guild metadata (name, member count)
 * - Optionally synchronizes guild members
 */
export async function guildCreate(guild: Guild): Promise<void> {
  try {
    logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

    // Check if the guild already exists in the database
    const existingConfig = await GuildConfig.findOne({ guildId: guild.id });

    if (existingConfig) {
      // If the guild already exists, just update it and set it as active
      await GuildConfig.updateOne(
        { guildId: guild.id },
        {
          $set: {
            guildName: guild.name,
            memberCount: guild.memberCount,
            active: true, // In case it was previously marked inactive
            updatedAt: new Date(),
          },
        },
      );
      logger.info(`Updated existing guild in database: ${guild.name} (${guild.id})`);
    } else {
      // Create a new guild config with default values
      const newGuildConfig = new GuildConfig({
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
        prefix: process.env.PREFIX || '!',
        welcomeChannelId: null,
        logChannelId: null,
        moderationRoles: [],
        active: true,
        settings: {
          autoSyncMembers: process.env.AUTO_SYNC_MEMBERS === 'true',
          enableLogging: true,
          enableWelcomeMessages: false,
        },
      });

      // Save the new guild config
      await newGuildConfig.save();
      logger.info(`Added new guild to database: ${guild.name} (${guild.id})`);
    }

    // Get the current guild config to check settings
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

    // Optionally sync the guild members if autoSyncMembers is enabled
    if (guildConfig?.settings.autoSyncMembers) {
      try {
        logger.info(`Starting member synchronization for new guild: ${guild.name} (${guild.id})`);
        await syncGuildMembers(guild);
        logger.info(`Completed member synchronization for new guild: ${guild.name} (${guild.id})`);
      } catch (syncError) {
        logger.error(`Error synchronizing members for new guild ${guild.id}:`, syncError as Error);
      }
    }
  } catch (error) {
    logger.error(`Error processing guild join for ${guild.id}:`, error as Error);
  }
}
