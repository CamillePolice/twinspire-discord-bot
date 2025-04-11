import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the Riot API key from environment variables
const RIOT_API_KEY = process.env.RIOT_API_KEY;

// If no API key is provided, exit with an error
if (!RIOT_API_KEY) {
  console.error('⛔ Error: RIOT_API_KEY is not set. Please add it to your .env file.');
  console.log('You can get an API key from https://developer.riotgames.com/');
  process.exit(1);
}

// Platform-specific routes (for platform-specific APIs)
const PLATFORM_ROUTES = {
  BR1: 'https://br1.api.riotgames.com',
  EUN1: 'https://eun1.api.riotgames.com',
  EUW1: 'https://euw1.api.riotgames.com',
  JP1: 'https://jp1.api.riotgames.com',
  KR: 'https://kr.api.riotgames.com',
  LA1: 'https://la1.api.riotgames.com',
  LA2: 'https://la2.api.riotgames.com',
  NA1: 'https://na1.api.riotgames.com',
  OC1: 'https://oc1.api.riotgames.com',
  TR1: 'https://tr1.api.riotgames.com',
  RU: 'https://ru.api.riotgames.com',
};

// Regional routes (for APIs that use regional routing)
const REGIONAL_ROUTES = {
  AMERICAS: 'https://americas.api.riotgames.com',
  ASIA: 'https://asia.api.riotgames.com',
  EUROPE: 'https://europe.api.riotgames.com',
  SEA: 'https://sea.api.riotgames.com',
};

// Default values for testing
const DEFAULT_PLATFORM = 'EUW1';
const DEFAULT_REGION = 'EUROPE';

// Default Riot ID to test
const DEFAULT_RIOT_ID = 'GuiltySpark';
const DEFAULT_TAG_LINE = '117';

/**
 * Create a configured axios instance for Riot API requests
 * @param baseUrl Base URL for the API endpoints
 * @returns Axios instance configured for Riot API
 */
const createRiotApiClient = (baseUrl: string) => {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'X-Riot-Token': RIOT_API_KEY,
    },
    timeout: 10000, // 10 seconds timeout
  });
};

/**
 * Test Riot Account API to get account information by Riot ID
 * @param riotId Riot ID to look up
 * @param tagLine Tagline (after the # in Riot ID)
 * @param region Regional route to use
 */
const testRiotAccountApi = async (
  riotId: string = DEFAULT_RIOT_ID,
  tagLine: string = DEFAULT_TAG_LINE,
  region: keyof typeof REGIONAL_ROUTES = DEFAULT_REGION
) => {
  try {
    console.log(`\n🔍 Testing Riot Account API for ${riotId}#${tagLine} using regional route ${region}...`);
    const apiClient = createRiotApiClient(REGIONAL_ROUTES[region]);
    
    const response = await apiClient.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagLine)}`);
    
    console.log('✅ Successfully connected to Riot Account API');
    console.log('Account data:');
    console.log(`  Game Name: ${response.data.gameName}`);
    console.log(`  Tag Line: ${response.data.tagLine}`);
    console.log(`  PUUID: ${response.data.puuid}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error connecting to Riot Account API:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('  No response received from server');
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    } else {
      console.error(error);
    }
    return null;
  }
};

/**
 * Get Summoner data by PUUID
 * @param puuid PUUID to look up
 * @param platform Platform to use
 */
