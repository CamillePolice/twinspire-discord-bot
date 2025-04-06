import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';
import { Role } from '../../../database/enums/role.enums';
import { handleTeamCommand } from '../../handlers/team.handlers';

const buildCreateTeamSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('create')
      .setDescription('Create a new team')
      .addStringOption(option =>
        option.setName('team_name').setDescription('Team name').setRequired(true),
      ),
};

const buildViewTeamSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('view')
      .setDescription('View team details')
      .addStringOption(option =>
        option
          .setName('team_name')
          .setDescription('Team Name')
          .setRequired(false)
          .setAutocomplete(true),
      ),
};

const buildAddMemberSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('add_member')
      .setDescription('Add a member to your team')
      .addUserOption(option =>
        option.setName('user').setDescription('User to add to the team').setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('role')
          .setDescription('Role within the team')
          .setRequired(false)
          .addChoices(
            { name: 'Top', value: Role.TOP },
            { name: 'Jungle', value: Role.JUNGLE },
            { name: 'Mid', value: Role.MID },
            { name: 'ADC', value: Role.ADC },
            { name: 'Support', value: Role.SUPPORT },
            { name: 'Fill', value: Role.FILL },
          ),
      ),
};

const buildRemoveMemberSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('remove_member')
      .setDescription('Remove a member from your team')
      .addUserOption(option =>
        option.setName('user').setDescription('User to remove from the team').setRequired(true),
      ),
};

const buildUpdateMemberSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('update_member')
      .setDescription("Update a team member's role")
      .addUserOption(option =>
        option.setName('user').setDescription('User to update').setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('role')
          .setDescription('New role within the team')
          .setRequired(true)
          .addChoices(
            { name: 'Top', value: Role.TOP },
            { name: 'Jungle', value: Role.JUNGLE },
            { name: 'Mid', value: Role.MID },
            { name: 'ADC', value: Role.ADC },
            { name: 'Support', value: Role.SUPPORT },
            { name: 'Fill', value: Role.FILL },
          ),
      ),
};

const buildTransferCaptainSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('transfer_captain')
      .setDescription('Transfer the captain role to another team member')
      .addUserOption(option =>
        option.setName('user').setDescription('User to transfer captain role to').setRequired(true),
      ),
};

const buildChallengeSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('challenge')
      .setDescription('Challenge another team')
      .addStringOption(option =>
        option
          .setName('team_id')
          .setDescription('Team ID to challenge')
          .setRequired(true)
          .setAutocomplete(true),
      ),
};

const buildProposeDatesSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('propose_dates')
      .setDescription('Propose dates for a challenge')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('date1')
          .setDescription('First proposed date (YYYY-MM-DD HH:MM)')
          .setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('date2')
          .setDescription('Second proposed date (YYYY-MM-DD HH:MM)')
          .setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('date3')
          .setDescription('Third proposed date (YYYY-MM-DD HH:MM)')
          .setRequired(true),
      ),
};

const buildScheduleChallengeSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('schedule')
      .setDescription('Schedule a challenge')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('date')
          .setDescription('Scheduled date (YYYY-MM-DD HH:MM)')
          .setRequired(true),
      ),
};

const buildSubmitResultSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('submit_result')
      .setDescription('Submit the result of a challenge')
      .addStringOption(option =>
        option
          .setName('challenge_id')
          .setDescription('Challenge ID')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option
          .setName('result')
          .setDescription('Result of the challenge')
          .setRequired(true)
          .addChoices({ name: 'Win', value: 'win' }, { name: 'Loss', value: 'loss' }),
      ),
};

export const buildTeamCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team management commands')
    .addSubcommand(buildCreateTeamSubcommand.build)
    .addSubcommand(buildViewTeamSubcommand.build)
    .addSubcommand(buildAddMemberSubcommand.build)
    .addSubcommand(buildRemoveMemberSubcommand.build)
    .addSubcommand(buildUpdateMemberSubcommand.build)
    .addSubcommand(buildTransferCaptainSubcommand.build)
    .addSubcommand(buildChallengeSubcommand.build)
    .addSubcommand(buildProposeDatesSubcommand.build)
    .addSubcommand(buildScheduleChallengeSubcommand.build)
    .addSubcommand(buildSubmitResultSubcommand.build) as SlashCommandBuilder,
  execute: handleTeamCommand.execute,
};
