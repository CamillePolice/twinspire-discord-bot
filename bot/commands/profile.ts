// src/commands/profile.ts
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, CacheType } from 'discord.js';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';
import { WithId, Document } from 'mongodb';

// Define interface for user data
interface UserData {
  discordId: string;
  username: string;
  joinedAt: Date;
  lastActive: Date;
  experience: number;
  level: number;
}

// Type for MongoDB document with _id
type UserDocument = WithId<Document> & UserData;

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

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    // Defer the reply to give us time to fetch data
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get the database instance
      const db = getDatabase();
      const usersCollection = db.collection('users');
      
      // Get the user's data from MongoDB
      let userData: UserDocument | null = await usersCollection.findOne({ discordId: targetUser.id }) as UserDocument | null;
      
      // If user doesn't exist in the database, create them
      if (!userData) {
        logger.info(`Creating new user profile for ${targetUser.username} (${targetUser.id})`);
        
        // Create new user data
        const newUser: UserData = {
          discordId: targetUser.id,
          username: targetUser.username,
          joinedAt: new Date(),
          lastActive: new Date(),
          experience: 0,
          level: 1
        };
        
        // Insert the new user
        const result = await usersCollection.insertOne(newUser);
        if (result.acknowledged) {
          // Retrieve the newly created user
          userData = await usersCollection.findOne({ _id: result.insertedId }) as UserDocument | null;
          
          if (!userData) {
            throw new Error('Failed to retrieve user after creation');
          }
        } else {
          throw new Error('Failed to create user in database');
        }
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