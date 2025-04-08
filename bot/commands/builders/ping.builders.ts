import { CacheType, CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CommandBuilder } from '../types';

export const buildPingCommand: CommandBuilder<CommandInteraction> = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and latency information'),
  execute: async (interaction: CommandInteraction<CacheType>) => {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! 🏓\nBot Latency: ${latency}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`,
    );
  },
};
