// src/commands/ping.ts
import { CacheType, CommandInteraction, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and latency information'),

  async execute(interaction: CommandInteraction<CacheType>) {
    // First send a reply to acknowledge the command
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });

    // Calculate the latency
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    // Edit the reply with the calculated latency
    await interaction.editReply(
      `Pong! 🏓\nBot Latency: ${latency}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`,
    );
  },
};
