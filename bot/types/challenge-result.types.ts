export type ChallengeResult = {
  winner: string;
  score: string;
  games: { winner: string; loser: string; duration?: number }[];
};
