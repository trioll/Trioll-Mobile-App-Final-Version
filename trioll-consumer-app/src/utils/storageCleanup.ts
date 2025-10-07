import AsyncStorage from './storageCompat';
import { Config } from '../config/environments';
import { getLogger } from '../utils/logger';

const logger = getLogger('storageCleanup');
/**
 * Clean up corrupted storage data
 * Run this on app startup to ensure clean state
 */
export async function cleanupCorruptedStorage(): Promise<void> {
  try {
    // List of keys that might contain JSON data
    const jsonKeys = [
      'performance_metrics',
      'analytics_queue',
      'cached_games',
      'user_preferences',
      'search_history',
    ];

    for (let i = 0; i < jsonKeys.length; i++) {
        const key = jsonKeys[i];
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          // Try to parse the data
          try {
            JSON.parse(data);
           } catch {
            // If parsing fails, remove the corrupted data
            await AsyncStorage.removeItem(key);
            if (Config.DEBUG?.ENABLE_LOGGING) {
              logger.info(`Cleaned up corrupted data for key: ${key}`);
            }
          }
        }
      } catch {
        // If even reading fails, try to remove the key
        try {
          await AsyncStorage.removeItem(key);
        } catch {
          // Ignore if removal also fails
        }
      }
    }
  } catch {
    // Don't let cleanup errors crash the app
    if (Config.DEBUG?.ENABLE_LOGGING) {
      logger.error('Storage cleanup error:', error);
    }
  }
}

/**
 * Clear all performance-related data
 * Useful for debugging performance issues
 */
export async function clearPerformanceData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const performanceKeys = keys.filter(
      key => key.includes('performance') || key.includes('metrics')
    );

    if (performanceKeys.length > 0) {
      await AsyncStorage.multiRemove(performanceKeys);
      if (Config.DEBUG?.ENABLE_LOGGING) {
        logger.info(`Cleared ${performanceKeys.length} performance-related keys`);
      }
    }
  } catch {
    if (Config.DEBUG?.ENABLE_LOGGING) {
      logger.error('Failed to clear performance data:', error);
    }
  }
}