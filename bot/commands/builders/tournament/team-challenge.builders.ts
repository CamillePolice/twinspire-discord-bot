import { SlashCommandBuilder, SlashCommandSubcommandBuilder, CommandInteraction } from 'discord.js';
import { TournamentCommandBuilder, SubcommandBuilder } from '../../types';

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
};

export const buildTeamChallengeCommand: TournamentCommandBuilder = {
  data: new SlashCommandBuilder()
    .setName('team-challenge')
    .setDescription('Team challenge management commands')
    .addSubcommand(buildChallengeSubcommand.build)
    .addSubcommand(buildProposeDatesSubcommand.build)
    .addSubcommand(buildScheduleChallengeSubcommand.build)
    .addSubcommand(buildSubmitResultSubcommand.build) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    // Implementation will be added in the commands file
    await interaction.reply({
      content: 'This command is handled by the team challenge commands handler.',
      ephemeral: true,
    });
  },
};
