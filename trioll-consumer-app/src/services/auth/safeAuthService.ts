
/**
 * Safe Auth Service Wrapper
 * Provides a fail-safe wrapper around auth operations
 * Always falls back to guest mode if auth fails
 */

import { authService } from './authServiceAdapter';
import { guestModeConfig } from '../../config/guestModeConfig';
import { getOrCreateGuestProfile } from '../../../utils/guestStorage';

class SafeAuthService {
  /**
   * Get current user ID with guest fallback
   */
  async getCurrentUserId(): Promise<string> {
    try {
      // Try to get authenticated user ID
      const userId = await authService.getCurrentUserId();
      if (userId) {
        return userId;
      }
    } catch (error) {
      // Auth service error, using guest mode
    }

    // Fall back to guest ID from persistent storage
    const guestProfile = await getOrCreateGuestProfile();
    return guestProfile.guestId;
  }

  /**
   * Get current user with guest fallback
   */
  async getCurrentUser(): Promise<unknown> {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        return user;
      }
    } catch (error) {
      // Auth service error, returning guest user
    }

    // Return guest user
    return await this.getGuestUser();
  }

  /**
   * Check if authenticated (always returns something)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await authService.isAuthenticated();
    } catch (error) {
      // Auth check failed, assuming guest
      return false;
    }
  }

  /**
   * Get ID token (returns guest token for guests)
   */
  async getIdToken(): Promise<string | null> {
    try {
      const token = await authService.getIdToken();
      if (token) {
        return token;
      }
    } catch (error) {
      // Auth service error, generate guest token
    }

    // For guest users, get persistent guest ID and return guest token
    const guestProfile = await getOrCreateGuestProfile();
    return `guest-${guestProfile.guestId}`;
  }

  /**
   * Generate a consistent guest ID
   */
  private generateGuestId(): string {
    // Try to get from global storage first
    if (global.guestId) {
      return global.guestId;
    }

    // Generate new guest ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const guestId = `${guestModeConfig.GUEST_ID_PREFIX}${timestamp}_${random}`;

    // Store for session consistency
    global.guestId = guestId;

    return guestId;
  }

  /**
   * Get guest user object
   */
  private async getGuestUser(): Promise<any> {
    // Get persistent guest profile
    const guestProfile = await getOrCreateGuestProfile();
    const guestId = guestProfile.guestId;
    const username = guestProfile.username;
    
    return {
      // Properties
      id: guestId,
      email: `${guestId}@guest.trioll.com`,
      username: username,
      emailVerified: false,
      isGuest: true,
      createdAt: guestProfile.createdAt,
      
      // Methods for Cognito SDK compatibility
      getUsername: () => username,
      getIdToken: () => ({ getJwtToken: () => `guest-${guestId}` }),
      getAccessToken: () => ({ getJwtToken: () => `guest-${guestId}` }),
      getRefreshToken: () => ({ getToken: () => `guest-${guestId}` }),
      
      // Attributes for additional compatibility
      attributes: {
        sub: guestId,
        email: `${guestId}@guest.trioll.com`
      }
    };
  }

  /**
   * Safe login that won't crash
   */
  async login(credentials: unknown): Promise<unknown> {
    try {
      return await authService.login(credentials);
    } catch (error) {
      // Login failed
      throw error; // Re-throw for UI handling
    }
  }

  /**
   * Safe logout
   */
  async logout(): Promise<void> {
    try {
      await authService.logout();
    } catch (error) {
      // Logout error
    }

    // Clear guest ID on logout
    delete global.guestId;
  }
}

// Extend global types
declare global {
  var guestId: string | undefined;
}

// Export singleton instance
export const safeAuthService = new SafeAuthService();
export default SafeAuthService;
