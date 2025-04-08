import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  CommandInteraction,
} from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';

const buildSetChannelSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('set_channel')
      .setDescription('Set the channel for tournament maintenance notifications')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel to send maintenance notifications to')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      ),
};

const buildRunSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand.setName('run').setDescription('Run tournament maintenance tasks manually'),
};

const buildStatusSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand.setName('status').setDescription('View the current maintenance settings and status'),
};

export const buildMaintenanceCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Configure tournament maintenance settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(buildSetChannelSubcommand.build)
    .addSubcommand(buildRunSubcommand.build)
    .addSubcommand(buildStatusSubcommand.build) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    // Implementation will be added in the commands file
    await interaction.reply({
      content: 'This command is handled by the maintenance commands handler.',
      ephemeral: true,
    });
  },
};
