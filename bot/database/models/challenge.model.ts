import { Schema, model, Model } from 'mongoose';
import { ITeamTournament } from './team-tournament.model';

const challengeSchema: Schema = new Schema(
  {
    challengeId: {
      type: String,
      required: true,
    },
    tournamentId: {
      type: String,
      required: true,
    },
    challengerTeamTournament: {
      type: Schema.Types.ObjectId,
      ref: 'TeamTournament',
      required: true,
    },
    defendingTeamTournament: {
      type: Schema.Types.ObjectId,
      ref: 'TeamTournament',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled', 'forfeited'],
      required: true,
    },
    scheduledDate: {
      type: Date,
    },
    proposedDates: {
      type: [Date],
    },
    result: {
      winner: {
        type: String,
        required: true,
      },
      score: {
        type: String,
        required: true,
      },
      games: [
        {
          winner: {
            type: String,
            required: true,
          },
          loser: {
            type: String,
            required: true,
          },
          duration: {
            type: Number,
          },
        },
      ],
    },
    tierBefore: {
      challenger: {
        type: Number,
        required: true,
      },
      defending: {
        type: Number,
        required: true,
      },
    },
    tierAfter: {
      challenger: {
        type: Number,
      },
      defending: {
        type: Number,
      },
    },
    prestigeAwarded: {
      challenger: {
        type: Number,
      },
      defending: {
        type: Number,
      },
    },
    castDemand: {
      type: Boolean,
      default: false,
    },
    unfairForfeit: {
      type: Boolean,
      default: false,
    },
    forfeitType: {
      type: String,
      enum: ['no_show', 'give_up'],
    },
    forfeitPenalty: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Challenge-specific interfaces
interface IGame {
  winner: string;
  loser: string;
  duration?: number;
}

interface IResult {
  winner: string;
  score: string;
  games: IGame[];
}

interface ITier {
  challenger: number;
  defending: number;
}

interface IPrestige {
  challenger: number;
  defending: number;
}

// Interface for the document
export interface IChallenge {
  _id: Schema.Types.ObjectId;
  challengeId: string;
  tournamentId: string;
  challengerTeamTournament: ITeamTournament;
  defendingTeamTournament: ITeamTournament;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'forfeited';
  scheduledDate?: Date;
  proposedDates?: Date[];
  result?: IResult;
  tierBefore: ITier;
  tierAfter?: ITier;
  prestigeAwarded?: IPrestige;
  castDemand: boolean;
  unfairForfeit?: boolean;
  forfeitType?: 'no_show' | 'give_up';
  forfeitPenalty?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IChallengeModel = Model<IChallenge>;

export default model<IChallenge, IChallengeModel>('Challenge', challengeSchema);
