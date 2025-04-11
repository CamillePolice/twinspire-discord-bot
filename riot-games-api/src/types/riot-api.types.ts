/**
 * Type definitions for Riot API data structures
 */

/**
 * Region routes for APIs that use regional routing
 */
export enum RegionalRoute {
    AMERICAS = 'americas',
    ASIA = 'asia',
    EUROPE = 'europe',
    SEA = 'sea'
  }
  
  /**
   * Platform routes for APIs that use platform-specific routing
   */
  export enum PlatformRoute {
    BR1 = 'br1',
    EUN1 = 'eun1',
    EUW1 = 'euw1',
    JP1 = 'jp1',
    KR = 'kr',
    LA1 = 'la1',
    LA2 = 'la2',
    NA1 = 'na1',
    OC1 = 'oc1',
    TR1 = 'tr1',
    RU = 'ru',
    PH2 = 'ph2',
    SG2 = 'sg2',
    TH2 = 'th2',
    TW2 = 'tw2',
    VN2 = 'vn2'
  }
  
  /**
   * Mapping between platforms and regional routes
   */
  export const PLATFORM_TO_REGION: Record<PlatformRoute, RegionalRoute> = {
    [PlatformRoute.BR1]: RegionalRoute.AMERICAS,
    [PlatformRoute.EUN1]: RegionalRoute.EUROPE,
    [PlatformRoute.EUW1]: RegionalRoute.EUROPE,
    [PlatformRoute.JP1]: RegionalRoute.ASIA,
    [PlatformRoute.KR]: RegionalRoute.ASIA,
    [PlatformRoute.LA1]: RegionalRoute.AMERICAS,
    [PlatformRoute.LA2]: RegionalRoute.AMERICAS,
    [PlatformRoute.NA1]: RegionalRoute.AMERICAS,
    [PlatformRoute.OC1]: RegionalRoute.SEA,
    [PlatformRoute.TR1]: RegionalRoute.EUROPE,
    [PlatformRoute.RU]: RegionalRoute.EUROPE,
    [PlatformRoute.PH2]: RegionalRoute.SEA,
    [PlatformRoute.SG2]: RegionalRoute.SEA,
    [PlatformRoute.TH2]: RegionalRoute.SEA,
    [PlatformRoute.TW2]: RegionalRoute.SEA,
    [PlatformRoute.VN2]: RegionalRoute.SEA
  };
  
  /**
   * Riot Account data
   */
  export interface RiotAccount {
    puuid: string;
    gameName: string;
    tagLine: string;
  }
  
  /**
   * Summoner data
   */
  export interface Summoner {
    id: string;
    accountId: string;
    puuid: string;
    name: string;
    profileIconId: number;
    revisionDate: number;
    summonerLevel: number;
  }
  
  /**
   * Champion Mastery data
   */
  export interface ChampionMastery {
    championId: number;
    championLevel: number;
    championPoints: number;
    lastPlayTime: number;
    championPointsSinceLastLevel: number;
    championPointsUntilNextLevel: number;
    chestGranted: boolean;
    tokensEarned: number;
    summonerId: string;
  }
  
  /**
   * Match data - partial interface focusing on main components
   */
  export interface Match {
    metadata: {
      dataVersion: string;
      matchId: string;
      participants: string[];
    };
    info: {
      gameCreation: number;
      gameDuration: number;
      gameEndTimestamp: number;
      gameId: number;
      gameMode: string;
      gameName: string;
      gameStartTimestamp: number;
      gameType: string;
      gameVersion: string;
      mapId: number;
      participants: any[]; // Full participant data is complex
      platformId: string;
      queueId: number;
      teams: any[]; // Full team data is complex
    };
  }
  
  /**
   * League Entry data
   */
  export interface LeagueEntry {
    leagueId: string;
    summonerId: string;
    summonerName: string;
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    hotStreak: boolean;
    veteran: boolean;
    freshBlood: boolean;
    inactive: boolean;
    miniSeries?: {
      target: number;
      wins: number;
      losses: number;
      progress: string;
    };
  }