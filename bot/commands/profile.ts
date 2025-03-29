// src/commands/profile.ts
import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createUser, getUsersCollection, User } from '../database/models';
import { logger } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile or another user\'s profile')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user whose profile you want to view')
        .setRequired(false)
    ),

  async execute(interaction: CommandInteraction) {
    // Defer the reply to give us time to fetch data
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get the user's data from MongoDB
      const usersCollection = await getUsersCollection();
      let userData = await usersCollection.findOne({ discordId: targetUser.id });
      
      // If user doesn't exist in the database, create them
      if (!userData) {
        logger.info(`Creating new user profile for ${targetUser.tag} (${targetUser.id})`);
        
        // Create new user data
        const newUser: Omit<User, '_id'> = {
          discordId: targetUser.id,
          username: targetUser.username,
          joinedAt: new Date(),
          lastActive: new Date(),
          experience: 0,
          level: 1
        };
        
        userData = await createUser(newUser);
      } else {
        // Update last active timestamp
        await usersCollection.updateOne(
          { discordId: targetUser.id },
          { $set: { lastActive: new Date() } }
        );
      }
      
      // Create the profile embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'Level', value: userData.level.toString(), inline: true },
          { name: 'XP', value: userData.experience.toString(), inline: true },
          { name: 'Member Since', value: `<t:${Math.floor(userData.joinedAt.getTime() / 1000)}:R>`, inline: false },
          { name: 'Last Active', value: `<t:${Math.floor(userData.lastActive.getTime() / 1000)}:R>`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error('Error fetching profile data:', error as Error);
      await interaction.editReply('There was an error fetching profile data. Please try again later.');
    }
  }
};