import { ITeam } from '../database/models/team.model';

export type TeamPair = {
  challenger: ITeam;
  defending: ITeam;
};
