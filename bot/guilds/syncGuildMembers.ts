// src/guilds/syncMembers.ts
import { Client, Guild } from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger.utils';
import { GuildAffiliation, UserData } from '../database/models';

/**
 * Synchronizes all members of a specific guild to the database
 * @param guild The Discord.js guild
 * @returns Promise resolving when synchronization is complete
 */
export async function syncGuildMembers(guild: Guild): Promise<void> {
  try {
    logger.info(`Starting member synchronization for guild ${guild.name} (${guild.id})...`);

    // Get the database instance
    const db = getDatabase();
    const usersCollection = db.collection('users');

    // Fetch all guild members - this may require GUILD_MEMBERS intent
    logger.info(`Fetching members for guild ${guild.id}...`);
    await guild.members.fetch();
    const members = guild.members.cache;

    logger.info(`Found ${members.size} members in guild ${guild.id}`);

    // Process each member
    let addedCount = 0;
    let updatedCount = 0;

    for (const [memberId, member] of members) {
      // Skip bots
      if (member.user.bot) continue;

      try {
        // Check if user already exists in the database
        const existingUser = await usersCollection.findOne({ discordId: memberId });

        // Get member's nickname if available
        const nickname = member.nickname || undefined;

        // Member join date for this guild
        const memberJoinedAt = member.joinedAt || new Date();

        // Get member's roles (excluding @everyone role)
        const roles = member.roles.cache
          .filter(role => role.id !== guild.id) // Filter out @everyone role
          .map(role => role.id);

        if (existingUser) {
          // Check if user is already in this guild
          const guildEntry = existingUser.guilds?.find(
            (g: GuildAffiliation) => g.guildId === guild.id,
          );

          if (guildEntry) {
            // Update the existing guild entry
            await usersCollection.updateOne(
              {
                discordId: memberId,
                'guilds.guildId': guild.id,
              },
              {
                $set: {
                  username: member.user.username,
                  lastActive: new Date(),
                  'guilds.$.nickname': nickname,
                  'guilds.$.roles': roles,
                },
              },
            );
          } else {
            // Add this guild to the user's guild list
            await usersCollection.updateOne(
              { discordId: memberId },
              {
                $set: {
                  username: member.user.username,
                  lastActive: new Date(),
                },
                $push: {
                  guilds: {
                    guildId: guild.id,
                    joinedAt: memberJoinedAt,
                    nickname: nickname,
                    roles: roles,
                  },
                },
              },
            );
          }
          updatedCount++;
        } else {
          // Create a new user entry
          const newUser: UserData = {
            discordId: memberId,
            username: member.user.username,
            joinedAt: new Date(),
            lastActive: new Date(),
            experience: 0,
            level: 1,
            guilds: [
              {
                guildId: guild.id,
                joinedAt: memberJoinedAt,
                nickname: nickname,
                roles: [],
              },
            ],
          };

          await usersCollection.insertOne(newUser);
          addedCount++;
        }
      } catch (error) {
        logger.error(`Error processing member ${memberId}:`, error as Error);
      }
    }

    logger.info(
      `Member synchronization complete for guild ${guild.id}. Added: ${addedCount}, Updated: ${updatedCount}`,
    );
  } catch (error) {
    logger.error(`Error synchronizing members for guild ${guild.id}:`, error as Error);
  }
}

/**
 * Synchronizes all members from all guilds to the database
 * @param client The Discord.js client
 * @returns Promise resolving when synchronization is complete
 */
export async function syncAllGuildMembers(client: Client): Promise<void> {
  try {
    logger.info('Starting synchronization of all members across all guilds...');

    // Get all guilds
    const guilds = client.guilds.cache;

    // Process each guild
    let completedCount = 0;
    for (const [guildId, guild] of guilds) {
      try {
        await syncGuildMembers(guild);
        completedCount++;
        logger.info(`Completed ${completedCount}/${guilds.size} guilds`);
      } catch (error) {
        logger.error(`Failed to sync members for guild ${guildId}:`, error as Error);
      }
    }

    logger.info(
      `All member synchronization complete. Processed ${completedCount}/${guilds.size} guilds.`,
    );
  } catch (error) {
    logger.error('Error in syncAllGuildMembers:', error as Error);
  }
}

/**
 * Command to manually trigger member synchronization for a specific guild
 * @param guildId The Discord guild ID to synchronize
 * @param client The Discord.js client
 */
export async function syncMembersCommand(guildId: string, client: Client): Promise<void> {
  try {
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      logger.error(`Guild with ID ${guildId} not found`);
      return;
    }

    await syncGuildMembers(guild);
  } catch (error) {
    logger.error(`Error in syncMembersCommand for guild ${guildId}:`, error as Error);
  }
}