const testSummonerByPuuidApi = async (
  puuid: string,
  platform: keyof typeof PLATFORM_ROUTES = DEFAULT_PLATFORM
) => {
  try {
    console.log(`\n🔍 Testing Summoner API for PUUID ${puuid} in ${platform}...`);
    const apiClient = createRiotApiClient(PLATFORM_ROUTES[platform]);
    
    const response = await apiClient.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    
    console.log('✅ Successfully connected to Summoner API');
    console.log('Summoner data:');
    console.log(`  Name: ${response.data.name}`);
    console.log(`  Level: ${response.data.summonerLevel}`);
    console.log(`  Account ID: ${response.data.accountId}`);
    console.log(`  Summoner ID: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error connecting to Summoner API:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('  No response received from server');
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    } else {
      console.error(error);
    }
    return null;
  }
};

/**
 * Test champion mastery API endpoint
 * @param summonerId Summoner ID to look up
 * @param platform Platform to use
 */
const testChampionMasteryApi = async (
  summonerId: string, 
  platform: keyof typeof PLATFORM_ROUTES = DEFAULT_PLATFORM
) => {
  try {
    console.log(`\n🔍 Testing Champion Mastery API for summoner ID ${summonerId} in ${platform}...`);
    const apiClient = createRiotApiClient(PLATFORM_ROUTES[platform]);
    
    const response = await apiClient.get(`/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`);
    
    console.log('✅ Successfully connected to Champion Mastery API');
    console.log(`Top 3 champion masteries (out of ${response.data.length}):`);
    
    response.data.slice(0, 3).forEach((mastery: any, index: number) => {
      console.log(`  ${index + 1}. Champion ID: ${mastery.championId}, Mastery Level: ${mastery.championLevel}, Points: ${mastery.championPoints}`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error connecting to Champion Mastery API:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('  No response received from server');
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    } else {
      console.error(error);
    }
    return null;
  }
};

/**
 * Test match history API endpoint using regional routing
 * @param puuid Player UUID to look up
 * @param region Regional route to use
 */
const testMatchHistoryApi = async (
  puuid: string, 
  region: keyof typeof REGIONAL_ROUTES = DEFAULT_REGION
) => {
  try {
    console.log(`\n🔍 Testing Match History API for PUUID ${puuid} using regional route ${region}...`);
    const apiClient = createRiotApiClient(REGIONAL_ROUTES[region]);
    
    const response = await apiClient.get(`/lol/match/v5/matches/by-puuid/${puuid}/ids`, {
      params: {
        start: 0,
        count: 5
      }
    });
    
    console.log('✅ Successfully connected to Match History API');
    console.log('Recent match IDs:');
    response.data.forEach((matchId: string, index: number) => {
      console.log(`  ${index + 1}. ${matchId}`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error connecting to Match History API:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('  No response received from server');
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    } else {
      console.error(error);
    }
    return null;
  }
};

/**
 * Test League of Legends ranked information API endpoint
 * @param summonerId Summoner ID to look up
 * @param platform Platform to use
 */
const testLeagueApi = async (
  summonerId: string, 
  platform: keyof typeof PLATFORM_ROUTES = DEFAULT_PLATFORM
) => {
  try {
    console.log(`\n🔍 Testing League API for summoner ID ${summonerId} in ${platform}...`);
    const apiClient = createRiotApiClient(PLATFORM_ROUTES[platform]);
    
    const response = await apiClient.get(`/lol/league/v4/entries/by-summoner/${summonerId}`);
    
    console.log('✅ Successfully connected to League API');
    if (response.data.length === 0) {
      console.log('No ranked data found for this summoner');
      return [];
    }
    
    console.log('Ranked information:');
    response.data.forEach((entry: any) => {
      console.log(`  Queue: ${entry.queueType}`);
      console.log(`  Tier: ${entry.tier} ${entry.rank}`);
      console.log(`  LP: ${entry.leaguePoints}`);
      console.log(`  Wins: ${entry.wins}, Losses: ${entry.losses}`);
      console.log('  -----');
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error connecting to League API:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('  No response received from server');
      } else {
        console.error(`  Error message: ${error.message}`);
      }
    } else {
      console.error(error);
    }
    return null;
  }
};

/**
 * Run all tests
 */
const runTests = async () => {
  try {
    console.log('🚀 Starting Riot API connection tests...');
    
    // Riot ID to test with
    const riotId = DEFAULT_RIOT_ID;
    const tagLine = DEFAULT_TAG_LINE;
    
    // Platform routing (for platform-specific APIs like Summoner, Champion Mastery)
    const platform: keyof typeof PLATFORM_ROUTES = DEFAULT_PLATFORM;
    
    // Regional routing (for APIs like Riot Account, Match History)
    const region: keyof typeof REGIONAL_ROUTES = DEFAULT_REGION;
    
    console.log(`\n📌 Using Riot ID: ${riotId}#${tagLine}`);
    console.log(`📌 Using platform route: ${platform}`);
    console.log(`📌 Using regional route: ${region}`);
    
    // 1. First test Riot Account API to get PUUID (using regional routing)
    const accountData = await testRiotAccountApi(riotId, tagLine, region);
    
    if (accountData) {
      const puuid = accountData.puuid;
      
      // 2. Get summoner data using PUUID (uses platform routing)
      const summonerData = await testSummonerByPuuidApi(puuid, platform);
      
      if (summonerData) {
        // 3. Test champion mastery API with retrieved summoner ID (platform routing)
        await testChampionMasteryApi(summonerData.id, platform);
        
        // 4. Test league API with retrieved summoner ID (platform routing)
        await testLeagueApi(summonerData.id, platform);
      }
      
      // 5. Test match history API with PUUID (regional routing)
      await testMatchHistoryApi(puuid, region);
    }
    
    console.log('\n🏁 Finished API connection tests.');
  } catch (error) {
    console.error('⚠️ An unexpected error occurred during tests:');
    console.error(error);
  }
};

// Run the tests
runTests();