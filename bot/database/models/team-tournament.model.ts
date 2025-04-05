import { ObjectId } from 'mongodb';
import { Schema, model, Model } from 'mongoose';

const teamTournamentSchema: Schema = new Schema(
  {
    team: {
      type: ObjectId,
      required: true,
    },
    tournament: {
      type: ObjectId,
      required: true,
    },
    tier: {
      type: Number,
      required: true,
    },
    prestige: {
      type: Number,
      required: true,
      default: 0,
    },
    wins: {
      type: Number,
      required: true,
      default: 0,
    },
    losses: {
      type: Number,
      required: true,
      default: 0,
    },
    winStreak: {
      type: Number,
      required: true,
      default: 0,
    },
    protectedUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Interface for the document
export interface ITeamTournament {
  _id: Schema.Types.ObjectId;
  team: Schema.Types.ObjectId;
  tournament: Schema.Types.ObjectId;
  tier: number;
  prestige: number;
  wins: number;
  losses: number;
  winStreak: number;
  protectedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ITeamTournamentModel = Model<ITeamTournament>;

export default model<ITeamTournament, ITeamTournamentModel>('TeamTournament', teamTournamentSchema);
