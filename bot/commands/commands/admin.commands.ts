import { handleChallenge } from './commands/challenge/challenge.command';
import { handleProposeDates } from './commands/challenge/propose-dates.command';
import { handleScheduleChallenge } from './commands/challenge/schedule.command';
import { handleSubmitResult } from './commands/challenge/submit-result.command';
import { handleViewChallenge } from './commands/challenge/view-challenge.command';
import { handleCheckTimeouts } from './commands/admin/check-timeouts.command';
import { handleForceResult } from './commands/admin/force-result.command';
import { handleForfeit } from './commands/admin/forfeit.command';
import { handleCancel } from './commands/admin/cancel.command';

export {
  handleChallenge,
  handleProposeDates,
  handleScheduleChallenge,
  handleSubmitResult,
  handleViewChallenge,
  handleCheckTimeouts,
  handleForceResult,
  handleForfeit,
  handleCancel,
};
