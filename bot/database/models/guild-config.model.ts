import { Schema, model, Model } from 'mongoose';

const guildConfigSchema: Schema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    guildName: {
      type: String,
      required: true,
    },
    memberCount: {
      type: Number,
      required: true,
      default: 0,
    },
    prefix: {
      type: String,
      required: true,
      default: '!',
    },
    welcomeChannelId: {
      type: String,
      default: null,
    },
    logChannelId: {
      type: String,
      default: null,
    },
    moderationRoles: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    settings: {
      autoSyncMembers: {
        type: Boolean,
        default: false,
      },
      enableLogging: {
        type: Boolean,
        default: true,
      },
      enableWelcomeMessages: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Interface for guild settings
export interface IGuildSettings {
  autoSyncMembers: boolean;
  enableLogging: boolean;
  enableWelcomeMessages: boolean;
}

// Interface for the document
export interface IGuildConfig {
  _id: Schema.Types.ObjectId;
  guildId: string; // The ID of the guild coming from discord
  guildName: string;
  memberCount: number;
  prefix: string;
  welcomeChannelId: string | null;
  logChannelId: string | null;
  moderationRoles: string[];
  active: boolean;
  settings: IGuildSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type IGuildConfigModel = Model<IGuildConfig>;

export default model<IGuildConfig, IGuildConfigModel>('GuildConfig', guildConfigSchema);
