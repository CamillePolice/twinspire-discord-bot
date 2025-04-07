import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handleCreateTournament,
  handleViewTournament,
  handleListTournaments,
  handleUpdateStatus,
  handleViewStandings,
  handleAddTeamToTournament,
} from '../commands/tournament.commands';

type TournamentSubcommand = 'create' | 'view' | 'list' | 'status' | 'standings' | 'add_team';

const handlers: Record<
  TournamentSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  create: handleCreateTournament,
  view: handleViewTournament,
  list: handleListTournaments,
  status: handleUpdateStatus,
  standings: handleViewStandings,
  add_team: handleAddTeamToTournament,
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

      // Only try to reply if the interaction hasn't been replied to yet
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: `Error: ${errorMessage}`,
            ephemeral: true,
          });
        } catch (replyError) {
          logger.error('Failed to send error message:', replyError);
        }
      }
    }
  },
};
