import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  CacheType,
  PermissionFlagsBits,
} from 'discord.js';
import User from '../../database/models/user.model';
import GuildConfig from '../../database/models/guild-config.model';
import { logger } from '../../utils/logger.utils';

export default {
  data: new SlashCommandBuilder()
    .setName('userguilds')
    .setDescription('View all servers a user is in (that the bot knows about)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose servers you want to view')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Restrict to moderators
    .setDMPermission(false), // Cannot be used in DMs

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    // Defer the reply to give us time to fetch data
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;

      // Get the user's data from MongoDB
      const userData = await User.findOne({ discordId: targetUser.id });

      if (!userData || !userData.guilds || userData.guilds.length === 0) {
        await interaction.editReply(`No server data found for ${targetUser.username}.`);
        return;
      }

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${targetUser.username}'s Servers`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(
          `${targetUser.username} is in ${userData.guilds.length} servers tracked by this bot.`,
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });

      // Add fields for each guild (up to 25, which is Discord's limit for fields)
      const guildsList = userData.guilds.slice(0, 25);

      for (const guildInfo of guildsList) {
        try {
          // Try to get the guild name from our database
          const guildConfig = await GuildConfig.findOne({ guildId: guildInfo.guildId });

          // Try to get the guild from the client cache
          const guild = interaction.client.guilds.cache.get(guildInfo.guildId);

          const guildName = guildConfig?.guildName || guild?.name || 'Unknown Server';

          // Format join date
          const joinDate = `<t:${Math.floor(guildInfo.joinedAt.getTime() / 1000)}:R>`;

          // Prepare roles information
          let rolesInfo = 'None';
          if (guildInfo.roles && guildInfo.roles.length > 0) {
            // Get the guild object if available in client cache
            const guildObj = interaction.client.guilds.cache.get(guildInfo.guildId);

            if (guildObj) {
              // Try to resolve role names from the guild
              const roleNames = guildInfo.roles
                .map((roleId: string) => {
                  const role = guildObj.roles.cache.get(roleId);
                  return role ? role.name : roleId;
                })
                .slice(0, 3) // Show at most 3 roles to avoid overflow
                .join(', ');

              rolesInfo = roleNames;

              // If there are more roles than we show
              if (guildInfo.roles.length > 3) {
                rolesInfo += ` and ${guildInfo.roles.length - 3} more`;
              }
            } else {
              // Just show the count if we can't resolve names
              rolesInfo = `${guildInfo.roles.length} roles`;
            }
          }

          // Add field for this guild
          embed.addFields({
            name: guildName,
            value: `**Joined:** ${joinDate}\n**Nickname:** ${guildInfo.nickname || 'None'}\n**Roles:** ${rolesInfo}`,
            inline: true,
          });
        } catch (error) {
          logger.error(`Error processing guild ${guildInfo.guildId}:`, error as Error);
        }
      }

      // If there are more guilds than we can show
      if (userData.guilds.length > 25) {
        embed.addFields({
          name: 'And more...',
          value: `${userData.guilds.length - 25} additional servers not shown.`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error fetching user guilds data:', error as Error);
      await interaction.editReply(
        'There was an error fetching guild data. Please try again later.',
      );
    }
  },
};
