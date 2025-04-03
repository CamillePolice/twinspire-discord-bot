import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger';
import {
  handleCreateTeam,
  handleViewTeam,
  handleAddMember,
  handleRemoveMember,
  handleUpdateMember,
  handleTransferCaptain,
} from './teamManagement';
import {
  handleChallenge,
  handleProposeDates,
  handleScheduleChallenge,
  handleSubmitResult,
} from './teamChallenges';

export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team management commands')
    // Create a new team
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new team')
        .addStringOption(option =>
          option.setName('name').setDescription('Team name').setRequired(true),
        ),
    )
    // View team details
    .addSubcommand(subcommand =>
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
    )
    // Add a member to a team
    .addSubcommand(subcommand =>
      subcommand
        .setName('add_member')
        .setDescription('Add a member to your team')
        .addUserOption(option =>
          option.setName('user').setDescription('User to add to the team').setRequired(true),
        )
        .addStringOption(option =>
          option
            .setName('role')
            .setDescription('Role within the team (e.g., Top, Jungle, Mid, ADC, Support)')
            .setRequired(false),
        ),
    )
    // Remove a member from a team
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove_member')
        .setDescription('Remove a member from your team')
        .addUserOption(option =>
          option.setName('user').setDescription('User to remove from the team').setRequired(true),
        ),
    )
    // Update a member's role
    .addSubcommand(subcommand =>
      subcommand
        .setName('update_member')
        .setDescription('Update a team member\'s role')
        .addUserOption(option =>
          option.setName('user').setDescription('User to update').setRequired(true),
        )
        .addStringOption(option =>
          option
            .setName('role')
            .setDescription('New role within the team (e.g., Top, Jungle, Mid, ADC, Support)')
            .setRequired(true),
        ),
    )
    // Transfer captain role
    .addSubcommand(subcommand =>
      subcommand
        .setName('transfer_captain')
        .setDescription('Transfer the captain role to another team member')
        .addUserOption(option =>
          option.setName('user').setDescription('User to transfer captain role to').setRequired(true),
        ),
    )
    // Challenge another team
    .addSubcommand(subcommand =>
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
    )
    // Propose dates for a challenge
    .addSubcommand(subcommand =>
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
    )
    // Schedule a challenge
    .addSubcommand(subcommand =>
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
    )
    // Submit challenge result
    .addSubcommand(subcommand =>
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
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create':
          await handleCreateTeam(interaction);
          break;
        case 'view':
          await handleViewTeam(interaction);
          break;
        case 'add_member':
          await handleAddMember(interaction);
          break;
        case 'remove_member':
          await handleRemoveMember(interaction);
          break;
        case 'update_member':
          await handleUpdateMember(interaction);
          break;
        case 'transfer_captain':
          await handleTransferCaptain(interaction);
          break;
        case 'challenge':
          await handleChallenge(interaction);
          break;
        case 'propose_dates':
          await handleProposeDates(interaction);
          break;
        case 'schedule':
          await handleScheduleChallenge(interaction);
          break;
        case 'submit_result':
          await handleSubmitResult(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      logger.error(`Error executing team ${subcommand} command:`, error as Error);
      await interaction.reply({
        content: 'An error occurred while processing the command. Please check the logs.',
        ephemeral: true,
      });
    }
  },
};
