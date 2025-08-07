/**
 * Mock Authentication Service
 * UI-First implementation that simulates authentication without AWS Cognito
 */

import { getLogger } from '../../utils/logger';
import {
  LoginCredentials,
  LoginResponse,
  AuthTokens,
  RegisterCredentials,
  VerificationCredentials,
} from '../../../types/auth';
import { sessionManager } from '../../../utils/sessionManager';
import { analyticsService } from '../monitoring/analyticsEnhanced';

const logger = getLogger('MockAuthService');

// Mock user database
const mockUsers = new Map<string, {
  id: string;
  email: string;
  password: string;
  emailVerified: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
}>();

// Mock verification codes
const mockVerificationCodes = new Map<string, string>();

class MockAuthService {
  private currentUser: any = null;

  constructor() {
    logger.info('Mock Auth Service initialized - UI-first mode');
    
    // Add some default test users
    this.addMockUser('test@example.com', 'password123');
    this.addMockUser('demo@trioll.com', 'demo123');
  }

  private addMockUser(email: string, password: string) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mockUsers.set(email, {
      id: userId,
      email,
      password,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
    });
  }

  async registerTestUser(credentials: RegisterCredentials): Promise<{ userId: string; requiresVerification: boolean }> {
    const startTime = Date.now();

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if user already exists
      if (mockUsers.has(credentials.email)) {
        throw new Error('User already exists');
      }

      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      mockUsers.set(credentials.email, {
        id: userId,
        email: credentials.email,
        password: credentials.password,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        twoFactorEnabled: false,
      });

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      mockVerificationCodes.set(credentials.email, verificationCode);
      logger.info(`Mock verification code for ${credentials.email}: ${verificationCode}`);

      analyticsService.track('auth_registration_success', {
        userId,
        requiresVerification: true,
        duration: Date.now() - startTime,
      });

      return {
        userId,
        requiresVerification: true,
      };
    } catch (error) {
      analyticsService.track('auth_registration_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async verifyEmail(credentials: VerificationCredentials): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const storedCode = mockVerificationCodes.get(credentials.email);
    if (!storedCode || storedCode !== credentials.code) {
      throw new Error('Invalid verification code');
    }

    const user = mockUsers.get(credentials.email);
    if (user) {
      user.emailVerified = true;
      mockVerificationCodes.delete(credentials.email);
    }

    analyticsService.track('auth_verification_success', {
      email: credentials.email,
    });

    return true;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const startTime = Date.now();

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Find user by email
      const user = mockUsers.get(credentials.emailOrUsername);
      
      if (!user || user.password !== credentials.password) {
        throw new Error('Invalid credentials');
      }

      // Generate mock tokens
      const tokens: AuthTokens = {
        accessToken: `mock_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken: `mock_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: Date.now() + 3600000, // 1 hour
      };

      // Save session
      await sessionManager.saveSession(tokens, {
        id: user.id,
        username: credentials.emailOrUsername,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      });

      this.currentUser = user;

      const response: LoginResponse = {
        success: true,
        user: {
          id: user.id,
          username: user.email.split('@')[0],
          email: user.email,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
        },
        tokens,
        requiresTwoFactor: false,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      analyticsService.track('auth_login_success', {
        userId: user.id,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      analyticsService.track('auth_login_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  async verifyMFA(code: string, _sessionToken: string): Promise<LoginResponse> {
    // Mock MFA verification
    await new Promise(resolve => setTimeout(resolve, 300));

    if (code !== '123456') {
      throw new Error('Invalid MFA code');
    }

    const tokens: AuthTokens = {
      accessToken: `mock_access_mfa_${Date.now()}`,
      refreshToken: `mock_refresh_mfa_${Date.now()}`,
      expiresAt: Date.now() + 3600000,
    };

    return {
      success: true,
      user: {
        id: 'mock_user_id',
        username: 'user',
        email: 'user@example.com',
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: new Date().toISOString(),
      },
      tokens,
      requiresTwoFactor: false,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(): Promise<AuthTokens> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const newTokens: AuthTokens = {
      accessToken: `mock_access_refreshed_${Date.now()}`,
      refreshToken: `mock_refresh_refreshed_${Date.now()}`,
      expiresAt: Date.now() + 3600000,
    };

    analyticsService.track('auth_refresh_success');
    return newTokens;
  }

  async forgotPassword(email: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!mockUsers.has(email)) {
      throw new Error('User not found');
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    mockVerificationCodes.set(`reset_${email}`, resetCode);
    logger.info(`Mock password reset code for ${email}: ${resetCode}`);

    analyticsService.track('auth_password_reset_initiated', { email });
    return true;
  }

  async confirmPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const storedCode = mockVerificationCodes.get(`reset_${email}`);
    if (!storedCode || storedCode !== code) {
      throw new Error('Invalid reset code');
    }

    const user = mockUsers.get(email);
    if (user) {
      user.password = newPassword;
      mockVerificationCodes.delete(`reset_${email}`);
    }

    analyticsService.track('auth_password_reset_success', { email });
    return true;
  }

  async logout(): Promise<void> {
    await sessionManager.clearSession();
    this.currentUser = null;
    analyticsService.track('auth_logout_success');
  }

  async getCurrentUser(): Promise<unknown> {
    const session = await sessionManager.getSession();
    if (!session || !this.currentUser) {
      return null;
    }
    return this.currentUser;
  }

  async getSession(): Promise<unknown> {
    const session = await sessionManager.getSession();
    if (!session) {
      return null;
    }

    // Mock session doesn't have expiresAt in the session object from sessionManager
    // Just return a valid session
    return {
      isValid: () => true,
      getAccessToken: () => ({
        getJwtToken: () => session.token,
      }),
      getRefreshToken: () => ({
        getToken: () => 'mock_refresh_token',
      }),
    };
  }

  async updateUserAttributes(attributes: { name?: string; avatar?: string }): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update mock user attributes
    if (this.currentUser) {
      if (attributes.name) {
        this.currentUser.name = attributes.name;
      }
      if (attributes.avatar) {
        this.currentUser.avatar = attributes.avatar;
      }
    }
    
    analyticsService.track('auth_profile_updated', { attributes });
    return true;
  }

  // Test mode methods
  enableTestMode() {
    logger.info('Mock auth test mode enabled');
  }

  async cleanupTestUsers(): Promise<number> {
    const count = mockUsers.size;
    mockUsers.clear();
    mockVerificationCodes.clear();
    
    // Re-add default users
    this.addMockUser('test@example.com', 'password123');
    this.addMockUser('demo@trioll.com', 'demo123');
    
    return count - 2;
  }
}

// Export singleton instance
export const mockAuthService = new MockAuthService();

// Export mock auth service as cognitoAuthService for compatibility
export const cognitoAuthService = mockAuthService;

// Export for testing
export { MockAuthService };