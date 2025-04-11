/* eslint-disable @typescript-eslint/no-explicit-any */
import { RiotAPI, RiotAPITypes } from '@fightmegg/riot-api';
import { logger } from '../../utils/logger.utils';
import { PlatformId } from '@fightmegg/riot-api';

/**
 * Service for interacting with the Riot Games API
 * This service handles requests to the Riot API for game data, summoner information, etc.
 */
export class RiotApiService {
  private api: RiotAPI;
  private readonly regions: Record<string, string> = {
    euw: 'euw1',
    na: 'na1',
    kr: 'kr',
    // Add other regions as needed
  };

  private defaultRegion: string = 'euw1'; // Default to EUW

  constructor() {
    const apiKey = 'RGAPI-4367c4e2-a797-4a15-bf87-34c003c00b78'; //process.env.RIOT_API_KEY;

    if (!apiKey) {
      throw new Error('RIOT_API_KEY is required in environment variables');
    }

    this.api = new RiotAPI(apiKey);
    logger.info('RiotApiService initialized');
  }

  /**
   * Get summoner information by summoner name
   * @param summonerName - The summoner name to look up
   * @param region - Optional region code (defaults to EUW)
   * @returns Summoner data or null if not found
   */
  async getSummonerByName(summonerName: string, tagLine: string, region?: string): Promise<any> {
    console.log(`LOG || getSummonerByName || region ->`, region);
    try {
      const regionCode = region ? this.regions[region] || this.defaultRegion : null;
      console.log(`LOG || getSummonerByName || regionCode ->`, regionCode);

      const summonerData = await this.api.account.getByRiotId({
        region:
          (region as
            | PlatformId.EUROPE
            | PlatformId.ASIA
            | PlatformId.AMERICAS
            | PlatformId.ESPORTS) || PlatformId.EUROPE,
        gameName: summonerName,
        tagLine: tagLine,
      });
      return summonerData;
    } catch (error: any) {
      if (error.status === 404) {
        logger.info(
          `Summoner "${summonerName}" not found in region ${region || this.defaultRegion}`,
        );
        return null;
      }

      logger.error(`Error fetching summoner data for "${summonerName}":`, error);
      throw error;
    }
  }

  /**
   * Get ranked information for a summoner
   * @param summonerId - The encrypted summoner ID
   * @param region - Optional region code (defaults to EUW)
   * @returns Array of ranked queue data or empty array if none found
   */
  async getRankedInfoBySummonerId(summonerId: string, region?: string): Promise<any[]> {
    try {
      const regionCode = region ? this.regions[region] || this.defaultRegion : this.defaultRegion;
      const rankedData = await this.api.league.getEntriesBySummonerId({
        region: regionCode as RiotAPITypes.LoLRegion,
        summonerId: summonerId,
      });

      return rankedData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error(`Error fetching ranked data for summoner ID "${summonerId}":`, error);
      throw error;
    }
  }

  /**
   * Get match details by match ID
   * @param matchId - The match ID to retrieve
   * @param region - Optional region code (defaults to EUW)
   * @returns Match data or null if not found
   */
  async getMatchById(matchId: string, region?: string): Promise<any> {
    try {
      const regionCode = region ? this.regions[region] || this.defaultRegion : this.defaultRegion;
      const routingValue = this.getRoutingValue(regionCode);

      const matchData = await this.api.matchV5.getMatchById({
        cluster: routingValue as
          | PlatformId.EUROPE
          | PlatformId.ASIA
          | PlatformId.SEA
          | PlatformId.AMERICAS,
        matchId,
      });

      return matchData;
    } catch (error: any) {
      if (error.status === 404) {
        logger.info(`Match "${matchId}" not found in region ${region || this.defaultRegion}`);
        return null;
      }

      logger.error(`Error fetching match data for match ID "${matchId}":`, error);
      throw error;
    }
  }

  /**
   * Get match IDs for a summoner's recent matches
   * @param puuid - The summoner's PUUID
   * @param count - Number of matches to retrieve (default: 5)
   * @param region - Optional region code (defaults to EUW)
   * @returns Array of match IDs
   */
  async getMatchIdsByPuuid(puuid: string, count: number = 5, region?: string): Promise<string[]> {
    try {
      const regionCode = region ? this.regions[region] || this.defaultRegion : this.defaultRegion;
      // For match history, you need to use the routing value which may be different from the region
      // For example: EUW, KR, and JP all use 'europe' for match history
      const routingValue = this.getRoutingValue(regionCode);

      const matchIds = await this.api.matchV5.getIdsByPuuid({
        cluster: routingValue as
          | PlatformId.EUROPE
          | PlatformId.ASIA
          | PlatformId.SEA
          | PlatformId.AMERICAS,
        puuid,
        params: {
          count,
        },
      });

      return matchIds;
    } catch (error: any) {
      logger.error(`Error fetching match IDs for puuid "${puuid}":`, error);
      throw error;
    }
  }

