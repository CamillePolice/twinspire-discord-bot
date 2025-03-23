import { SlashCommandBuilder } from 'discord.js';
import { Command } from './index';

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and latency information'),
  
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    await interaction.editReply(
      `Pong! 🏓\nBot Latency: ${latency}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`
    );
  },
};

// Make sure to export as default
export default pingCommand;