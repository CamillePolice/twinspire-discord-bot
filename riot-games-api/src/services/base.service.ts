import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import NodeCache from 'node-cache';
import logger from '../utils/logger.utils';
import { config } from '../config/app.config';
import { RegionalRoute, PlatformRoute } from '../types/riot-api.types';
import { ApiError } from '../utils/error-handler.utils';

/**
 * Base service for Riot API interactions with shared functionality
 */
export class BaseService {
  protected readonly apiKey: string;
  protected readonly cache: NodeCache;
  protected readonly regionalClients: Map<RegionalRoute, AxiosInstance>;
  protected readonly platformClients: Map<PlatformRoute, AxiosInstance>;
  
  /**
   * Creates a new base service instance
   */
  constructor() {
    this.apiKey = config.riot.apiKey;
    this.cache = new NodeCache({
      stdTTL: config.riot.cacheTTL / 1000, // Cache TTL in seconds
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false,
    });
    
    this.regionalClients = new Map();
    this.platformClients = new Map();
    
    // Initialize regional clients
    Object.values(RegionalRoute).forEach(region => {
      const baseUrl = config.regionalEndpoints[region];
      this.regionalClients.set(region as RegionalRoute, this.createApiClient(baseUrl));
    });
    
    // Initialize platform clients
    Object.values(PlatformRoute).forEach(platform => {
      const baseUrl = `https://${platform}.api.riotgames.com`;
      this.platformClients.set(platform as PlatformRoute, this.createApiClient(baseUrl));
    });
  }
  
  /**
   * Create an axios client for the Riot API
   */
  protected createApiClient(baseURL: string): AxiosInstance {
    return axios.create({
      baseURL,
      headers: {
        'X-Riot-Token': this.apiKey,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Charset': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      timeout: config.riot.requestTimeout,
    });
  }
  
  /**
   * Make a request to the Riot API with caching
   */
  protected async makeRequest<T>(
    client: AxiosInstance,
    url: string,
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    // Generate a cache key based on the request details
    const cacheKey = `${client.defaults.baseURL}${url}${JSON.stringify(options)}`;
    
    // Check cache first if enabled
    if (config.riot.cacheEnabled) {
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for ${url}`);
        return cachedData;
      }
    }
    
    try {
      // Make the API request
      logger.debug(`Making request to ${client.defaults.baseURL}${url}`);
      const response = await client.get<T>(url, options);
      
      // Cache the response if caching is enabled
      if (config.riot.cacheEnabled) {
        this.cache.set(cacheKey, response.data);
        logger.debug(`Cached data for ${url}`);
      }
      
      return response.data;
    } catch (error) {
      // Enhanced error handling
      this.handleApiError(url, error);
      throw error; // Re-throw to be handled by controller
    }
  }
  
  /**
   * Handle and log API errors
   */
  protected handleApiError(url: string, error: any): void {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        
        // Handle rate limiting specifically
        if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          logger.warn(`Rate limited by Riot API. Retry after ${retryAfter} seconds.`, {
            url,
            status,
            retryAfter,
          });
        } else {
          logger.error(`Riot API error: ${status}`, {
            url,
            status,
            data: error.response.data,
          });
        }
      } else if (error.request) {
        logger.error('No response received from Riot API', { url });
      } else {
        logger.error(`Riot API request error: ${error.message}`, { url });
      }
    } else {
      logger.error(`Unexpected error in Riot API request: ${error}`, { url });
    }
  }
  
  /**
   * Get the client for a regional endpoint
   */
  protected getRegionalClient(region: RegionalRoute): AxiosInstance {
    const client = this.regionalClients.get(region);
    if (!client) {
      throw new ApiError(500, `No client configured for region: ${region}`);
    }
    return client;
  }
  
  /**
   * Get the client for a platform endpoint
   */
  protected getPlatformClient(platform: PlatformRoute): AxiosInstance {
    const client = this.platformClients.get(platform);
    if (!client) {
      throw new ApiError(500, `No client configured for platform: ${platform}`);
    }
    return client;
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }
}