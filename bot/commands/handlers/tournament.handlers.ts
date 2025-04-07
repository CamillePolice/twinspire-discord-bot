import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handleCreateTournament,
  handleViewTournament,
  handleListTournaments,
  handleUpdateStatus,
  handleViewStandings,
} from '../commands/tournament.commands';

type TournamentSubcommand = 'create' | 'view' | 'list' | 'status' | 'standings';

const handlers: Record<
  TournamentSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  create: handleCreateTournament,
  view: handleViewTournament,
  list: handleListTournaments,
  status: handleUpdateStatus,
  standings: handleViewStandings,
};

export const handleTournamentCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as TournamentSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing tournament ${subcommand} command:`, error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
