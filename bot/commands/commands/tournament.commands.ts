// src/commands/commands/tournament.commands.ts
import { handleCreateTournament } from './commands/tournament/tournament-create.command';
import { handleViewTournament } from './commands/tournament/tournament-view.command';
import { handleListTournaments } from './commands/tournament/tournament-list.command';
import { handleUpdateStatus } from './commands/tournament/tournament-status.command';
import { handleViewStandings } from './commands/tournament/tournament-standings.command';

export {
  handleCreateTournament,
  handleViewTournament,
  handleListTournaments,
  handleUpdateStatus,
  handleViewStandings,
};
