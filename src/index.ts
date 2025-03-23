import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { commands, loadCommands, registerCommands } from './commands';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

if (!process.env.APPLICATION_ID) {
  console.error('Missing APPLICATION_ID environment variable');
  process.exit(1);
}

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // If you need message content, make sure to enable it in Discord Developer Portal
    // GatewayIntentBits.GuildMessages,
    // GatewayIntentBits.MessageContent,
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
    console.error(`Error executing command ${interaction.commandName}:`, error);
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
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // Load all command modules
  await loadCommands();

  // Register commands with Discord API
  await registerCommands(client);
});

// Start the bot
(async () => {
  try {
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to start the bot:', error);
  }
})();
