import { ObjectId } from 'mongodb';
import { Schema, model, Model } from 'mongoose';
import { Role } from '../enums/role.enums';
import { ITeamTournament } from './team-tournament.model';

// Creating a schema for team member
const teamMemberSchema = new Schema(
  {
    discordId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        Role.TOP,
        Role.JUNGLE,
        Role.MID,
        Role.ADC,
        Role.SUPPORT,
        Role.FILL,
        Role.COACH,
        Role.LITTLE_LEGEND,
        Role.MANAGER,
      ],
    },
    isCaptain: {
      type: Boolean,
      default: false,
    },
    opgg: {
      type: String,
      default: '',
    },
    discordRole: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

const teamSchema: Schema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    captainId: {
      type: String,
      required: true,
    },
    members: {
      type: [teamMemberSchema],
      required: true,
    },
    tournaments: [
      {
        type: ObjectId,
        ref: 'TeamTournament',
      },
    ],
    discordRole: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Team-specific interfaces
export interface ITeamMember {
  _id?: Schema.Types.ObjectId;
  discordId: string;
  username: string;
  role?: string;
  isCaptain: boolean;
  opgg?: string;
}

// Interface for the document
export interface ITeam {
  _id?: Schema.Types.ObjectId;
  teamId: string; // ID used by users to identify the team
  name: string;
  captainId: string; // Discord ID of the team captain
  members: ITeamMember[];
  tournaments?: ITeamTournament[];
  discordRole?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ITeamModel = Model<ITeam>;

export default model<ITeam, ITeamModel>('Team', teamSchema);
