import { GuildMember, PartialGuildMember } from 'discord.js';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger.utils';
import { GuildAffiliation } from '../../database/models';

export async function guildMemberAdd(member: GuildMember): Promise<void> {
  // Skip bots
  if (member.user.bot) return;

  logger.info(
    `New member joined: ${member.user.tag} (${member.id}) in guild ${member.guild.name} (${member.guild.id})`,
  );

  try {
    // Get the database instance
    const db = getDatabase();
    const usersCollection = db.collection('users');

    // Check if the user already exists in the database
    const existingUser = await usersCollection.findOne({ discordId: member.id });

    // Get member's nickname if available
    const nickname = member.nickname || undefined;

    // Member join date for this guild
    const memberJoinedAt = member.joinedAt || new Date();

    // Get member's roles (excluding @everyone role)
    const roles = member.roles.cache
      .filter(role => role.id !== member.guild.id) // Filter out @everyone role
      .map(role => role.id);

    if (existingUser) {
      // Check if this guild is already in the user's guild list
      const guildEntry = existingUser.guilds?.find(
        (g: GuildAffiliation) => g.guildId === member.guild.id,
      );

      if (guildEntry) {
        // Update the existing guild entry
        await usersCollection.updateOne(
          {
            discordId: member.id,
            'guilds.guildId': member.guild.id,
          },
          {
            $set: {
              username: member.user.username,
              lastActive: new Date(),
              'guilds.$.nickname': nickname,
              'guilds.$.joinedAt': memberJoinedAt,
              'guilds.$.roles': roles,
            },
          },
        );
      } else {
        // Add this guild to the user's guild list
        await usersCollection.updateOne(
          { discordId: member.id },
          {
            $set: {
              username: member.user.username,
              lastActive: new Date(),
            },
            $push: {
              guilds: {
                guildId: member.guild.id,
                joinedAt: memberJoinedAt,
                nickname: nickname,
                roles: roles,
              },
            },
          },
        );
      }
      logger.info(
        `Updated existing user in database for new member: ${member.user.tag} (${member.id})`,
      );
    } else {
      // Create a new user entry
      const newUser = {
        discordId: member.id,
        username: member.user.username,
        joinedAt: new Date(),
        lastActive: new Date(),
        experience: 0,
        level: 1,
        guilds: [
          {
            guildId: member.guild.id,
            joinedAt: memberJoinedAt,
            nickname: nickname,
            roles: [],
          },
        ],
      };

      await usersCollection.insertOne(newUser);
      logger.info(`Added new user to database: ${member.user.tag} (${member.id})`);
    }
  } catch (error) {
    logger.error(`Error processing new member ${member.id}:`, error as Error);
  }
}

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
