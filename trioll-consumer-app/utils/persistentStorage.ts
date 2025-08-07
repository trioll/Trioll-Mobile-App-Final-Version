import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('persistentStorage');

/**
 * Production-ready storage solution that uses:
 * - SecureStore for sensitive data (passwords, tokens)
 * - AsyncStorage for non-sensitive persistent data (settings, compliance)
 * - Memory fallback for development/testing only
 */

export enum StorageType {
  SECURE = 'secure',      // For sensitive data like tokens, passwords
  PERSISTENT = 'persistent', // For non-sensitive data that needs to persist
  MEMORY = 'memory'       // Fallback for testing only
}

interface StorageConfig {
  type: StorageType;
  prefix?: string;
}

class PersistentStorage {
  private memoryCache: { [key: string]: string } = {};
  private secureStoreAvailable = true;
  private asyncStorageAvailable = true;

  constructor() {
    logger.info('PersistentStorage: Initializing...');
    this.initializeStorage();
  }

  private async initializeStorage() {
    // Test SecureStore availability
    try {
      const testKey = '_test_secure_' + Date.now();
      await SecureStore.setItemAsync(testKey, 'test');
      await SecureStore.deleteItemAsync(testKey);
      this.secureStoreAvailable = true;
      logger.info('SecureStore is available');
    } catch (error) {
      this.secureStoreAvailable = false;
      logger.warn('SecureStore is not available:', error);
    }

    // Test AsyncStorage availability
    try {
      const testKey = '_test_async_' + Date.now();
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      this.asyncStorageAvailable = true;
      logger.info('AsyncStorage is available');
    } catch (error) {
      this.asyncStorageAvailable = false;
      logger.error('AsyncStorage is not available - this will cause issues in production!', error);
    }
  }

