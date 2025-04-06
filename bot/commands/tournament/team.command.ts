import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { logger } from '../../utils/logger.utils';
import {
  handleCreateTeam,
  handleViewTeam,
  handleAddMember,
  handleRemoveMember,
  handleUpdateMember,
  handleTransferCaptain,
} from './team-management.command';
import {
  handleChallenge,
  handleProposeDates,
  handleScheduleChallenge,
  handleSubmitResult,
} from './team-challenge.command';
import { Role } from '../../database/enums/role.enums';

/**
 * Defines team command structure and routes subcommands to appropriate handlers
 */
export default {
  data: buildTeamCommand(),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      await executeSubcommand(interaction, subcommand);
    } catch (error) {
      logger.error(`Error executing team ${subcommand} command:`, error as Error);
      await interaction.reply({
        content: 'An error occurred while processing the command. Please try again later.',
        ephemeral: true,
      });
    }
  },
};

/**
 * Builds the team command structure with all subcommands
 * @returns SlashCommandBuilder with configured subcommands
 */
function buildTeamCommand() {
  return new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team management commands')
    .addSubcommand(buildCreateTeamSubcommand)
    .addSubcommand(buildViewTeamSubcommand)
    .addSubcommand(buildAddMemberSubcommand)
    .addSubcommand(buildRemoveMemberSubcommand)
    .addSubcommand(buildUpdateMemberSubcommand)
    .addSubcommand(buildTransferCaptainSubcommand)
    .addSubcommand(buildChallengeSubcommand)
    .addSubcommand(buildProposeDatesSubcommand)
    .addSubcommand(buildScheduleChallengeSubcommand)
    .addSubcommand(buildSubmitResultSubcommand);
}

/**
 * Routes the interaction to the appropriate handler based on subcommand
 * @param interaction The interaction to handle
 * @param subcommand The subcommand to execute
 */
async function executeSubcommand(
  interaction: ChatInputCommandInteraction,
  subcommand: string,
): Promise<void> {
  const handlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    create: handleCreateTeam,
    view: handleViewTeam,
    add_member: handleAddMember,
    remove_member: handleRemoveMember,
    update_member: handleUpdateMember,
    transfer_captain: handleTransferCaptain,
    challenge: handleChallenge,
    propose_dates: handleProposeDates,
    schedule: handleScheduleChallenge,
    submit_result: handleSubmitResult,
  };

  const handler = handlers[subcommand];
  if (handler) {
    await handler(interaction);
  } else {
    await interaction.reply({
      content: 'Unknown subcommand. Please try a valid team command.',
      ephemeral: true,
    });
  }
}

// Subcommand builders

function buildCreateTeamSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
    .setName('create')
    .setDescription('Create a new team')
    .addStringOption(option =>
      option.setName('name').setDescription('Team name').setRequired(true),
    );
}

function buildViewTeamSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
    .setName('view')
    .setDescription('View team details')
    .addStringOption(option =>
      option
        .setName('team_name')
        .setDescription('Team Name')
        .setRequired(false)
        .setAutocomplete(true),
    );
}

function buildAddMemberSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
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
    );
}

function buildRemoveMemberSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
    .setName('remove_member')
    .setDescription('Remove a member from your team')
    .addUserOption(option =>
      option.setName('user').setDescription('User to remove from the team').setRequired(true),
    );
}

function buildUpdateMemberSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
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
    );
}

function buildTransferCaptainSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
    .setName('transfer_captain')
    .setDescription('Transfer the captain role to another team member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to transfer captain role to').setRequired(true),
    );
}

function buildChallengeSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
    .setName('challenge')
    .setDescription('Challenge another team')
    .addStringOption(option =>
      option
        .setName('team_id')
        .setDescription('Team ID to challenge')
        .setRequired(true)
        .setAutocomplete(true),
    );
}

function buildProposeDatesSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
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
    );
}

function buildScheduleChallengeSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
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
      option.setName('date').setDescription('Scheduled date (YYYY-MM-DD HH:MM)').setRequired(true),
    );
}

function buildSubmitResultSubcommand(subcommand: SlashCommandSubcommandBuilder) {
  return subcommand
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
        .setName('winner')
        .setDescription('Winner of the challenge')
        .setRequired(true)
        .addChoices(
          { name: 'Your Team', value: 'challenger' },
          { name: 'Opponent Team', value: 'defending' },
        ),
    )
    .addStringOption(option =>
      option.setName('score').setDescription('Match score (e.g., 2-1)').setRequired(true),
    );
}
