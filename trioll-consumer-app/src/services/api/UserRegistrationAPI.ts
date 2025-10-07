
/**
 * User Registration API Service
 * Handles secure user registration through AWS backend
 */

import { apiConfig, API_ENDPOINTS, buildApiUrl } from '../../config/apiConfig';
import { authTokenStorage } from '../../utils/secureStorage';
import { getLogger } from '../../utils/logger';
import { amplifyAuthService } from '../auth/amplifyAuthService';

const logger = getLogger('UserRegistrationAPI');

interface RegistrationData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface RegistrationResponse {
  success: boolean;
  userId?: string;
  requiresVerification?: boolean;
  message?: string;
}

interface VerificationData {
  email: string;
  code: string;
  password?: string;
}

interface VerificationResponse {
  success: boolean;
  message?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
  };
}

class UserRegistrationAPI {
  private apiBase: string;

  constructor() {
    this.apiBase = apiConfig.baseUrl;
  }

  /**
   * Register a new user account
   */
  async register(data: RegistrationData): Promise<RegistrationResponse> {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.register), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(result.message || 'An account with this email already exists');
        } else if (response.status === 400) {
          throw new Error(result.message || 'Invalid registration data');
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      }

      return result;
    } catch {
      logger.error('Registration API error:', error);
      throw error;
    }
  }

  /**
   * Verify email with confirmation code
   */
  async verifyEmail(data: VerificationData): Promise<VerificationResponse> {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.verify), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(result.message || 'Invalid verification code');
        } else {
          throw new Error(result.message || 'Verification failed');
        }
      }

      // Store tokens if verification successful
      if (result.tokens) {
        await authTokenStorage.save(result.tokens);
        
        // If we have the password, sign in with Amplify to update auth state
        if (data.password) {
          try {
            logger.info('Signing in user with Amplify after verification...');
            await amplifyAuthService.signInUser(data.email, data.password);
            logger.info('User signed in successfully after verification');
          } catch (signInError) {
            // Log but don't fail - tokens are already stored
            logger.warn('Could not sign in with Amplify after verification:', signInError);
          }
        }
      }

      return result;
    } catch {
      logger.error('Verification API error:', error);
      throw error;
    }
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(_email: string): Promise<{ available: boolean; message?: string }> {
    // For now, this is handled by the registration endpoint
    // In the future, we could add a dedicated endpoint
    return { available: true };
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(_username: string): Promise<{
    available: boolean;
    suggestions?: string[];
    message?: string;
  }> {
    // For now, this is handled by the registration endpoint
    // In the future, we could add a dedicated endpoint
    return { available: true };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend code');
      }

      return result;
    } catch {
      logger.error('Resend verification error:', error);
      throw error;
    }
  }

  /**
   * Get stored authentication tokens
   */
  async getTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
  } | null> {
    return authTokenStorage.get();
  }

  /**
   * Clear authentication tokens (logout)
   */
  async clearTokens(): Promise<void> {
    return authTokenStorage.clear();
  }
}

// Export singleton instance
export const userRegistrationAPI = new UserRegistrationAPI();
export default UserRegistrationAPI;
