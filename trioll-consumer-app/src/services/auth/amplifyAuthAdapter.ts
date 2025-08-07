/**
 * Amplify Auth Adapter
 * Adapts Amplify auth to work with existing safeAuthService interface
 * This ensures UI components don't need to change
 */

import { amplifyAuthService } from './amplifyAuthService';
import { 
  LoginCredentials, 
  RegisterCredentials, 
  VerificationCredentials,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
  LoginResponse,
  TwoFactorResponse
} from '../../types/auth.types';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AmplifyAuthAdapter');

class AmplifyAuthAdapter {
  /**
   * Login user - adapts to Amplify
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const result = await amplifyAuthService.signInUser(
        credentials.email,
        credentials.password
      );
      
      const state = amplifyAuthService.getCurrentState();
      
      return {
        success: result.isSignedIn,
        requiresTwoFactor: false, // Amplify handles MFA differently
        user: state.user ? {
          id: state.identityId || '',
          email: credentials.email,
          username: credentials.email,
          isGuest: false
        } : undefined,
        tokens: state.credentials ? {
          idToken: '', // Amplify manages tokens internally
          accessToken: '',
          refreshToken: ''
        } : undefined
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<{ userId: string; requiresVerification: boolean }> {
    try {
      const result = await amplifyAuthService.signUpUser(
        credentials.email,
        credentials.password
      );
      
      return {
        userId: result.userId || credentials.email,
        requiresVerification: !result.isSignUpComplete
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(credentials: VerificationCredentials): Promise<boolean> {
    try {
      const result = await amplifyAuthService.confirmSignUpUser(
        credentials.email,
        credentials.code
      );
      
      return result.isSignUpComplete;
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const state = amplifyAuthService.getCurrentState();
    
    // For guest users, return a guest-compatible user object
    if (state.isGuest && state.identityId) {
      return {
        getUsername: () => `guest_${state.identityId}`,
        getIdToken: () => ({ getJwtToken: () => 'guest-token' }),
        getAccessToken: () => ({ getJwtToken: () => 'guest-token' }),
        getRefreshToken: () => ({ getToken: () => 'guest-token' }),
        // Additional properties for compatibility
        username: `guest_${state.identityId}`,
        attributes: {
          sub: state.identityId,
          email: 'guest@trioll.com'
        }
      };
    }
    
    // For authenticated users
    if (!state.isAuthenticated || !state.user) {
      return null;
    }
    
    // Return a user object compatible with existing code
    return {
      getUsername: () => state.user?.username || '',
      getIdToken: () => ({ getJwtToken: () => '' }), // Amplify manages tokens
      getAccessToken: () => ({ getJwtToken: () => '' }),
      getRefreshToken: () => ({ getToken: () => '' }),
      // Additional properties for compatibility
      username: state.user?.username || '',
      attributes: state.user?.attributes || {}
    };
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    const state = amplifyAuthService.getCurrentState();
    return state.identityId;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return amplifyAuthService.isAuthenticated();
  }

  /**
   * Get session (for compatibility)
   */
  async getSession() {
    const state = amplifyAuthService.getCurrentState();
    
    if (!state.isAuthenticated) {
      throw new Error('No active session');
    }
    
    return {
      isValid: () => true,
      getIdToken: () => ({ getJwtToken: () => '' }),
      getAccessToken: () => ({ getJwtToken: () => '' }),
      getRefreshToken: () => ({ getToken: () => '' })
    };
  }

  /**
   * Get ID token (for API calls)
   */
  async getIdToken(): Promise<string | null> {
    // With Amplify, we don't directly manage tokens
    // API calls will use Amplify's built-in auth
    const state = amplifyAuthService.getCurrentState();
    return state.isAuthenticated ? 'amplify-managed-token' : null;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await amplifyAuthService.signOutUser();
  }

  /**
   * Check if guest
   */
  isGuest(): boolean {
    return amplifyAuthService.isGuest();
  }

  // Stub methods for features not yet implemented
  async verifyTwoFactor(credentials: any): Promise<TwoFactorResponse> {
    throw new Error('Two-factor auth not implemented with Amplify yet');
  }

  async forgotPassword(credentials: ForgotPasswordCredentials): Promise<{ success: boolean }> {
    // Amplify has resetPassword flow
    logger.warn('Forgot password not fully implemented');
    return { success: false };
  }

  async resetPassword(credentials: ResetPasswordCredentials): Promise<{ success: boolean }> {
    logger.warn('Reset password not fully implemented');
    return { success: false };
  }

  async refreshToken(): Promise<boolean> {
    // Amplify handles token refresh automatically
    return true;
  }
}

export const amplifyAuthAdapter = new AmplifyAuthAdapter();