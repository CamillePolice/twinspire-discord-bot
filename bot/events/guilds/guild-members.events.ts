import { GuildMember, PartialGuildMember, Guild, Client } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import User, { IUser, IGuildAffiliation } from '../../database/models/user.model';

/**
 * Synchronizes all members of a specific guild to the database
 * @param guild The Discord.js guild
 * @returns Promise resolving when synchronization is complete
 */
export async function syncGuildMembers(guild: Guild): Promise<void> {
  try {
    logger.info(`Starting member synchronization for guild ${guild.name} (${guild.id})...`);

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
        const existingUser = await User.findOne({ discordId: memberId });

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
            (g: IGuildAffiliation) => g.guildId === guild.id,
          );

          if (guildEntry) {
            // Update the existing guild entry
            await User.updateOne(
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
            await User.updateOne(
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
          const newUser: Omit<IUser, '_id'> = {
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
                roles: roles,
              },
            ],
          };

          await User.create(newUser);
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

/**
 * Handles the event when a new member joins a guild
 *
 * @param member - The GuildMember that joined
 * @returns Promise resolving when the member has been added to the database
 *
 * Actions:
 * - Adds the user to the database if they don't exist
 * - Adds the guild to the user's guild list if it's not there
 * - Updates the user's information if they're already in the database
 */
export async function guildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const userData = await User.findOne({ discordId: member.id });

    if (userData) {
      // Update existing user
      await User.updateOne(
        { discordId: member.id },
        {
          $push: {
            guilds: {
              guildId: member.guild.id,
              joinedAt: new Date(),
              nickname: member.nickname,
              roles: member.roles.cache.map(role => role.id),
            },
          },
          $set: {
            lastActive: new Date(),
          },
        },
      );
    } else {
      // Create new user
      await User.create({
        discordId: member.id,
        username: member.user.username,
        joinedAt: new Date(),
        lastActive: new Date(),
        experience: 0,
        level: 1,
        guilds: [
          {
            guildId: member.guild.id,
            joinedAt: new Date(),
            nickname: member.nickname,
            roles: member.roles.cache.map(role => role.id),
          },
        ],
      });
    }

    logger.info(
      `Added/updated user ${member.user.username} (${member.id}) in guild ${member.guild.name}`,
    );
  } catch (error) {
    logger.error(`Error processing guild member add for ${member.id}:`, error as Error);
  }
}

/**
 * Handles the event when a member is updated in a guild
 *
 * @param oldMember - The GuildMember before the update
 * @param newMember - The GuildMember after the update
 * @returns Promise resolving when the member has been updated in the database
 *
 * Actions:
 * - Updates the member's roles if they've changed
 * - Updates the member's nickname if it's changed
 * - Adds the guild to the user's guild list if it's not there
 */
export async function guildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
): Promise<void> {
  // Skip bots
  if (newMember.user.bot) return;

  try {
    // Check if roles have changed (we handle nickname separately as it's explicitly stored)
    const oldRoles = oldMember.roles?.cache?.map(role => role.id) || [];
    const newRoles = newMember.roles.cache
      .filter(role => role.id !== newMember.guild.id) // Filter out @everyone role
      .map(role => role.id);

    // Detect if there's a difference in roles
    const rolesChanged =
      oldRoles.length !== newRoles.length ||
      !oldRoles.every(role => newRoles.includes(role)) ||
      !newRoles.every(role => oldRoles.includes(role));

    // Detect nickname change
    const nicknameChanged = oldMember.nickname !== newMember.nickname;

    // Only update database if something changed
    if (rolesChanged || nicknameChanged) {
      logger.info(
        `Member updated: ${newMember.user.tag} (${newMember.id}) in guild ${newMember.guild.name} (${newMember.guild.id})`,
      );

      // Check if user exists in the database
      const existingUser = await User.findOne({
        discordId: newMember.id,
        'guilds.guildId': newMember.guild.id,
      });

      if (existingUser) {
        // Update the roles and/or nickname
        interface GuildMemberUpdate {
          'guilds.$.lastActive': Date;
          'guilds.$.roles'?: string[];
          'guilds.$.nickname'?: string | undefined;
        }

        const updateData: GuildMemberUpdate = {
          'guilds.$.lastActive': new Date(),
        };

        if (rolesChanged) {
          updateData['guilds.$.roles'] = newRoles;
          logger.info(`Updated roles for ${newMember.user.tag} in ${newMember.guild.name}`);
        }

        if (nicknameChanged) {
          updateData['guilds.$.nickname'] = newMember.nickname || undefined;
          logger.info(`Updated nickname for ${newMember.user.tag} in ${newMember.guild.name}`);
        }

        await User.updateOne(
          {
            discordId: newMember.id,
            'guilds.guildId': newMember.guild.id,
          },
          { $set: updateData },
        );
      } else {
        // User exists but guild entry doesn't, add it
        logger.info(`Adding guild entry for ${newMember.user.tag} in ${newMember.guild.name}`);

        await User.updateOne(
          { discordId: newMember.id },
          {
            $push: {
              guilds: {
                guildId: newMember.guild.id,
                joinedAt: newMember.joinedAt || new Date(),
                nickname: newMember.nickname || undefined,
                roles: newRoles,
              },
            },
            $set: {
              lastActive: new Date(),
            },
          },
        );
      }
    }
  } catch (error) {
    logger.error(`Error updating member ${newMember.id}:`, error as Error);
  }
}

export async function guildMemberRemove(member: GuildMember): Promise<void> {
  try {
    await User.updateOne(
      { discordId: member.id },
      {
        $pull: {
          guilds: { guildId: member.guild.id },
        },
        $set: {
          lastActive: new Date(),
        },
      },
    );

    logger.info(
      `Removed user ${member.user.username} (${member.id}) from guild ${member.guild.name}`,
    );
  } catch (error) {
    logger.error(`Error processing guild member remove for ${member.id}:`, error as Error);
  }
}
