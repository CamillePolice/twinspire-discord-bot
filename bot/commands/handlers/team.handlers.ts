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
  handleUpdateTeam,
} from '../commands/team.commands';

import {
  handleChallenge,
  handleProposeDates,
  handleScheduleChallenge,
  handleSubmitResult,
} from '../commands/challenge.commands';

type TeamSubcommand =
  | 'create'
  | 'view'
  | 'add_member'
  | 'remove_member'
  | 'update_member'
  | 'transfer_captain'
  | 'update'
  | 'challenge'
  | 'propose_dates'
  | 'schedule'
  | 'submit_result';

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
  update: handleUpdateTeam,
  challenge: handleChallenge,
  propose_dates: handleProposeDates,
  schedule: handleScheduleChallenge,
  submit_result: handleSubmitResult,
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
