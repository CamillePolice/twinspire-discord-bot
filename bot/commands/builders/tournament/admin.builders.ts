import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';
import { handleAdminCommand } from '../../handlers/admin.handlers';
import { Role } from '../../../database/enums/role.enums';

const buildViewSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('view')
      .setDescription('View challenge details')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      ),
};

const buildCheckTimeoutsSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('check_timeouts')
      .setDescription('Check for challenges that have exceeded response time limits')
      .addStringOption(option =>
        option
          .setName('tournament_id')
          .setDescription('Tournament ID')
          .setRequired(true)
          .setAutocomplete(true),
      ),
};

const buildForceResultSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('force_result')
      .setDescription('Force a challenge result (admin decision)')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('winner')
          .setDescription('Winner of the challenge')
          .setRequired(true)
          .addChoices(
            { name: 'Challenger Team', value: 'challenger' },
            { name: 'Defending Team', value: 'defending' },
          ),
      )
      .addStringOption(option =>
        option.setName('score').setDescription('Match score (e.g., 2-1)').setRequired(true),
      )
      .addStringOption(option =>
        option.setName('reason').setDescription('Reason for admin decision').setRequired(true),
      ),
};

const buildForfeitSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('forfeit')
      .setDescription('Force a team to forfeit a challenge')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('forfeiter')
          .setDescription('Team that forfeits')
          .setRequired(true)
          .addChoices(
            { name: 'Challenger Team', value: 'challenger' },
            { name: 'Defending Team', value: 'defending' },
          ),
      )
      .addStringOption(option =>
        option.setName('reason').setDescription('Reason for forfeit').setRequired(true),
      ),
};

const buildCancelSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('cancel')
      .setDescription('Cancel a challenge (no tier changes)')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option.setName('reason').setDescription('Reason for cancellation').setRequired(true),
      ),
};

const buildCreateTeamSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('create_team')
      .setDescription('Create a new team (Admin only)')
      .addStringOption(option =>
        option.setName('name').setDescription('Name of the team').setRequired(true),
      )
      .addUserOption(option =>
        option
          .setName('captain')
          .setDescription('Discord user to be set as team captain')
          .setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('captain_role')
          .setDescription('Role of the captain in the team')
          .setRequired(true)
          .addChoices(
            { name: 'Top', value: Role.TOP },
            { name: 'Jungle', value: Role.JUNGLE },
            { name: 'Mid', value: Role.MID },
            { name: 'ADC', value: Role.ADC },
            { name: 'Support', value: Role.SUPPORT },
            { name: 'Fill', value: Role.FILL },
          ),
      )
      .addStringOption(option =>
        option
          .setName('captain_opgg')
          .setDescription('OP.GG profile URL of the captain')
          .setRequired(false),
      ),
};

export const buildAdminChallengeCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('admin-challenge')
    .setDescription('Admin commands for tournament challenge management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(buildViewSubcommand.build)
    .addSubcommand(buildCheckTimeoutsSubcommand.build)
    .addSubcommand(buildForceResultSubcommand.build)
    .addSubcommand(buildForfeitSubcommand.build)
    .addSubcommand(buildCancelSubcommand.build)
    .addSubcommand(buildCreateTeamSubcommand.build) as SlashCommandBuilder,
  execute: handleAdminCommand.execute,
};
