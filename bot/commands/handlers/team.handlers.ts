import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handleCreateTeam,
  handleViewTeam,
  handleAddMember,
  handleRemoveMember,
  handleUpdateMember,
  handleTransferCaptain,
} from '../commands/team.commands';

type TeamSubcommand =
  | 'create'
  | 'view'
  | 'add_member'
  | 'remove_member'
  | 'update_member'
  | 'transfer_captain';

const handlers: Record<
  TeamSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  create: handleCreateTeam,
  view: handleViewTeam,
  add_member: handleAddMember,
  remove_member: handleRemoveMember,
  update_member: handleUpdateMember,
  transfer_captain: handleTransferCaptain,
};

export const handleTeamCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as TeamSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing team ${subcommand} command:`, error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
