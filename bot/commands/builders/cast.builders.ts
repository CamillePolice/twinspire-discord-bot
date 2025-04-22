import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { SubcommandBuilder, TournamentCommandBuilder } from '../types';
import { MatchType } from '../../database/enums/match.enums';
import { TournamentFormat } from '../../database/enums/tournament-format.enums';
import { handleCastCommand } from '../handlers/cast.handlers';

const buildCastSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('create')
      .setDescription('Create a cast demand')
      .addStringOption(option =>
        option
          .setName('event_type')
          .setDescription('Type of event')
          .setRequired(true)
          .addChoices(
            { name: 'OUAT', value: MatchType.OUAT },
            { name: 'Ligue interne', value: MatchType.LIGUE_INTERNE },
            { name: 'Scrim', value: MatchType.SCRIM },
            { name: 'Autre Tournoi', value: MatchType.OTHER },
          ),
      )
      .addStringOption(option =>
        option
          .setName('opponent_team')
          .setDescription('Name of the opponent team')
          .setRequired(true),
      )
      .addStringOption(option =>
        option.setName('date').setDescription('Date of the match (DD/MM)').setRequired(true),
      )
      .addStringOption(option =>
        option.setName('time').setDescription('Time of the match (HH:MM)').setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('game_mode')
          .setDescription('Game mode (Fearless or other)')
          .setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('match_format')
          .setDescription('Match format')
          .setRequired(true)
          .addChoices(
            { name: 'Bo1', value: TournamentFormat.B01 },
            { name: 'Bo3', value: TournamentFormat.B03 },
            { name: 'Bo5', value: TournamentFormat.B05 },
          ),
      )
      .addStringOption(option =>
        option
          .setName('opponent_opgg')
          .setDescription('OP.GG link of the opponent team')
          .setRequired(true),
      )
      .addAttachmentOption(option =>
        option
          .setName('opponent_logo')
          .setDescription('Logo of the opponent team')
          .setRequired(true),
      ),
};

export const buildCastCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('cast')
    .setDescription('Cast commands')
    .addSubcommand(buildCastSubcommand.build) as SlashCommandBuilder,
  execute: handleCastCommand.execute,
};
