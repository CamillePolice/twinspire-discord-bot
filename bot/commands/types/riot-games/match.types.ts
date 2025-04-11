import { IParticipant } from './participant.types';

export type IMatchInfo = {
  gameDuration: number;
  gameCreation: number;
  queueId: number;
  participants: IParticipant[];
};

export type IMatch = {
  info: IMatchInfo;
};