  /**
   * Get tournament match history by tournament code
   * This requires a tournament API key with proper permissions
   * @param tournamentCode - The Riot tournament code
   * @returns Array of match IDs for the tournament
   */
  async getTournamentMatchesByCode(tournamentCode: string): Promise<string[]> {
    try {
      const tournamentData = await this.api.tournamentV5.getByTournamentCode({
        tournamentCode,
      });

      // Convert tournament data to string array if needed
      // @ts-expect-error - The API returns a different type than expected
      return Array.isArray(tournamentData) ? tournamentData : [tournamentData];
    } catch (error: any) {
      logger.error(`Error fetching tournament matches for code "${tournamentCode}":`, error);
      throw error;
    }
  }

  /**
   * Helper function to map region codes to routing values
   * @param regionCode - The region code (e.g., 'euw1', 'na1')
   * @returns The routing value for that region (e.g., 'europe', 'americas')
   */
  private getRoutingValue(regionCode: string): string {
    // Map region codes to routing values
    const routingMap: Record<string, string> = {
      // Europe
      euw1: 'europe',
      eun1: 'europe',
      tr1: 'europe',
      ru: 'europe',
      // Americas
      na1: 'americas',
      br1: 'americas',
      la1: 'americas',
      la2: 'americas',
      // Asia
      kr: 'asia',
      jp1: 'asia',
      // Sea
      oc1: 'sea',
      ph2: 'sea',
      sg2: 'sea',
      th2: 'sea',
      tw2: 'sea',
      vn2: 'sea',
    };

    return routingMap[regionCode] || 'europe'; // Default to europe if not found
  }

  /**
   * Get the tier (rank) of a summoner for a specific queue
   * @param summonerName - The summoner name to look up
   * @param queue - The queue type (default: 'RANKED_SOLO_5x5')
   * @param region - Optional region code (defaults to EUW)
   * @returns Formatted tier string or 'Unranked' if not found
   */
  async getSummonerTier(
    summonerName: string,
    tagLine: string,
    queue: string = 'RANKED_SOLO_5x5',
    region?: string,
  ): Promise<string> {
    try {
      const summonerWithPuuid = await this.getSummonerByName(summonerName, tagLine, region);
      const summoner = await this.api.summoner.getByPUUID({
        region: 'euw1' as RiotAPITypes.LoLRegion,
        puuid: summonerWithPuuid.puuid,
      });

      if (!summoner) {
        return 'Summoner Not Found';
      }

      const rankedInfo = await this.getRankedInfoBySummonerId(summoner.id, region);

      if (!rankedInfo || rankedInfo.length === 0) {
        return 'Unranked';
      }

      // Find the specified queue
      const queueData = rankedInfo.find(queue_data => queue_data.queueType === queue);

      if (!queueData) {
        return 'Unranked';
      }

      return `${queueData.tier} ${queueData.rank} ${queueData.leaguePoints} LP`;
    } catch (error: any) {
      logger.error(`Error fetching tier for summoner "${summonerName}":`, error);
      return 'Error';
    }
  }

  /**
   * Verify that a match was played between two teams
   * @param matchId - The match ID to verify
   * @param team1SummonerNames - Array of summoner names for team 1
   * @param team2SummonerNames - Array of summoner names for team 2
   * @param region - Optional region code (defaults to EUW)
   * @returns Object with verification result and match details
   */
  async verifyTeamMatch(
    matchId: string,
    team1SummonerNames: string[],
    team2SummonerNames: string[],
    region?: string,
  ): Promise<{
    verified: boolean;
    winningTeam?: number;
    matchDetails?: any;
    error?: string;
  }> {
    try {
      const match = await this.getMatchById(matchId, region);

      if (!match) {
        return { verified: false, error: 'Match not found' };
      }

      // Get all summoner names in the match
      const participants = match.info.participants;
      const participantNames = participants.map((p: any) => p.summonerName.toLowerCase());

      // Check if the teams are in the match
      const team1NamesLower = team1SummonerNames.map(name => name.toLowerCase());
      const team2NamesLower = team2SummonerNames.map(name => name.toLowerCase());

      const team1InMatch = team1NamesLower.every(name => participantNames.includes(name));
      const team2InMatch = team2NamesLower.every(name => participantNames.includes(name));

      if (!team1InMatch || !team2InMatch) {
        return {
          verified: false,
          error: 'Not all team members were found in the match',
        };
      }

      // Determine which team won
      const team1Participants = participants.filter((p: any) =>
        team1NamesLower.includes(p.summonerName.toLowerCase()),
      );

      // If all participants from team1 have the same win value, they were on the same team
      const team1Win = team1Participants.length > 0 ? team1Participants[0].win : false;
      const team1AllSameResult = team1Participants.every((p: any) => p.win === team1Win);

      if (!team1AllSameResult) {
        return {
          verified: false,
          error: 'Team members were not on the same team in the match',
        };
      }

      return {
        verified: true,
        winningTeam: team1Win ? 1 : 2,
        matchDetails: {
          gameDuration: match.info.gameDuration,
          gameCreation: match.info.gameCreation,
          queueId: match.info.queueId,
        },
      };
    } catch (error: any) {
      logger.error(`Error verifying team match "${matchId}":`, error);
      return { verified: false, error: 'API error occurred' };
    }
  }
}
