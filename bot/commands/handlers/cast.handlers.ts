import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import { handleCast } from '../commands/cast.commands';

export const handleCastCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      await handleCast(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Error executing cast command:', error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
