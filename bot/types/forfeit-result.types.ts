/**
 * Calculates the appropriate forfeit result based on tournament format
 * @param tournament The tournament object
 * @param winnerTeamId ID of the team that won by forfeit
 * @param forfeiterTeamId ID of the team that forfeited
 * @returns Object containing score string and games array
 */
export interface ForfeitResult {
  score: string;
  games: { winner: string; loser: string; duration?: number }[];
}
