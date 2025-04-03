import { ObjectId } from 'mongodb';

// Team member interface
export interface TeamMember {
  discordId: string;
  username: string;
  role?: string; // Optional role within team (e.g. "Top", "Jungle", etc.)
}

// Team interface
export interface Team {
  _id?: ObjectId;
  teamId: string;
  name: string;
  captainId: string; // Discord ID of the team captain
  members: TeamMember[];
  tier: number; // Current tier in the tournament (1 = highest, 5 = lowest)
  prestige: number; // Prestige points accumulated
  wins: number;
  losses: number;
  winStreak: number; // Current winning streak
  protectedUntil?: Date; // Date until team is protected from challenges
  createdAt: Date;
  updatedAt: Date;
}

// Challenge interface
export interface Challenge {
  _id?: ObjectId;
  challengeId: string;
  tournamentId: string;
  challengerTeamId: string; // Team that initiated the challenge
  defendingTeamId: string; // Team being challenged
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'forfeited';
  scheduledDate?: Date; // Date when the match is scheduled to be played
  proposedDates?: Date[]; // Dates proposed by the defending team
  result?: {
    winner: string; // Team ID of the winner
    score: string; // e.g. "2-1" for BO3
    games: {
      winner: string;
      loser: string;
      duration?: number; // Game duration in minutes
    }[];
  };
  tierBefore: {
    challenger: number;
    defending: number;
  };
  tierAfter?: {
    challenger: number;
    defending: number;
  };
  prestigeAwarded?: {
    challenger: number;
    defending: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Tournament interface
export interface Tournament {
  _id?: ObjectId;
  tournamentId: string;
  name: string;
  description?: string;
  game: string; // e.g. "League of Legends"
  format: string; // e.g. "BO3", "BO5"
  maxTiers: number; // Maximum number of tiers in the tournament
  tierLimits: number[]; // Array of team limits per tier, e.g. [1, 2, 4, 8, 16]
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
  rules: {
    challengeTimeframeInDays: number; // Days allowed to complete a challenge
    protectionDaysAfterDefense: number; // Days of protection after successful defense
    maxChallengesPerMonth: number; // Maximum number of challenges a team can initiate per month
    minRequiredDateOptions: number; // Minimum date options the defending team must provide
  };
  rewards: {
    first: number; // Prize for 1st place in currency units
    second: number; // Prize for 2nd place in currency units
    third: number; // Prize for 3rd place in currency units
  };
  createdAt: Date;
  updatedAt: Date;
}