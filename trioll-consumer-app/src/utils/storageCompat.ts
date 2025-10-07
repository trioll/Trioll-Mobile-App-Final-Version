import * as SecureStore from 'expo-secure-store';

const logger = getLogger('storageCompat');

import { getLogger } from '../utils/logger';
// Key prefix to avoid conflicts
const KEY_PREFIX = 'trioll_';

// Maximum value size for SecureStore (2KB limit)
const MAX_VALUE_SIZE = 2048;

/**
 * AsyncStorage-compatible API using SecureStore
 */
export const AsyncStorage = {
  /**
   * Get item from storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // Handle large values that might be split
      const mainValue = await SecureStore.getItemAsync(KEY_PREFIX + key);
      if (!mainValue) return null;

      // Check if value was split into chunks
      if (mainValue.startsWith('CHUNKED:')) {
        const chunkCount = parseInt(mainValue.split(':')[1]);
        let fullValue = '';

        for (let i = 0; i < chunkCount; i++) {
          const chunk = await SecureStore.getItemAsync(`${KEY_PREFIX}${key}_chunk_${i}`);
          if (chunk) fullValue += chunk;
        }

        return fullValue;
      }

      return mainValue;
    } catch {
      logger.warn('SecureStore getItem error:', error);
      return null;
    }
  },

  /**
   * Set item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Handle large values by chunking
      if (value.length > MAX_VALUE_SIZE) {
        const chunks = Math.ceil(value.length / MAX_VALUE_SIZE);
        await SecureStore.setItemAsync(KEY_PREFIX + key, `CHUNKED:${chunks}`);

        for (let i = 0; i < chunks; i++) {
          const chunk = value.slice(i * MAX_VALUE_SIZE, (i + 1) * MAX_VALUE_SIZE);
          await SecureStore.setItemAsync(`${KEY_PREFIX}${key}_chunk_${i}`, chunk);
        }
      } else {
        await SecureStore.setItemAsync(KEY_PREFIX + key, value);
      }
    } catch {
      logger.warn('SecureStore setItem error:', error);
      throw error;
    }
  },

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      // Check if value is chunked
      const mainValue = await SecureStore.getItemAsync(KEY_PREFIX + key);

      if (mainValue?.startsWith('CHUNKED:')) {
        const chunkCount = parseInt(mainValue.split(':')[1]);

        // Remove all chunks
        for (let i = 0; i < chunkCount; i++) {
          await SecureStore.deleteItemAsync(`${KEY_PREFIX}${key}_chunk_${i}`);
        }
      }

      // Remove main key
      await SecureStore.deleteItemAsync(KEY_PREFIX + key);
    } catch {
      logger.warn('SecureStore removeItem error:', error);
    }
  },

  /**
   * Get all keys (limited implementation)
   */
  async getAllKeys(): Promise<string[]> {
    // SecureStore doesn't support getting all keys
    // Return empty array for compatibility
    logger.warn('getAllKeys not fully supported with SecureStore');
    return [];
  },

  /**
   * Get multiple items (limited implementation)
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const results: [string, string | null][] = [];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
      const value = await this.getItem(key);
      results.push([key, value]);
     }

    return results;
  },

  /**
   * Set multiple items
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    for (const [key, value] of keyValuePairs) {
      await this.setItem(key, value);
    }
  },

  /**
   * Remove multiple items
   */
  async multiRemove(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
      await this.removeItem(key);
     }
  },

  /**
   * Clear all items (limited implementation)
   */
  async clear(): Promise<void> {
    // SecureStore doesn't support clearing all items
    // This is a no-op for safety
    logger.warn('clear() not supported with SecureStore - items must be removed individually');
  },
};

// Export as default for drop-in replacement
export default AsyncStorage;
