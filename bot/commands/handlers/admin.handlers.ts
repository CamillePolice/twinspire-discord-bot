import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentCommandHandler } from '../types';
import {
  handleViewChallenge,
  handleCheckTimeouts,
  handleForceResult,
  handleForfeit,
  handleCancel,
  handleAdminCreateTeam,
  handleAdminUpdateTeamMember,
  handleAdminRemoveTeamMember,
  handleAdminAddTeamMember,
} from '../commands/admin.commands';

type AdminSubcommand =
  | 'view'
  | 'check_timeouts'
  | 'force_result'
  | 'forfeit'
  | 'cancel'
  | 'create_team'
  | 'update_team_member'
  | 'remove_team_member'
  | 'add_team_member';

const handlers: Record<
  AdminSubcommand,
  (interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  view: handleViewChallenge,
  check_timeouts: handleCheckTimeouts,
  force_result: handleForceResult,
  forfeit: handleForfeit,
  cancel: handleCancel,
  create_team: handleAdminCreateTeam,
  update_team_member: handleAdminUpdateTeamMember,
  remove_team_member: handleAdminRemoveTeamMember,
  add_team_member: handleAdminAddTeamMember,
};

export const handleAdminCommand: TournamentCommandHandler = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand() as AdminSubcommand;

    try {
      const handler = handlers[subcommand];
      if (!handler) {
        throw new Error(`Invalid subcommand: ${subcommand}`);
      }

      await handler(interaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error(`Error executing admin ${subcommand} command:`, error);

      await interaction.reply({
        content: `Error: ${errorMessage}`,
        ephemeral: true,
      });
    }
  },
};