  /**
   * Store data with specified storage type
   */
  async setItem(key: string, value: string, config: StorageConfig = { type: StorageType.PERSISTENT }): Promise<void> {
    const prefixedKey = config.prefix ? `${config.prefix}_${key}` : key;

    try {
      switch (config.type) {
        case StorageType.SECURE:
          if (this.secureStoreAvailable) {
            await SecureStore.setItemAsync(prefixedKey, value);
            logger.debug(`Stored ${prefixedKey} in SecureStore`);
          } else if (this.asyncStorageAvailable) {
            // Fallback to AsyncStorage with encryption warning
            logger.warn(`SecureStore unavailable, using AsyncStorage for ${prefixedKey} - consider encryption`);
            await AsyncStorage.setItem(prefixedKey, value);
          } else {
            throw new Error('No persistent storage available for secure data');
          }
          break;

        case StorageType.PERSISTENT:
          if (this.asyncStorageAvailable) {
            await AsyncStorage.setItem(prefixedKey, value);
            logger.debug(`Stored ${prefixedKey} in AsyncStorage`);
          } else {
            logger.error(`AsyncStorage unavailable - using memory storage for ${prefixedKey}`);
            this.memoryCache[prefixedKey] = value;
          }
          break;

        case StorageType.MEMORY:
          this.memoryCache[prefixedKey] = value;
          logger.debug(`Stored ${prefixedKey} in memory`);
          break;
      }
    } catch (error) {
      logger.error(`Failed to store ${prefixedKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from storage
   */
  async getItem(key: string, config: StorageConfig = { type: StorageType.PERSISTENT }): Promise<string | null> {
    const prefixedKey = config.prefix ? `${config.prefix}_${key}` : key;

    try {
      switch (config.type) {
        case StorageType.SECURE:
          if (this.secureStoreAvailable) {
            const value = await SecureStore.getItemAsync(prefixedKey);
            logger.debug(`Retrieved ${prefixedKey} from SecureStore: ${value ? 'found' : 'not found'}`);
            return value;
          } else if (this.asyncStorageAvailable) {
            const value = await AsyncStorage.getItem(prefixedKey);
            logger.debug(`Retrieved ${prefixedKey} from AsyncStorage (fallback): ${value ? 'found' : 'not found'}`);
            return value;
          } else {
            return this.memoryCache[prefixedKey] || null;
          }

        case StorageType.PERSISTENT:
          if (this.asyncStorageAvailable) {
            const value = await AsyncStorage.getItem(prefixedKey);
            logger.debug(`Retrieved ${prefixedKey} from AsyncStorage: ${value ? 'found' : 'not found'}`);
            return value;
          } else {
            return this.memoryCache[prefixedKey] || null;
          }

        case StorageType.MEMORY:
          return this.memoryCache[prefixedKey] || null;
      }
    } catch (error) {
      logger.error(`Failed to retrieve ${prefixedKey}:`, error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async removeItem(key: string, config: StorageConfig = { type: StorageType.PERSISTENT }): Promise<void> {
    const prefixedKey = config.prefix ? `${config.prefix}_${key}` : key;

    try {
      switch (config.type) {
        case StorageType.SECURE:
          if (this.secureStoreAvailable) {
            await SecureStore.deleteItemAsync(prefixedKey);
          } else if (this.asyncStorageAvailable) {
            await AsyncStorage.removeItem(prefixedKey);
          }
          delete this.memoryCache[prefixedKey];
          break;

        case StorageType.PERSISTENT:
          if (this.asyncStorageAvailable) {
            await AsyncStorage.removeItem(prefixedKey);
          }
          delete this.memoryCache[prefixedKey];
          break;

        case StorageType.MEMORY:
          delete this.memoryCache[prefixedKey];
          break;
      }
      logger.debug(`Removed ${prefixedKey} from storage`);
    } catch (error) {
      logger.error(`Failed to remove ${prefixedKey}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data for a specific storage type
   */
  async clear(config: StorageConfig = { type: StorageType.PERSISTENT }): Promise<void> {
    try {
      if (config.type === StorageType.PERSISTENT && this.asyncStorageAvailable) {
        const keys = await AsyncStorage.getAllKeys();
        const prefixedKeys = config.prefix 
          ? keys.filter(key => key.startsWith(`${config.prefix}_`))
          : keys;
        
        if (prefixedKeys.length > 0) {
          await AsyncStorage.multiRemove(prefixedKeys);
          logger.info(`Cleared ${prefixedKeys.length} items from AsyncStorage`);
        }
      }

      // Clear memory cache for the prefix
      if (config.prefix) {
        Object.keys(this.memoryCache)
          .filter(key => key.startsWith(`${config.prefix}_`))
          .forEach(key => delete this.memoryCache[key]);
      } else if (config.type === StorageType.MEMORY) {
        this.memoryCache = {};
      }
    } catch (error) {
      logger.error('Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Get storage availability status
   */
  getStorageStatus() {
    return {
      secureStore: this.secureStoreAvailable,
      asyncStorage: this.asyncStorageAvailable,
      isProductionReady: this.asyncStorageAvailable, // Minimum requirement for production
    };
  }
}

// Export singleton instance
export const persistentStorage = new PersistentStorage();

// Helper functions for specific use cases
export const complianceStorage = {
  setItem: (key: string, value: string) => 
    persistentStorage.setItem(key, value, { type: StorageType.PERSISTENT, prefix: 'compliance' }),
  
  getItem: (key: string) => 
    persistentStorage.getItem(key, { type: StorageType.PERSISTENT, prefix: 'compliance' }),
  
  removeItem: (key: string) => 
    persistentStorage.removeItem(key, { type: StorageType.PERSISTENT, prefix: 'compliance' }),
  
  clear: () => 
    persistentStorage.clear({ type: StorageType.PERSISTENT, prefix: 'compliance' }),
};

export const authStorage = {
  setItem: (key: string, value: string) => 
    persistentStorage.setItem(key, value, { type: StorageType.SECURE, prefix: 'auth' }),
  
  getItem: (key: string) => 
    persistentStorage.getItem(key, { type: StorageType.SECURE, prefix: 'auth' }),
  
  removeItem: (key: string) => 
    persistentStorage.removeItem(key, { type: StorageType.SECURE, prefix: 'auth' }),
  
  clear: () => 
    persistentStorage.clear({ type: StorageType.SECURE, prefix: 'auth' }),
};