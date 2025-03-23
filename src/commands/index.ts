import { Client, Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define command interface
export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: any) => Promise<void>;
}

// Initialize commands collection
export const commands = new Collection<string, Command>();

// Load commands from files
export const loadCommands = async () => {
  const commandsPath = path.join(__dirname, './');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => 
    file.endsWith('.ts') && !file.endsWith('index.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      // Dynamically import the command module
      const { default: command } = await import(filePath);
      
      if (command && 'data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
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

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commandsData = Array.from(commands.values()).map(command => command.data.toJSON());

    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commandsData },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
};