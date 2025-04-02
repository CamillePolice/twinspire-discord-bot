// src/commands/userinfo.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  CacheType,
} from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';
import { GuildAffiliation } from '../database/models';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View detailed information about a user in this server')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to get information about').setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    // Make sure we're in a guild
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    // Defer the reply to give us time to fetch data
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        await interaction.editReply(`Could not find user ${targetUser.tag} in this server.`);
        return;
      }

      // Get the database instance
      const db = getDatabase();
      const usersCollection = db.collection('users');

      // Get the user's data from MongoDB
      const userData = await usersCollection.findOne({
        discordId: targetUser.id,
        'guilds.guildId': interaction.guild.id,
      });

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(member.displayHexColor || '#0099ff')
        .setTitle(`User Info: ${member.displayName}`)
        .setThumbnail(member.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'Username', value: targetUser.tag, inline: true },
          { name: 'User ID', value: targetUser.id, inline: true },
          { name: 'Nickname', value: member.nickname || 'None', inline: true },
          {
            name: 'Account Created',
            value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: 'Joined Server',
            value: member.joinedAt
              ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
              : 'Unknown',
            inline: true,
          },
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}` });

      // Get all roles excluding @everyone
      const roles = member.roles.cache
        .filter(role => interaction.guild && role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position); // Sort by position (highest first)

      if (roles.size > 0) {
        const rolesList = roles.map(role => `<@&${role.id}>`).join(' ');
        embed.addFields({
          name: `Roles [${roles.size}]`,
          value: rolesList || 'None',
          inline: false,
        });
      } else {
        embed.addFields({ name: 'Roles', value: 'None', inline: false });
      }

      // Add database information if available
      if (userData) {
        const guildInfo = userData.guilds.find(
          (g: GuildAffiliation) => g.guildId === interaction.guild?.id,
        );

        if (guildInfo) {
          embed.addFields(
            {
              name: 'First Seen',
              value: `<t:${Math.floor(guildInfo.joinedAt.getTime() / 1000)}:R>`,
              inline: true,
            },
            { name: 'Experience', value: userData.experience.toString(), inline: true },
            { name: 'Level', value: userData.level.toString(), inline: true },
          );

          // Compare stored roles with actual roles
          const storedRoleIds = new Set<string>(guildInfo.roles || []);
          const currentRoleIds = new Set(roles.map(r => r.id));

          const missingInDb = [...currentRoleIds].filter(id => !storedRoleIds.has(id));
          const extraInDb = [...storedRoleIds].filter(id => !currentRoleIds.has(id));

          // If there are discrepancies, show them
          if (missingInDb.length > 0 || extraInDb.length > 0) {
            let discrepancyText = '';

            if (missingInDb.length > 0) {
              const roleNames = missingInDb
                .map(id => {
                  const role = interaction.guild?.roles.cache.get(id);
                  return role ? role.name : id;
                })
                .join(', ');

              discrepancyText += `**Roles not in DB:** ${roleNames}\n`;
            }

            if (extraInDb.length > 0) {
              const roleNames = extraInDb
                .map(id => {
                  const role = interaction.guild?.roles.cache.get(id);
                  return role ? role.name : id;
                })
                .join(', ');

              discrepancyText += `**Roles only in DB:** ${roleNames}`;
            }

            embed.addFields({ name: 'Role Discrepancies', value: discrepancyText, inline: false });

            // Update the database with current roles
            await usersCollection.updateOne(
              {
                discordId: targetUser.id,
                'guilds.guildId': interaction.guild.id,
              },
              {
                $set: {
                  'guilds.$.roles': [...currentRoleIds],
                  'guilds.$.lastActive': new Date(),
                },
              },
            );

            logger.info(
              `Updated role information for ${targetUser.tag} in ${interaction.guild.name}`,
            );
          }
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error fetching user info:', error as Error);
      await interaction.editReply(
        'There was an error fetching user information. Please try again later.',
      );
    }
  },
};
