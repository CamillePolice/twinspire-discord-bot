import { Schema, model } from 'mongoose';
import { MatchType } from '../enums/match.enums';
import { TournamentFormat } from '../enums/tournament-format.enums';

const castDemandSchema = new Schema({
  eventType: {
    type: String,
    enum: Object.values(MatchType),
    required: true,
  },
  opponentTeam: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  gameMode: {
    type: String,
    required: true,
  },
  matchFormat: {
    type: String,
    enum: Object.values(TournamentFormat),
    required: true,
  },
  opponentOpgg: {
    type: String,
    required: true,
  },
  opponentLogo: {
    type: String,
  },
  messageId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'CANCELLED'],
    default: 'PENDING',
  },
  teamDiscordRole: {
    type: String,
    required: true,
  },
  acceptedBy: {
    type: String,
  },
  eventId: {
    type: String,
  },
}, {
  timestamps: true,
});

export interface ICastDemand {
  _id?: string;
  eventType: MatchType;
  opponentTeam: string;
  date: string;
  time: string;
  gameMode: string;
  matchFormat: TournamentFormat;
  opponentOpgg: string;
  opponentLogo?: string;
  messageId: string;
  channelId: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED';
  teamDiscordRole: string;
  acceptedBy?: string;
  eventId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default model<ICastDemand>('CastDemand', castDemandSchema); 