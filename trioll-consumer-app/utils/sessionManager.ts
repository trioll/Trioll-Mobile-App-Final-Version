
import * as SecureStore from 'expo-secure-store';
import { AuthTokens, AuthUser } from '../types/auth';
import { refreshAuthToken } from './authApi';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('sessionManager');
const TOKEN_KEY = 'trioll_auth_token';
const REFRESH_TOKEN_KEY = 'trioll_refresh_token';
const USER_KEY = 'trioll_user';
const REMEMBER_ME_KEY = 'trioll_remember_me';

class SessionManager {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Save session
  async saveSession(tokens: AuthTokens, user: AuthUser, rememberMe = false): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

      // Schedule token refresh
      this.scheduleTokenRefresh(tokens.expiresAt);
    } catch (error) {
      logger.error('Error saving session:', error);
      throw error;
    }
  }

  // Get current session
  async getSession(): Promise<{
    token: string;
    user: AuthUser;
  } | null> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (token && userStr) {
        const user = JSON.parse(userStr);
        return { token, user };
      }

      return null;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  // Check if user selected "Remember me"
  async isRememberMeEnabled(): Promise<boolean> {
    try {
      const rememberMe = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
      return rememberMe === 'true';
    } catch (error) {
      logger.error('Error checking remember me:', error);
      return false;
    }
  }

  // Clear session
  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      // Keep remember me preference

      this.clearTokenRefreshTimer();
    } catch (error) {
      logger.error('Error clearing session:', error);
    }
    return;
}

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return false;
      }

      const newTokens = await refreshAuthToken(refreshToken);
      if (newTokens) {
        await SecureStore.setItemAsync(TOKEN_KEY, newTokens.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newTokens.refreshToken);

        // Reschedule refresh
        this.scheduleTokenRefresh(newTokens.expiresAt);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return false;
    }
  }

  // Schedule automatic token refresh
  private scheduleTokenRefresh(expiresAt: number): void {
    this.clearTokenRefreshTimer();

    // Refresh 5 minutes before expiry
    const refreshTime = expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  // Clear refresh timer
  private clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Update user data
  async updateUser(user: Partial<AuthUser>): Promise<void> {
    try {
      const currentUserStr = await SecureStore.getItemAsync(USER_KEY);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const updatedUser = { ...currentUser, ...user };
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
      }
    } catch (error) {
      logger.error('Error updating user:', error);
    }
  }
}

export const sessionManager = new SessionManager();
