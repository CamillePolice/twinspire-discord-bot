import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import { handleMatch } from '../commands/match.commands';

type MatchSubcommand = 'record';

const handlers: Record<
  MatchSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  record: handleMatch,
};

export const handleMatchCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as MatchSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing match ${subcommand} command:`, error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
