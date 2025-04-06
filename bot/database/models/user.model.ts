import { Schema, model, Model } from 'mongoose';

// Creating a schema for guild affiliation
const guildAffiliationSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    required: true,
  },
  nickname: {
    type: String,
  },
  roles: {
    type: [String],
    default: [],
  },
});

const userSchema: Schema = new Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      required: true,
      default: Date.now,
    },
    experience: {
      type: Number,
      required: true,
      default: 0,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
    guilds: {
      type: [guildAffiliationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// User-specific interfaces
export interface IGuildAffiliation {
  guildId: string;
  joinedAt: Date;
  nickname?: string;
  roles: string[];
}

// Interface for the document
export interface IUser {
  _id?: Schema.Types.ObjectId;
  discordId: string;
  username: string;
  joinedAt: Date;
  lastActive: Date;
  experience: number;
  level: number;
  guilds: IGuildAffiliation[];
}

export type IUserModel = Model<IUser>;

export default model<IUser, IUserModel>('User', userSchema);
