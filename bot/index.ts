import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { commands, loadCommands, registerCommands } from './commands';
import { connectToDatabase } from './database/connection';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  logger.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

if (!process.env.APPLICATION_ID) {
  logger.error('Missing APPLICATION_ID environment variable');
  process.exit(1);
}

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error as Error);
    const content = 'There was an error executing this command!';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});

// When the client is ready, load and register commands
client.once(Events.ClientReady, async readyClient => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);

  // Load all command modules
  await loadCommands();

  // Register commands with Discord API
  await registerCommands(client);

  // Log guild information
  logger.info(`Bot is in ${readyClient.guilds.cache.size} guilds`);
});

// Start the bot
(async () => {
  try {
    // Connect to MongoDB first
    await connectToDatabase();
    
    // Then login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
    logger.info('Bot successfully started');
  } catch (error) {
    logger.error('Failed to start the bot:', error as Error);
  }
})();