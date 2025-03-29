// src/database/models.ts
import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from './connection';

// User document interface
export interface User {
  _id?: ObjectId;
  discordId: string;
  username: string;
  joinedAt: Date;
  lastActive: Date;
  experience: number;
  level: number;
}

// Guild configuration interface
export interface GuildConfig {
  _id?: ObjectId;
  guildId: string;
  prefix: string;
  welcomeChannelId?: string;
  logChannelId?: string;
  moderationRoles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Get a collection with type safety
export const getCollection = async <T>(collectionName: string): Promise<Collection<T>> => {
  const db = await connectToDatabase();
  return db.collection<T>(collectionName);
};

// User collection helper
export const getUsersCollection = async (): Promise<Collection<User>> => {
  return getCollection<User>('users');
};

// Guild config collection helper
export const getGuildConfigCollection = async (): Promise<Collection<GuildConfig>> => {
  return getCollection<GuildConfig>('guildConfigs');
};

// Create a user
export const createUser = async (userData: Omit<User, '_id'>): Promise<User> => {
  const collection = await getUsersCollection();
  
  // Check if user already exists
  const existingUser = await collection.findOne({ discordId: userData.discordId });
  if (existingUser) {
    return existingUser;
  }
  
  const result = await collection.insertOne(userData as User);
  return {
    _id: result.insertedId,
    ...userData
  };
};

// Get or create a guild configuration
export const getOrCreateGuildConfig = async (guildId: string): Promise<GuildConfig> => {
  const collection = await getGuildConfigCollection();
  
  const existingConfig = await collection.findOne({ guildId });
  if (existingConfig) {
    return existingConfig;
  }
  
  // Create a default configuration
  const defaultConfig: Omit<GuildConfig, '_id'> = {
    guildId,
    prefix: process.env.PREFIX || '!',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await collection.insertOne(defaultConfig as GuildConfig);
  return {
    _id: result.insertedId,
    ...defaultConfig
  };
};

// Update a guild configuration
export const updateGuildConfig = async (
  guildId: string,
  updates: Partial<GuildConfig>
): Promise<GuildConfig | null> => {
  const collection = await getGuildConfigCollection();
  
  const result = await collection.findOneAndUpdate(
    { guildId },
    { 
      $set: {
        ...updates,
        updatedAt: new Date()
      } 
    },
    { returnDocument: 'after' }
  );
  
  return result;
};