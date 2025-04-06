import { SlashCommandBuilder, SlashCommandSubcommandBuilder, CommandInteraction } from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';
import { Role } from '../../../database/enums/role.enums';

const buildCreateTeamSubcommand: SubcommandBuilder = {
  build: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('create')
      .setDescription('Create a new team')
      .addStringOption(option =>
        option.setName('name').setDescription('Team name').setRequired(true),
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

export const buildTeamManagementCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('team-management')
    .setDescription('Team management commands')
    .addSubcommand(buildCreateTeamSubcommand.build)
    .addSubcommand(buildViewTeamSubcommand.build)
    .addSubcommand(buildAddMemberSubcommand.build)
    .addSubcommand(buildRemoveMemberSubcommand.build)
    .addSubcommand(buildUpdateMemberSubcommand.build)
    .addSubcommand(buildTransferCaptainSubcommand.build) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    // Implementation will be added in the commands file
    await interaction.reply({
      content: 'This command is handled by the team management commands handler.',
      ephemeral: true,
    });
  },
};
