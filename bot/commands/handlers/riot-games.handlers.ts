import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handlePlayerRank,
  handlePlayerHistory,
  handleVerifyMatch,
  handleTeamRanks,
} from '../commands/riot-games.commands';

type RiotGamesSubcommand = 'rank' | 'history' | 'verify_match' | 'team_ranks';

const handlers: Record<
  RiotGamesSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  rank: handlePlayerRank,
  history: handlePlayerHistory,
  verify_match: handleVerifyMatch,
  team_ranks: handleTeamRanks,
};

export const handleRiotGamesCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as RiotGamesSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing riot games ${subcommand} command:`, error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error: ${errorMessage}`,
          ephemeral: true,
        });
      } else {
        await interaction.editReply(`Error: ${errorMessage}`);
      }
    }
  },
};
