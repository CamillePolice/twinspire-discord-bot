import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handleChallenge,
  handleProposeDates,
  handleScheduleChallenge,
  handleSubmitResult,
} from '../commands/challenge.commands';

type ChallengeSubcommand = 'challenge' | 'propose_dates' | 'schedule' | 'submit_result';

const handlers: Record<
  ChallengeSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  challenge: handleChallenge,
  propose_dates: handleProposeDates,
  schedule: handleScheduleChallenge,
  submit_result: handleSubmitResult,
};

export const handleChallengeCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as ChallengeSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing challenge ${subcommand} command:`, error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
