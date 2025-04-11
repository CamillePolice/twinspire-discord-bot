import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // API access configuration
  api: {
    key: process.env.API_KEY || '',
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute window
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Max requests per window
    },
  },
  
  // Riot Games API configuration
  riot: {
    apiKey: process.env.RIOT_API_KEY || '',
    requestTimeout: parseInt(process.env.RIOT_API_TIMEOUT || '10000', 10), // 10 seconds
    retryLimit: parseInt(process.env.RIOT_API_RETRY_LIMIT || '1', 10), // Number of retry attempts
    cacheEnabled: process.env.ENABLE_CACHE === 'true',
    cacheTTL: parseInt(process.env.CACHE_TTL || '300000', 10), // 5 minutes in milliseconds
  },
  
  // Regional endpoints
  regionalEndpoints: {
    americas: 'https://americas.api.riotgames.com',
    asia: 'https://asia.api.riotgames.com',
    europe: 'https://europe.api.riotgames.com',
    sea: 'https://sea.api.riotgames.com',
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filename: process.env.LOG_FILE || 'app.log',
  }
};

/**
 * Validate essential configuration
 */
export function validateConfig(): void {
  if (!config.riot.apiKey) {
    console.error('⛔ Missing RIOT_API_KEY in environment variables');
    process.exit(1);
  }
  
  if (!config.api.key && config.server.nodeEnv === 'production') {
    console.error('⛔ Missing API_KEY in environment variables (required in production)');
    process.exit(1);
  }
}