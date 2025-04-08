import { ObjectId } from 'mongoose';
import { ITournament } from '../database/models';
import { ITeamTournament } from '../database/models/team-tournament.model';
import { ForfeitResult } from '../types/forfeit-result.types';

export const getTeamTournament = (tournamentId: ObjectId, tournaments: ITeamTournament[]) => {
  const tournament = tournaments.find(
    tournament => tournament.tournament.toString() === tournamentId.toString(),
  );
  return tournament;
};

export const calculateForfeitResult = (
  tournament: ITournament,
  winnerTeamId: string,
  forfeiterTeamId: string,
): ForfeitResult => {
  // Get match format (BO1, BO3, BO5, etc.) from tournament rules
  const matchFormat = tournament.format;

  // Extract the number from the format (e.g., 3 from BO3)
  const matches = parseInt(matchFormat.replace('B0', ''), 10);

  // Calculate the minimum number of wins needed
  const winsNeeded = Math.ceil(matches / 2);

  // Create the score string (e.g., "2-0" for BO3, "3-0" for BO5)
  const score = `${winsNeeded}-0`;

  // Create the games array with the appropriate number of entries
  const games = Array(winsNeeded)
    .fill(null)
    .map(() => ({
      winner: winnerTeamId,
      loser: forfeiterTeamId,
      duration: 0, // Set to 0 to indicate a forfeit
    }));

  return {
    score,
    games,
  };
};
