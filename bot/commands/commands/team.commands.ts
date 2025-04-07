import { handleCreateTeam } from './commands/team/create-team.command';
import { handleViewTeam } from './commands/team/view-team.command';
import { handleAddMember } from './commands/add-member.command';
import { handleRemoveMember } from './commands/remove-member.command';
import { handleUpdateMember } from './commands/team/update-member.command';
import { handleTransferCaptain } from './commands/team/transfer-captain.command';

export {
  handleCreateTeam,
  handleViewTeam,
  handleAddMember,
  handleRemoveMember,
  handleUpdateMember,
  handleTransferCaptain,
};
