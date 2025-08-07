import * as SecureStore from 'expo-secure-store';

const logger = getLogger('secureStorage');

import { getLogger } from '../utils/logger';
/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  USER_PROFILE: 'user_profile',
  GUEST_DATA: 'guest_data',
  PREFERENCES: 'user_preferences',
};

/**
 * Store a value securely
 */
export const secureSet = async (key: string, value: any): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(key, stringValue);
  } catch (error) {
    logger.error(`Failed to store ${key}:`, error);
    throw error;
  }
};

/**
 * Get a value from secure storage
 */
export const secureGet = async <T = any>(key: string): Promise<T | null> => {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      // If parsing fails, return as string
      return value as unknown as T;
    }
  } catch (error) {
    logger.error(`Failed to get ${key}:`, error);
    return null;
  }
};

/**
 * Remove a value from secure storage
 */
export const secureRemove = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    logger.error(`Failed to remove ${key}:`, error);
    throw error;
  }
};

/**
 * Check if a key exists in secure storage
 */
export const secureExists = async (key: string): Promise<boolean> => {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value !== null;
  } catch (error) {
    logger.error(`Failed to check ${key}:`, error);
    return false;
  }
};

/**
 * Clear all secure storage (use with caution)
 */
export const secureClear = async (): Promise<void> => {
  try {
    // Clear known keys
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map(key => secureRemove(key)));
  } catch (error) {
    logger.error('Failed to clear secure storage:', error);
    throw error;
  }
};

/**
 * Storage wrapper for authentication tokens
 */
export const authTokenStorage = {
  save: async (tokens: unknown) => {
    const tokenData = {
      ...tokens,
      timestamp: Date.now(),
    };
    await secureSet(STORAGE_KEYS.AUTH_TOKENS, tokenData);

    // Also store in memory for quick access
    global.authTokens = tokens;
  },

  get: async () => {
    const data = await secureGet<any>(STORAGE_KEYS.AUTH_TOKENS);
    if (!data) return null;

    // Check expiration
    if (data.expiresIn && data.timestamp) {
      const expiryTime = data.timestamp + data.expiresIn * 1000;
      if (Date.now() > expiryTime) {
        await secureRemove(STORAGE_KEYS.AUTH_TOKENS);
        delete global.authTokens;
        return null;
      }
    }

    return data;
  },

  clear: async () => {
    await secureRemove(STORAGE_KEYS.AUTH_TOKENS);
    delete global.authTokens;
  },
};
