/**
 * Authentication Token Manager
 * Handles storage and retrieval of authentication tokens
 */

import * as SecureStore from 'expo-secure-store';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AuthTokenManager');

const ACCESS_TOKEN_KEY = 'trioll_access_token';
const REFRESH_TOKEN_KEY = 'trioll_refresh_token';
const ID_TOKEN_KEY = 'trioll_id_token';

export class AuthTokenManager {
  static async saveTokens(tokens: {
    idToken?: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      if (tokens.idToken) {
        await SecureStore.setItemAsync(ID_TOKEN_KEY, tokens.idToken);
      }
    } catch (error) {
      logger.error('Failed to save tokens:', error);
      throw error;
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get refresh token:', error);
      return null;
    }
  }

  static async getIdToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ID_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get ID token:', error);
      return null;
    }
  }

  static async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to clear tokens:', error);
    }
    return;
}

  static async hasValidTokens(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();
    return !!(accessToken && refreshToken);
  }
}
