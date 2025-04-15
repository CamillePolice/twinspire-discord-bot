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
      )
      .addStringOption(option =>
        option
          .setName('discord_role')
          .setDescription('The Discord role for the team (mention or name)')
          .setRequired(false),
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
        option.setName('opgg').setDescription('OP.GG link').setRequired(true),
      )
      .addStringOption(option =>
        option
          .setName('role')
          .setDescription('Role within the team')
          .setRequired(true)
          .addChoices(
            { name: 'Top', value: Role.TOP },
            { name: 'Jungle', value: Role.JUNGLE },
            { name: 'Mid', value: Role.MID },
            { name: 'ADC', value: Role.ADC },
            { name: 'Support', value: Role.SUPPORT },
            { name: 'Fill', value: Role.FILL },
            { name: 'Little Legend', value: Role.LITTLE_LEGEND },
            { name: 'Coach', value: Role.COACH },
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
            { name: 'Little Legend', value: Role.LITTLE_LEGEND },
            { name: 'Coach', value: Role.COACH },
            { name: 'Manager', value: Role.MANAGER },
          ),
      )
      .addStringOption(option =>
        option.setName('opgg').setDescription('OP.GG link').setRequired(true),
      ),
};

const buildTransferCaptainSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('transfer_captain')
      .setDescription('Transfer the captain role to another team member')
      .addUserOption(option =>
        option
          .setName('new_captain')
          .setDescription('User to transfer captain role to')
          .setRequired(true),
      ),
};

const buildUpdateTeamSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('update')
      .setDescription('Update team information')
      .addStringOption(option =>
        option
          .setName('team_name')
          .setDescription('Team name to update')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option.setName('new_name').setDescription('New team name').setRequired(false),
      )
      .addStringOption(option =>
        option.setName('discord_role').setDescription('Discord role to update').setRequired(false),
      ),
};

const buildChallengeSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('challenge')
      .setDescription('Challenge another team')
      .addStringOption(option =>
        option
          .setName('defending_team')
          .setDescription('Team ID to challenge')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption(option =>
        option.setName('tournament_id').setDescription('Tournament ID').setRequired(true),
      )
      .addBooleanOption(option =>
        option
          .setName('cast_demand')
          .setDescription('Cast a demand for the challenge')
          .setRequired(false),
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
      .addIntegerOption(option =>
        option
          .setName('date_option')
          .setDescription('Select which proposed date to schedule')
          .setRequired(true)
          .addChoices(
            { name: 'Option 1', value: 1 },
            { name: 'Option 2', value: 2 },
            { name: 'Option 3', value: 3 },
          ),
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
      )
      .addStringOption(option =>
        option
          .setName('score')
          .setDescription('Score of the challenge')
          .setRequired(true)
          .addChoices(
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
      )
      .addBooleanOption(option =>
        option
          .setName('no_show')
          .setDescription('Mark as no-show (deducts 15 points from the losing team)')
          .setRequired(false),
      )
      .addBooleanOption(option =>
        option
          .setName('give_up')
          .setDescription('Mark as give-up (deducts 20 points from the losing team)')
          .setRequired(false),
      ),
};

export const buildTeamCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team commands')
    .addSubcommand(buildCreateTeamSubcommand.build)
    .addSubcommand(buildViewTeamSubcommand.build)
    .addSubcommand(buildAddMemberSubcommand.build)
    .addSubcommand(buildRemoveMemberSubcommand.build)
    .addSubcommand(buildUpdateMemberSubcommand.build)
    .addSubcommand(buildTransferCaptainSubcommand.build)
    .addSubcommand(buildUpdateTeamSubcommand.build)
    .addSubcommand(buildChallengeSubcommand.build)
    .addSubcommand(buildProposeDatesSubcommand.build)
    .addSubcommand(buildScheduleChallengeSubcommand.build)
    .addSubcommand(buildSubmitResultSubcommand.build) as SlashCommandBuilder,
  execute: handleTeamCommand.execute,
};
