
/**
 * Registration Service
 * Intelligently switches between mock and real backend based on configuration
 */

import { userRegistrationAPI } from './UserRegistrationAPI';
import * as mockAuthApi from '../../../utils/authApi';
import { apiConfig } from '../../config/apiConfig';

interface RegistrationServiceConfig {
  useMockInDev: boolean;
  forceBackend: boolean;
}

class RegistrationService {
  private config: RegistrationServiceConfig = {
    useMockInDev: true, // Use mock API in development by default
    forceBackend: false, // Force real backend even in development
  };

  /**
   * Check if we should use the real backend
   */
  private shouldUseBackend(): boolean {
    // Force backend if configured
    if (this.config.forceBackend) {
      return true;
    }

    // Use mock in development unless feature flag is set
    if (__DEV__ && this.config.useMockInDev && !apiConfig.features.useBackendRegistration) {
      return false;
    }

    // Use backend in production or if feature flag is enabled
    return apiConfig.features.useBackendRegistration;
  }

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) {
    if (this.shouldUseBackend()) {
      // Use real backend API
      return userRegistrationAPI.register(data);
    } else {
      // Use mock API for development
      const result = await mockAuthApi.registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
      });

      return {
        success: (result as any).success,
        userId: result.userId,
        requiresVerification: true,
        message: result.message,
      };
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(data: { email: string; code: string; password?: string }) {
    if (this.shouldUseBackend()) {
      // Use real backend API
      return userRegistrationAPI.verifyEmail(data);
    } else {
      // Use mock API for development
      const result = await mockAuthApi.verifyEmailCode(data.email, data.code);

      // Simulate token response
      if ((result as any).success) {
        return {
          success: true,
          message: 'Email verified successfully',
          tokens: {
            accessToken: result.token || `mock_access_${Date.now()}`,
            refreshToken: `mock_refresh_${Date.now()}`,
            idToken: result.token || `mock_id_${Date.now()}`,
            expiresIn: 3600,
          },
        };
      }

      return {
        success: false,
        message: result.message || 'Verification failed',
      };
    }
  }

  /**
   * Check email availability
   */
  async checkEmailAvailability(email: string) {
    if (this.shouldUseBackend()) {
      // Use real backend API
      return userRegistrationAPI.checkEmailAvailability(email);
    } else {
      // Use mock API
      return mockAuthApi.checkEmailAvailability(email);
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username: string) {
    if (this.shouldUseBackend()) {
      // Use real backend API
      return userRegistrationAPI.checkUsernameAvailability(username);
    } else {
      // Use mock API
      return mockAuthApi.checkUsernameAvailability(username);
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string) {
    if (this.shouldUseBackend()) {
      // Use real backend API
      return userRegistrationAPI.resendVerificationCode(email);
    } else {
      // Use mock API
      return mockAuthApi.resendVerificationCode(email);
    }
  }

  /**
   * Configure the service
   */
  configure(config: Partial<RegistrationServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ...this.config,
      usingBackend: this.shouldUseBackend(),
      environment: apiConfig.env,
    };
  }
}

// Export singleton instance
export const registrationService = new RegistrationService();

// Also export for testing
export { RegistrationService };
