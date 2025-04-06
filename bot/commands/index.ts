import { Client, Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define command interface
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: unknown) => Promise<void>;
}

// Initialize commands collection
export const commands = new Collection<string, Command>();

// Recursively find command files in a directory
const findCommandFiles = (dir: string): string[] => {
  const commandFiles: string[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      commandFiles.push(...findCommandFiles(filePath));
    } else {
      // Filter for .builders.ts files only
      if (
        file.endsWith('.builders.ts') &&
        !file.endsWith('index.builders.ts') &&
        !file.endsWith('.test.builders.ts') &&
        !file.endsWith('.spec.builders.ts')
      ) {
        commandFiles.push(filePath);
      }
    }
  }

  return commandFiles;
};

// Load commands from files
export const loadCommands = async () => {
  const commandsPath = path.join(__dirname);
  console.log(`LOG || loadCommands || commandsPath ->`, commandsPath);

  // Create commands directory if it doesn't exist
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  // Find all command files recursively
  const commandFiles = findCommandFiles(commandsPath);
  console.log(`LOG || loadCommands || commandFiles ->`, commandFiles)

  for (const filePath of commandFiles) {
    try {
      const command = await import(filePath);
      
      // Handle both default and named exports
      const commandModule = command.default || Object.values(command)[0];
      
      if (commandModule && 'data' in commandModule && 'execute' in commandModule) {
        commands.set(commandModule.data.name, commandModule);
        console.log(
          `Loaded command: ${commandModule.data.name} from ${path.relative(commandsPath, filePath)}`,
        );
      } else {
        console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`Error loading command from ${filePath}:`, error);
    }
  }
};

// Register slash commands with Discord API
export const registerCommands = async (client: Client) => {
  if (!process.env.DISCORD_TOKEN || !process.env.APPLICATION_ID) {
    console.error('Missing environment variables: DISCORD_TOKEN or APPLICATION_ID');
    return;
  }

  try {
    console.log('Started refreshing application (/) commands.');

    const rest = new REST({ version: '10' }).setToken(client.token!);
    const commandsData = Array.from(commands.values()).map(command => command.data.toJSON());

    // If GUILD_ID is specified, register commands to a specific guild for faster development
    if (process.env.GUILD_ID) {
      // Guild-specific commands for faster development
      await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
        { body: commandsData },
      );
      console.log(`Successfully registered commands to guild ${process.env.GUILD_ID}`);
    } else {
      // Global commands (takes up to an hour to propagate)
      await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID), {
        body: commandsData,
      });
      console.log('Successfully registered global application commands');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};
