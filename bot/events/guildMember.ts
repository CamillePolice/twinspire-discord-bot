// src/events/guildMemberUpdate.ts
import { GuildMember, PartialGuildMember } from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';

export async function guildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
): Promise<void> {
  // Skip bots
  if (newMember.user.bot) return;

  try {
    // Get the database instance
    const db = getDatabase();
    const usersCollection = db.collection('users');

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
      const existingUser = await usersCollection.findOne({
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

        await usersCollection.updateOne(
          {
            discordId: newMember.id,
            'guilds.guildId': newMember.guild.id,
          },
          { $set: updateData },
        );
      } else {
        // User exists but guild entry doesn't, add it
        logger.info(`Adding guild entry for ${newMember.user.tag} in ${newMember.guild.name}`);

        await usersCollection.updateOne(
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
