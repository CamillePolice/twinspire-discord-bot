import { Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define command interface
export interface Command {
  data: SlashCommandBuilder | unknown;
  execute: (interaction: unknown) => Promise<void>;
}

// Initialize commands collection
export const commands = new Collection<string, Command>();

// Load commands from files
export const loadCommands = async () => {
  const commandsPath = path.join(__dirname, 'commands');

  // Create commands directory if it doesn't exist
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(
      file =>
        (file.endsWith('.js') ||
          (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) &&
        !file.endsWith('index.js') &&
        !file.endsWith('index.ts') &&
        !file.endsWith('.test.js') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.spec.js') &&
        !file.endsWith('.spec.ts'),
    );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      // Import the command module - for CommonJS we would use require
      // For ESM, we need to handle this differently based on the environment
      const command = await import(filePath);

      // Commands might be exported as default or as named exports
      const commandModule = command.default || command;

      if (commandModule && 'data' in commandModule && 'execute' in commandModule) {
        commands.set(commandModule.data.name, commandModule);
        console.log(`Loaded command: ${commandModule.data.name}`);
      } else {
        console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`Error loading command from ${filePath}:`, error);
    }
  }
};

// Register slash commands with Discord API
export const registerCommands = async () => {
  if (!process.env.DISCORD_TOKEN || !process.env.APPLICATION_ID) {
    console.error('Missing environment variables: DISCORD_TOKEN or APPLICATION_ID');
    return;
  }

  try {
    console.log('Started refreshing application (/) commands.');

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commandsData = Array.from(commands.values()).map(command => command.data.toJSON());

    // If GUILD_ID is specified, register commands to a specific guild for faster development
    if (process.env.GUILD_ID && process.env.NODE_ENV === 'development') {
      await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
        { body: commandsData },
      );
      console.log(
        `Successfully reloaded application (/) commands for guild ${process.env.GUILD_ID}.`,
      );
    } else {
      // Register globally
      await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID), {
        body: commandsData,
      });
      console.log('Successfully reloaded application (/) commands globally.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};
