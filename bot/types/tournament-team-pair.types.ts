import { ITeamTournament } from '../database/models/team-tournament.model';

export type TeamTournamentPair = {
  challengerTeamTournament: ITeamTournament;
  defendingTeamTournament: ITeamTournament;
};
