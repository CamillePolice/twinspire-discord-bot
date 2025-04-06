import { TournamentCommand } from '../types';
import { buildMaintenanceCommand } from '../builders/tournament/maintenance.builders';
import {
  handleMaintenanceCommand,
  setMaintenanceScheduler,
} from '../handlers/maintenance.handlers';

const maintenanceCommand: TournamentCommand = {
  data: buildMaintenanceCommand.data,
  execute: handleMaintenanceCommand.execute,
};

export { setMaintenanceScheduler };
export default maintenanceCommand;
