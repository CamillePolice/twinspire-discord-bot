import { cacheService } from '../src/services';
import logger from '../src/utils/logger.utils';

/**
 * Simple script to clear the API cache
 */
function clearCache(): void {
  try {
    cacheService.clearAllCaches();
    logger.info('All service caches cleared successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error clearing cache:', error);
    process.exit(1);
  }
}

// Run the script
clearCache();