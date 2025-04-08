import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';
import { TournamentFormat } from '../../../database/enums/tournament-format.enums';
import { GameSupported } from '../../../database/enums/game-supported.enums';
import { handleTournamentCommand } from '../../handlers/tournament.handlers';

const buildCreateSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('create')
      .setDescription('Create a new tournament')
      .addStringOption(option =>
        option.setName('name').setDescription('Tournament name').setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('game')
          .setDescription('Target gamefor the tournament (LoL/Dota...)')
          .setRequired(true)
          .addChoices(
            { name: 'LoL', value: GameSupported.LOL },
            { name: 'Dota', value: GameSupported.DOTA },
            { name: 'TFT', value: GameSupported.TFT },
          ),
      )
      .addStringOption(option =>
        option
          .setName('format')
          .setDescription('Match format (e.g., BO3)')
          .setRequired(true)
          .addChoices(
            { name: 'B01', value: TournamentFormat.B01 },
            { name: 'B03', value: TournamentFormat.B03 },
            { name: 'B05', value: TournamentFormat.B05 },
          ),
      )
      .addIntegerOption(option =>
        option
          .setName('tiers')
          .setDescription('Number of tiers in the tournament')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10),
      )
      .addStringOption(option =>
        option.setName('start_date').setDescription('Start date (YYYY-MM-DD)').setRequired(true),
      )
      .addStringOption(option =>
        option.setName('end_date').setDescription('End date (YYYY-MM-DD)').setRequired(true),
      )
      .addStringOption(option =>
        option.setName('description').setDescription('Tournament description').setRequired(false),
      ),
};

const buildViewSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('view')
      .setDescription('View tournament details')
      .addStringOption(option =>
        option
          .setName('tournament_id')
          .setDescription('Tournament ID')
          .setRequired(false)
          .setAutocomplete(true),
      ),
};

const buildListSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand.setName('list').setDescription('List all tournaments'),
};

const buildStatusSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('status')
      .setDescription('Update tournament status')
      .addStringOption(option =>
        option
          .setName('tournament_id')
          .setDescription('Tournament ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('status')
          .setDescription('New status')
          .setRequired(true)
          .addChoices(
            { name: 'Upcoming', value: 'upcoming' },
            { name: 'Active', value: 'active' },
            { name: 'Completed', value: 'completed' },
          ),
      ),
};

const buildAddTeamToTournamentSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('add_team')
      .setDescription('Add a team to a tournament')
      .addStringOption(option =>
        option
          .setName('tournament_id')
          .setDescription('Tournament ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('team_id')
          .setDescription('Team ID to add')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addIntegerOption(option =>
        option
          .setName('tier')
          .setDescription('Starting tier for the team')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10),
      ),
};

const buildStandingsSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('standings')
      .setDescription('View tournament standings')
      .addStringOption(option =>
        option
          .setName('tournament_id')
          .setDescription('Tournament ID')
          .setRequired(true)
          .setAutocomplete(true),
      ),
};

export const buildTournamentCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(buildCreateSubcommand.build)
    .addSubcommand(buildViewSubcommand.build)
    .addSubcommand(buildListSubcommand.build)
    .addSubcommand(buildStatusSubcommand.build)
    .addSubcommand(buildAddTeamToTournamentSubcommand.build)
    .addSubcommand(buildStandingsSubcommand.build) as SlashCommandBuilder,
  execute: handleTournamentCommand.execute,
};
