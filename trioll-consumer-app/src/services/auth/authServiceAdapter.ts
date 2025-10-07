
/**
 * Authentication Service Adapter
 * Bridges between UI components and real/mock authentication services
 */

import { Config } from '../../config/environments';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AuthServiceAdapter');

// Import auth services
import { mockAuthService } from './mockAuthService';
import { amplifyAuthAdapter } from './amplifyAuthAdapter';

// Use Amplify auth adapter for real AWS integration
const getCognitoService = () => {
  // Check if Amplify is configured
  const useAmplify = Config.USER_POOL_ID && Config.IDENTITY_POOL_ID;
  
  if (useAmplify) {
    logger.info('Using amplifyAuthAdapter for AWS integration');
    return amplifyAuthAdapter;
  }
  
  logger.info('Using mockAuthService as fallback');
  return mockAuthService;
};
import * as authApi from '../../../utils/authApi';
import {
  LoginCredentials,
  LoginResponse,
  TwoFactorCredentials,
  TwoFactorResponse,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
  RegisterCredentials,
  VerificationCredentials,
} from '../../../types/auth';
import { analyticsService } from '../monitoring/analyticsEnhanced';

class AuthServiceAdapter {
  private useMockAuth = Config.USE_MOCK_API;
  private isTestMode = false;

  constructor() {
    // Listen for environment changes
    this.setupEnvironmentListener();
  }

  /**
   * Setup environment change listener
   */
  private setupEnvironmentListener() {
    // Check environment on initialization
    this.updateAuthMode();
  }

  /**
   * Update authentication mode based on environment
   */
  private updateAuthMode() {
    this.useMockAuth = Config.USE_MOCK_API;

    logger.info(`Authentication mode: ${this.useMockAuth ? 'Mock' : 'Real AWS Cognito'}`);

    analyticsService.track('auth_mode_changed', {
      mode: this.useMockAuth ? 'mock' : 'cognito',
      environment: Config.ENV,
    });
  }

  /**
   * Enable test mode for safe testing
   */
  enableTestMode() {
    this.isTestMode = true;
    if (!this.useMockAuth) {
      getCognitoService().enableTestMode();
    }
  }

  /**
   * Switch to real authentication (for testing)
   */
  async switchToRealAuth(): Promise<boolean> {
    try {
      // For now, skip backend health check and assume connection is available
      // TODO: Implement a public method for checking backend health
      const canConnect = true;

      if (!canConnect) {
        logger.warn('Cannot connect to AWS Cognito, staying in mock mode');
        return false;
      }

      this.useMockAuth = false;
      this.updateAuthMode();
      return true;
    } catch {
      logger.error('Failed to switch to real auth:', error);
      return false;
    }
  }

  /**
   * Switch back to mock authentication
   */
  switchToMockAuth() {
    this.useMockAuth = true;
    this.updateAuthMode();
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      if (this.useMockAuth) {
        return await authApi.login(credentials);
      } else {
        const response = await getCognitoService().login(credentials);

        // Track real authentication
        analyticsService.track('real_auth_login', {
          success: response.success,
          requiresTwoFactor: response.requiresTwoFactor,
        });

        return response;
      }
    } catch {
      // If real auth fails, optionally fall back to mock
      if (!this.useMockAuth && Config.FEATURES.AUTH_FALLBACK) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Real auth failed, falling back to mock:', errorMessage);
        return await authApi.login(credentials);
      }
      throw error;
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(credentials: TwoFactorCredentials): Promise<TwoFactorResponse> {
    if (this.useMockAuth) {
      return await authApi.verifyTwoFactor(credentials.code, !!credentials.sessionToken);
    } else {
      const response = await getCognitoService().verifyMFA(
        credentials.code,
        credentials.sessionToken || ''
      );

      return {
        success: response.success,
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        message: response.message,
      };
    }
  }

