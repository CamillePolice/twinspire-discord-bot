import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../types';
import { handleRiotGamesCommand } from '../handlers/riot-games.handlers';

const buildRankSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('rank')
      .setDescription("Check a player's rank in League of Legends")
      .addStringOption(option =>
        option
          .setName('summoner_name')
          .setDescription('The summoner name to lookup')
          .setRequired(true),
      )
      .addStringOption(option =>
        option.setName('tag_line').setDescription("The tag after '#'").setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('region')
          .setDescription('The region to check (defaults to EUW)')
          .setRequired(false)
          .addChoices(
            { name: 'EUW', value: 'euw' },
            { name: 'NA', value: 'na' },
            { name: 'EUNE', value: 'eune' },
            { name: 'KR', value: 'kr' },
            { name: 'BR', value: 'br' },
            { name: 'JP', value: 'jp' },
            { name: 'RU', value: 'ru' },
            { name: 'TR', value: 'tr' },
            { name: 'LAN', value: 'lan' },
            { name: 'LAS', value: 'las' },
            { name: 'OCE', value: 'oce' },
          ),
      ),
};

const buildHistorySubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('history')
      .setDescription("Check a player's recent match history")
      .addStringOption(option =>
        option
          .setName('summoner_name')
          .setDescription('The summoner name to lookup')
          .setRequired(true),
      )
      .addStringOption(option =>
        option.setName('tag_line').setDescription("The tag after '#'").setRequired(true),
      )
      .addIntegerOption(option =>
        option
          .setName('count')
          .setDescription('Number of matches to show (1-10)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10),
      )
      .addStringOption(option =>
        option
          .setName('region')
          .setDescription('The region to check (defaults to EUW)')
          .setRequired(false)
          .addChoices(
            { name: 'EU', value: 'europe' },
            { name: 'AMERICA', value: 'americas' },
            { name: 'ESPORTS', value: 'esports' },
            { name: 'ASIA', value: 'asia' },
          ),
      ),
};

const buildVerifyMatchSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('verify_match')
      .setDescription('Verify a tournament match using Riot API')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID to verify')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('match_id')
          .setDescription('Riot match ID to verify (from League client match history)')
          .setRequired(true),
      ),
};

// Subcommand for checking a player's rank in a tournament team
const buildTeamRanksSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('team_ranks')
      .setDescription('Check all player ranks in a tournament team')
      .addStringOption(option =>
        option
          .setName('team_id')
          .setDescription('Team ID to check')
          .setRequired(true)
          .setAutocomplete(true),
      ),
};

export const buildRiotGamesCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('riot')
    .setDescription('Riot Games API integration commands')
    .addSubcommand(buildRankSubcommand.build)
    .addSubcommand(buildHistorySubcommand.build)
    .addSubcommand(buildVerifyMatchSubcommand.build)
    .addSubcommand(buildTeamRanksSubcommand.build) as SlashCommandBuilder,
  execute: handleRiotGamesCommand.execute,
};
