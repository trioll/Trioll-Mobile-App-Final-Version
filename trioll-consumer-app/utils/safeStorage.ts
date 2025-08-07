import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('safeStorage');
// In-memory fallback storage (only for emergencies)
const memoryStorage: { [key: string]: string } = {};

class SafeStorage {
  private useSecureStore = true;

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.useSecureStore) {
        await SecureStore.setItemAsync(key, value);
        if (key.includes('compliance')) {
          logger.info(`SecureStore setItem success for ${key}`);
          // Verify it was stored
          const verified = await SecureStore.getItemAsync(key);
          logger.info(`SecureStore verification for ${key}: ${verified ? 'success' : 'failed'}`);
        }
      } else {
        logger.warn(`SecureStore unavailable, using AsyncStorage for ${key}`);
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      logger.warn('SecureStore setItem failed, falling back to AsyncStorage:', error);
      this.useSecureStore = false;
      try {
        await AsyncStorage.setItem(key, value);
        logger.info(`Successfully stored ${key} in AsyncStorage`);
      } catch (asyncError) {
        logger.error('AsyncStorage also failed, using memory as last resort:', asyncError);
        memoryStorage[key] = value;
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.useSecureStore) {
        const value = await SecureStore.getItemAsync(key);
        if (key.includes('compliance')) {
          logger.info(`SecureStore getItem for ${key}: ${value ? 'found' : 'not found'}`);
        }
        return value;
      } else {
        logger.warn(`SecureStore unavailable, using AsyncStorage for ${key}`);
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      logger.warn('SecureStore getItem failed, falling back to AsyncStorage:', error);
      this.useSecureStore = false;
      try {
        const value = await AsyncStorage.getItem(key);
        logger.info(`Retrieved ${key} from AsyncStorage: ${value ? 'found' : 'not found'}`);
        return value;
      } catch (asyncError) {
        logger.error('AsyncStorage also failed, using memory as last resort:', asyncError);
        return memoryStorage[key] || null;
      }
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      if (this.useSecureStore) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
      delete memoryStorage[key]; // Also clear from memory
    } catch (error) {
      logger.warn('SecureStore deleteItem failed, falling back to AsyncStorage:', error);
      this.useSecureStore = false;
      try {
        await AsyncStorage.removeItem(key);
      } catch (asyncError) {
        logger.error('AsyncStorage removeItem also failed:', asyncError);
      }
      delete memoryStorage[key];
    }
  }

  isUsingSecureStore(): boolean {
    return this.useSecureStore;
  }

  // Test if SecureStore is available
  async testSecureStore(): Promise<boolean> {
    try {
      const testKey = 'test_secure_store_' + Date.now();
      await SecureStore.setItemAsync(testKey, 'test');
      await SecureStore.deleteItemAsync(testKey);
      this.useSecureStore = true;
      return true;
    } catch (error) {
      logger.warn('SecureStore is not available:', error);
      this.useSecureStore = false;
      return false;
    }
  }
}

export const safeStorage = new SafeStorage();

// Initialize and test SecureStore availability
if (__DEV__) {
  safeStorage
    .testSecureStore()
    .then(_available => {
      // Storage initialized - SecureStore availability checked
    })
    .catch(error => {
      logger.warn('Storage initialization error:', error);
    });
}
