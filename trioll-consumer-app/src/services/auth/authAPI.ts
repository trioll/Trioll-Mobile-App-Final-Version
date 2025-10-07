
/**
 * Main Authentication API
 * Single interface for all authentication operations
 * Uses authServiceAdapter to switch between mock and real auth
 */

import { authService } from './authServiceAdapter';
import { safeAuthService } from './safeAuthService';
import {
  LoginCredentials,
  LoginResponse,
  TwoFactorCredentials,
  TwoFactorResponse,
  RegisterCredentials,
  VerificationCredentials,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
} from '../../../types/auth';
import { sessionManager } from '../../../utils/sessionManager';
import { Config } from '../../config/environments';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AuthAPI');

class AuthAPI {
  /**
   * Login user with email/username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await authService.login(credentials);

      if (
        (response as any).success &&
        response.token &&
        response.refreshToken &&
        response.user
      ) {
        // Store session if login successful
        await sessionManager.saveSession(
          {
            accessToken: response.token,
            refreshToken: response.refreshToken,
            expiresAt: Date.now() + 3600000, // 1 hour
          },
          response.user
        );
      }

      return response;
    } catch {
      logger.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(credentials: TwoFactorCredentials): Promise<TwoFactorResponse> {
    try {
      const response = await authService.verifyTwoFactor(credentials);

      if (
        (response as any).success &&
        response.token &&
        response.refreshToken &&
        response.user
      ) {
        // Store session if verification successful
        await sessionManager.saveSession(
          {
            accessToken: response.token,
            refreshToken: response.refreshToken,
            expiresAt: Date.now() + 3600000,
          },
          response.user
        );
      }

      return response;
    } catch {
      logger.error('2FA verification error:', error);
      const message = error instanceof Error ? error.message : 'Verification failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<LoginResponse> {
    try {
      // Use test mode if in development
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev || Config.ENV !== 'production') {
        authService.enableTestMode();
      }

      const response = await authService.register(credentials);
      return response;
    } catch {
      logger.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(
    credentials: VerificationCredentials
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authService.verifyEmail(credentials);
      return response;
    } catch {
      logger.error('Email verification error:', error);
      const message = error instanceof Error ? error.message : 'Verification failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    credentials: ForgotPasswordCredentials
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authService.forgotPassword(credentials);
      return response;
    } catch {
      logger.error('Forgot password error:', error);
      const message = error instanceof Error ? error.message : 'Failed to send reset code';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Reset password with code
   */
  async resetPassword(
    credentials: ResetPasswordCredentials
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authService.resetPassword(credentials);
      return response;
    } catch {
      logger.error('Reset password error:', error);
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await authService.logout();
      await sessionManager.clearSession();
    } catch {
      logger.error('Logout error:', error);
      // Clear session even if logout fails
      await sessionManager.clearSession();
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<any> {
    try {
      const user = await safeAuthService.getCurrentUser();
      return user;
    } catch {
      logger.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await safeAuthService.isAuthenticated();
    } catch {
      logger.error('Auth check error:', error);
      return false;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const success = await authService.refreshTokens();
      return success;
    } catch {
      logger.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(_username: string): Promise<boolean> {
    try {
      // Not implemented in authService, always return true for now
      return true;
    } catch {
      logger.error('Username check error:', error);
      // Assume unavailable on error
      return false;
    }
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(_email: string): Promise<boolean> {
    try {
      // Not implemented in authService, always return true for now
      return true;
    } catch {
      logger.error('Email check error:', error);
      // Assume unavailable on error
      return false;
    }
  }
}

// Export singleton instance
export const authAPI = new AuthAPI();

// Also export the class for testing
export default AuthAPI;
