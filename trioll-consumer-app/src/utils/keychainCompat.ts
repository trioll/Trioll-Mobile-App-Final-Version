import * as SecureStore from 'expo-secure-store';

const logger = getLogger('keychainCompat');

import { getLogger } from '../utils/logger';
// Keychain-compatible API using SecureStore
export const Keychain = {
  /**
   * Store internet credentials
   */
  async setInternetCredentials(
    server: string,
    username: string,
    password: string
  ): Promise<boolean> {
    try {
      const key = `keychain_${server}`;
      const value = JSON.stringify({ username, password });
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      logger.warn('SecureStore setInternetCredentials error:', error);
      return false;
    }
  },

  /**
   * Get internet credentials
   */
  async getInternetCredentials(
    server: string
  ): Promise<{ username: string; password: string } | false> {
    try {
      const key = `keychain_${server}`;
      const value = await SecureStore.getItemAsync(key);
      if (!value) return false;

      const credentials = JSON.parse(value);
      return credentials;
    } catch (error) {
      logger.warn('SecureStore getInternetCredentials error:', error);
      return false;
    }
  },

  /**
   * Reset internet credentials
   */
  async resetInternetCredentials(server: string): Promise<boolean> {
    try {
      const key = `keychain_${server}`;
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      logger.warn('SecureStore resetInternetCredentials error:', error);
      return false;
    }
  },

  /**
   * Store generic password
   */
  async setGenericPassword(
    username: string,
    password: string,
    options?: { service?: string }
  ): Promise<boolean> {
    try {
      const service = options?.service || 'default';
      const key = `keychain_generic_${service}`;
      const value = JSON.stringify({ username, password });
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      logger.warn('SecureStore setGenericPassword error:', error);
      return false;
    }
  },

  /**
   * Get generic password
   */
  async getGenericPassword(options?: {
    service?: string;
  }): Promise<{ username: string; password: string; service: string } | false> {
    try {
      const service = options?.service || 'default';
      const key = `keychain_generic_${service}`;
      const value = await SecureStore.getItemAsync(key);
      if (!value) return false;

      const credentials = JSON.parse(value);
      return { ...credentials, service };
    } catch (error) {
      logger.warn('SecureStore getGenericPassword error:', error);
      return false;
    }
  },

  /**
   * Reset generic password
   */
  async resetGenericPassword(options?: { service?: string }): Promise<boolean> {
    try {
      const service = options?.service || 'default';
      const key = `keychain_generic_${service}`;
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      logger.warn('SecureStore resetGenericPassword error:', error);
      return false;
    }
  },

  /**
   * Check if biometry is supported (always false in Expo Go)
   */
  async getSupportedBiometryType(): Promise<string | null> {
    // Expo Go doesn't support biometric authentication
    // Return null to indicate no biometry available
    return null;
  },

  /**
   * Can use authentication (always false in Expo Go)
   */
  async canImplyAuthentication(): Promise<boolean> {
    // Expo Go doesn't support biometric authentication
    return false;
  },
};

// Export individual functions for compatibility
export const setInternetCredentials = Keychain.setInternetCredentials;
export const getInternetCredentials = Keychain.getInternetCredentials;
export const resetInternetCredentials = Keychain.resetInternetCredentials;
export const setGenericPassword = Keychain.setGenericPassword;
export const getGenericPassword = Keychain.getGenericPassword;
export const resetGenericPassword = Keychain.resetGenericPassword;
export const getSupportedBiometryType = Keychain.getSupportedBiometryType;
export const canImplyAuthentication = Keychain.canImplyAuthentication;

// Export as default
export default Keychain;
