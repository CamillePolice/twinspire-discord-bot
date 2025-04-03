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
      // Filter for command files
      if (
        (file.endsWith('.js') ||
          (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) &&
        !file.endsWith('index.js') &&
        !file.endsWith('index.ts') &&
        !file.endsWith('.test.js') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.js') &&
        !file.endsWith('.spec.ts')
      ) {
        commandFiles.push(filePath);
      }
    }
  }

  return commandFiles;
};

// Load commands from files
export const loadCommands = async () => {
  const commandsPath = path.join(__dirname, '..', 'commands');
  console.log(`LOG || loadCommands || commandsPath ->`, commandsPath);

  // Create commands directory if it doesn't exist
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  // Find all command files recursively
  const commandFiles = findCommandFiles(commandsPath);

  for (const filePath of commandFiles) {
    try {
      // Import the command module - for CommonJS we would use require
      // For ESM, we need to handle this differently based on the environment
      const command = await import(filePath);

      // Commands might be exported as default or as named exports
      const commandModule = command.default || command;

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
