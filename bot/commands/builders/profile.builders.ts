import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  CacheType,
} from 'discord.js';
import { logger } from '../../utils/logger.utils';
import User, { IUser } from '../../database/models/user.model';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("View your profile or another user's profile")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose profile you want to view')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    // Defer the reply to give us time to fetch data
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;

      // Find the user's data from the database
      let userData: IUser | null = await User.findOne({
        discordId: targetUser.id,
      });

      // If user doesn't exist in the database, create them
      if (!userData) {
        logger.info(`Creating new user profile for ${targetUser.username} (${targetUser.id})`);

        // Create new user data
        userData = await User.create({
          discordId: targetUser.id,
          username: targetUser.username,
          joinedAt: new Date(),
          lastActive: new Date(),
          experience: 0,
          level: 1,
          guilds: [], // Initialize with empty guilds array
        });
      } else {
        // Update last active timestamp
        await User.updateOne({ discordId: targetUser.id }, { $set: { lastActive: new Date() } });
      }

      // Create the profile embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'Level', value: userData.level.toString(), inline: true },
          { name: 'XP', value: userData.experience.toString(), inline: true },
          {
            name: 'Member Since',
            value: `<t:${Math.floor(userData.joinedAt.getTime() / 1000)}:R>`,
            inline: false,
          },
          {
            name: 'Last Active',
            value: `<t:${Math.floor(userData.lastActive.getTime() / 1000)}:R>`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error fetching profile data:', error as Error);
      await interaction.editReply(
        'There was an error fetching profile data. Please try again later.',
      );
    }
  },
};