  /**
   * Register new user
   */
  async register(
    credentials: RegisterCredentials
  ): Promise<{ success: boolean; userId?: string; requiresVerification: boolean }> {
    if (this.useMockAuth) {
      const response = await authApi.registerUser({
        email: credentials.email,
        username: credentials.username,
        password: credentials.password,
      });
      return {
        success: response.success,
        userId: response.userId,
        requiresVerification: true,
      };
    } else {
      const result = await getCognitoService().registerTestUser(credentials);
      return {
        success: true,
        userId: result.userId,
        requiresVerification: result.requiresVerification,
      };
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(credentials: VerificationCredentials): Promise<{ success: boolean; message?: string }> {
    if (this.useMockAuth) {
      const result = await authApi.verifyEmailCode(credentials.email, credentials.code);
      return { success: result.success, message: result.message };
    } else {
      const success = await getCognitoService().verifyEmail(credentials);
      return { success, message: success ? 'Email verified successfully' : 'Verification failed' };
    }
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(
    credentials: ForgotPasswordCredentials
  ): Promise<{ success: boolean; message?: string }> {
    if (this.useMockAuth) {
      return await authApi.sendPasswordResetEmail(credentials.email);
    } else {
      await getCognitoService().forgotPassword(credentials.email);
      return {
        success: true,
        message: 'Password reset code sent to your email',
      };
    }
  }

  /**
   * Reset password with code
   */
  async resetPassword(credentials: ResetPasswordCredentials): Promise<{ success: boolean }> {
    if (this.useMockAuth) {
      // authApi doesn't have a resetPassword method that matches this signature
      // For now, return success
      return { success: true };
    } else {
      const success = await getCognitoService().confirmPassword(
        credentials.email,
        credentials.code,
        credentials.newPassword
      );
      return { success };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<boolean> {
    try {
      if (this.useMockAuth) {
        // Mock auth always returns true for token refresh
        return true;
      } else {
        await getCognitoService().refreshTokens();
        return true;
      }
    } catch {
      logger.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    if (this.useMockAuth) {
      // Mock auth doesn't need explicit logout
      // Just clear local state
    } else {
      await getCognitoService().logout();
    }

    analyticsService.track('auth_logout', {
      authMode: this.useMockAuth ? 'mock' : 'cognito',
    });
  }

  /**
   * Get current authentication mode
   */
  getAuthMode(): 'mock' | 'cognito' {
    return this.useMockAuth ? 'mock' : 'cognito';
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.useMockAuth) {
      // Check mock auth state
      return true; // Mock always returns true for testing
    } else {
      const user = await getCognitoService().getCurrentUser();
      return !!user;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ id: string; email: string; name: string; emailVerified: boolean } | null> {
    if (this.useMockAuth) {
      // Return mock user
      return {
        id: 'mock-user-123',
        email: 'test@trioll.com',
        name: 'Test User',
        emailVerified: true,
      };
    } else {
      try {
        const cognitoUser = await getCognitoService().getCurrentUser();
        if (!cognitoUser) return null;

        // Get attributes
        return new Promise(resolve => {
          // Check if cognitoUser has getUserAttributes method
          if (typeof (cognitoUser as any).getUserAttributes !== 'function') {
            logger.debug('CognitoUser object does not have getUserAttributes method');
            resolve(null);
            return;
          }

          (cognitoUser as any).getUserAttributes((err: any, attributes: any) => {
            if (err) {
              resolve(null);
              return;
            }

            const userAttributes =
              attributes?.reduce(
                (acc, attr) => {
                  acc[attr.Name] = attr.Value;
                  return acc;
                },
                {} as Record<string, string>
              ) || {};

            resolve({
              id: userAttributes.sub,
              email: userAttributes.email,
              name: userAttributes.name || '',
              emailVerified: userAttributes.email_verified === 'true',
            });
          });
        });
      } catch {
        // Error getting current user
        return null;
      }
    }
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    if (this.useMockAuth) {
      return 'mock-user-123';
    } else {
      try {
        const user = await getCognitoService().getCurrentUser();
        if (!user) return null;

        return new Promise(resolve => {
          // Check if user has getUserAttributes method
          if (typeof (user as any).getUserAttributes !== 'function') {
            logger.debug('User object does not have getUserAttributes method');
            resolve(null);
            return;
          }

          (user as any).getUserAttributes((err: any, attributes: any) => {
            if (err) {
              resolve(null);
              return;
            }

            const sub = attributes?.find(attr => attr.Name === 'sub')?.Value;
            resolve(sub || null);
          });
        });
      } catch {
        // Error getting current user ID
        return null;
      }
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profile: { name?: string; avatar?: string }): Promise<{ id: string; email: string; name: string; emailVerified: boolean } | null> {
    if (this.useMockAuth) {
      // Return updated mock user
      return {
        id: 'mock-user-123',
        email: 'test@trioll.com',
        name: profile.name || 'Test User',
        emailVerified: true,
      };
    } else {
      // Implement Cognito profile update
      const cognitoService = getCognitoService();
      await cognitoService.updateUserAttributes(profile);
      return this.getCurrentUser();
    }
  }

  /**
   * Get ID token for API authentication
   */
  async getIdToken(): Promise<string | null> {
    if (this.useMockAuth) {
      // Return mock token for development
      return 'mock-id-token-' + Date.now();
    } else {
      try {
        const cognitoService = getCognitoService();
        if (!cognitoService || !cognitoService.getSession) {
          return null;
        }

        const session = await cognitoService.getSession();
        if (!session) return null;

        const idToken = (session as any).getIdToken();
        return idToken ? idToken.getJwtToken() : null;
      } catch {
        // Silently return null for expected authentication states
        return null;
      }
    }
  }
}

// Lazy initialization to prevent early instantiation
let _authService: AuthServiceAdapter | null = null;

export const getAuthService = (): AuthServiceAdapter => {
  if (!_authService) {
    _authService = new AuthServiceAdapter();
  }
  return _authService;
};

// Export singleton instance with lazy initialization
export const authService = new Proxy({} as AuthServiceAdapter, {
  get(target, prop) {
    return getAuthService()[prop as keyof AuthServiceAdapter];
  },
});

// Export for testing
export { AuthServiceAdapter };
