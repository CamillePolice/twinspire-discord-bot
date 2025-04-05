import { Schema, model, Model } from 'mongoose';
import { TournamentFormat } from '../enums/tournament-format.enums';
import { TournamentStatus } from '../enums/tournament-status.enums';
const tournamentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    game: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['BO1', 'BO3', 'BO5'],
      required: true,
    },
    maxTiers: {
      type: Number,
      required: true,
    },
    tierLimits: {
      type: [Number],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      required: true,
    },
    rules: {
      challengeTimeframeInDays: {
        type: Number,
        required: true,
      },
      protectionDaysAfterDefense: {
        type: Number,
        required: true,
      },
      maxChallengesPerMonth: {
        type: Number,
        required: true,
      },
      minRequiredDateOptions: {
        type: Number,
        required: true,
      },
    },
    rewards: {
      first: {
        type: Number,
        required: true,
      },
      second: {
        type: Number,
        required: true,
      },
      third: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Tournament-specific interfaces
interface IRules {
  challengeTimeframeInDays: number;
  protectionDaysAfterDefense: number;
  maxChallengesPerMonth: number;
  minRequiredDateOptions: number;
}

interface IRewards {
  first: number;
  second: number;
  third: number;
}

// Interface for the document
export interface ITournament {
  _id: Schema.Types.ObjectId;
  name: string;
  description?: string;
  game: string;
  format: TournamentFormat;
  maxTiers: number;
  tierLimits: number[];
  startDate: Date;
  endDate: Date;
  status: TournamentStatus;
  rules: IRules;
  rewards: IRewards;
  createdAt: Date;
  updatedAt: Date;
}

export type ITournamentModel = Model<ITournament>;

export default model<ITournament, ITournamentModel>('Tournament', tournamentSchema);
