import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

export interface Command<T = unknown> {
  data: SlashCommandBuilder;
  execute: (interaction: T) => Promise<void>;
}

export interface CommandBuilder<T = unknown> {
  data: SlashCommandBuilder;
  execute: (interaction: T) => Promise<void>;
}

export interface CommandHandler<T = unknown> {
  execute: (interaction: T) => Promise<void>;
}

export interface TournamentCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface SubcommandBuilder {
  build: (subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
}

export interface TournamentCommandBuilder {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface TournamentCommandHandler {
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
