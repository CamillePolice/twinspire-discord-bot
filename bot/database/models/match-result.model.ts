import { Schema, model, Types } from 'mongoose';
import { MatchType } from '../enums/match.enums';

export interface IMatchResult {
  team1: {
    name: string;
    teamId?: Types.ObjectId;
  };
  team2: {
    name: string;
    teamId?: Types.ObjectId;
  };
  score: string;
  matchType: MatchType;
  winner: string;
  date: Date;
  screenshots?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const matchResultSchema = new Schema<IMatchResult>(
  {
    team1: {
      name: { type: String, required: true },
      teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    },
    team2: {
      name: { type: String, required: true },
      teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    },
    score: { type: String, required: true },
    matchType: { type: String, enum: Object.values(MatchType), required: true },
    winner: { type: String, required: true },
    date: { type: Date, required: true },
    screenshots: [{ type: String }],
  },
  {
    timestamps: true,
  },
);

export const MatchResult = model<IMatchResult>('MatchResult', matchResultSchema);
