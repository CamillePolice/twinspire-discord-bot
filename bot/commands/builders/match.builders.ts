import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { SubcommandBuilder, TournamentCommandBuilder } from '../types';
import { MatchType } from '../../database/enums/match.enums';
import { handleMatchCommand } from '../handlers/match.handlers';

const buildMatchSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('record')
      .setDescription('Record a match result')
      .addStringOption(option =>
        option
          .setName('team1')
          .setDescription('First team name or role')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('team2')
          .setDescription('Second team name or role')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option.setName('score').setDescription('Match score').setRequired(true).addChoices(
          // Best of 1
          { name: '1-0', value: '1-0' },
          { name: '0-1', value: '0-1' },
          // Best of 3
          { name: '2-0', value: '2-0' },
          { name: '2-1', value: '2-1' },
          { name: '1-2', value: '1-2' },
          { name: '0-2', value: '0-2' },
          // Best of 5
          { name: '3-0', value: '3-0' },
          { name: '3-1', value: '3-1' },
          { name: '3-2', value: '3-2' },
          { name: '2-3', value: '2-3' },
          { name: '1-3', value: '1-3' },
          { name: '0-3', value: '0-3' },
        ),
      )
      .addStringOption(option =>
        option
          .setName('match_type')
          .setDescription('Type of match')
          .setRequired(true)
          .addChoices(
            { name: MatchType.OUAT, value: MatchType.OUAT },
            { name: MatchType.SCRIM, value: MatchType.SCRIM },
            { name: MatchType.OTHER, value: MatchType.OTHER },
          ),
      )
      .addStringOption(option =>
        option
          .setName('winner')
          .setDescription('Winning team')
          .setRequired(true)
          .addChoices({ name: 'Team 1', value: 'team1' }, { name: 'Team 2', value: 'team2' }),
      )
      .addStringOption(option =>
        option.setName('date').setDescription('Match date (DD/MM)').setRequired(false),
      )
      .addAttachmentOption(option =>
        option
          .setName('screenshot1')
          .setDescription('Screenshot of game 1 result')
          .setRequired(false),
      )
      .addAttachmentOption(option =>
        option
          .setName('screenshot2')
          .setDescription('Screenshot of game 2 result')
          .setRequired(false),
      )
      .addAttachmentOption(option =>
        option
          .setName('screenshot3')
          .setDescription('Screenshot of game 3 result')
          .setRequired(false),
      )
      .addAttachmentOption(option =>
        option
          .setName('screenshot4')
          .setDescription('Screenshot of game 4 result')
          .setRequired(false),
      )
      .addAttachmentOption(option =>
        option
          .setName('screenshot5')
          .setDescription('Screenshot of game 5 result')
          .setRequired(false),
      ),
};

export const buildMatchCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('Match commands')
    .addSubcommand(buildMatchSubcommand.build) as SlashCommandBuilder,
  execute: handleMatchCommand.execute,
};
