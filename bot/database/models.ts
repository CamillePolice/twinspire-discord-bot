import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { logger } from '../utils/logger';

// Connection URL
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'twinspire-bot';

// Connection singleton
let client: MongoClient | null = null;
let db: Db | null = null;

// Guild affiliation interface
export interface GuildAffiliation {
  guildId: string;
  joinedAt: Date;
  nickname?: string;
  roles: string[]; // Array of role IDs
}

// User interfaces
// Base user interface without _id (for creating new users)
export interface UserData {
  discordId: string;
  username: string;
  joinedAt: Date;
  lastActive: Date;
  experience: number;
  level: number;
  guilds: GuildAffiliation[];
}

// User interface with MongoDB _id field
export interface User extends UserData {
  _id: ObjectId;
}

// Connect to MongoDB
export async function connectToDatabase(): Promise<Db> {
  if (!client) {
    try {
      client = new MongoClient(url);
      await client.connect();
      db = client.db(dbName);
      logger.info('Connected to MongoDB successfully');
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error as Error);
      throw error;
    }
  }

  if (!db) {
    throw new Error('Database connection failed');
  }

  return db;
}

// Get users collection
export async function getUsersCollection(): Promise<Collection<UserData>> {
  const database = await connectToDatabase();
  if (!database) {
    throw new Error('Failed to connect to database');
  }
  return database.collection<UserData>('users');
}

// Create user
export async function createUser(userData: UserData): Promise<User> {
  const usersCollection = await getUsersCollection();

  const result = await usersCollection.insertOne(userData);

  if (!result.acknowledged) {
    throw new Error('Failed to create user in database');
  }

  // Fetch the newly created user with its _id
  const newUser = await usersCollection.findOne({ _id: result.insertedId });

  if (!newUser) {
    throw new Error('Failed to retrieve the created user');
  }

  // Cast to User to include the _id field
  return { ...newUser, _id: result.insertedId } as User;
}

// Handle process exit
process.on('exit', async () => {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
});
