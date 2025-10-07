/**
 * AWS Amplify Auth Service
 * Handles guest and authenticated user flows with AWS Cognito
 */

import { getCurrentUser, signIn, signUp, confirmSignUp, signOut, fetchAuthSession, AuthUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { getLogger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = getLogger('AmplifyAuthService');

const GUEST_IDENTITY_KEY = '@trioll/amplify_guest_identity';

export interface AmplifyCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
}

export interface AmplifyAuthState {
  isGuest: boolean;
  isAuthenticated: boolean;
  identityId: string | null;
  credentials: AmplifyCredentials | null;
  user: AuthUser | null;
}

class AmplifyAuthService {
  private currentState: AmplifyAuthState = {
    isGuest: true,
    isAuthenticated: false,
    identityId: null,
    credentials: null,
    user: null
  };

  /**
   * Initialize auth service and get current state
   */
  async initialize(): Promise<AmplifyAuthState> {
    try {
      logger.info('Initializing Amplify Auth Service...');
      
      // Check if user is authenticated
      try {
        const user = await getCurrentUser();
        this.currentState.user = user;
        this.currentState.isAuthenticated = true;
        this.currentState.isGuest = false;
        logger.info('Found authenticated user:', user.username);
      } catch {
        // No authenticated user, continue as guest
        this.currentState.isGuest = true;
        this.currentState.isAuthenticated = false;
        logger.info('No authenticated user, initializing as guest');
      }

      // Get current session (works for both guest and authenticated)
      logger.info('Fetching auth session...');
      const session = await fetchAuthSession();
      logger.info('Auth session fetched:', {
        hasIdentityId: !!session.identityId,
        hasCredentials: !!session.credentials,
        identityId: session.identityId
      });
      
      if (session.identityId) {
        this.currentState.identityId = session.identityId;
        
        // Store guest identity for persistence
        if (this.currentState.isGuest) {
          await AsyncStorage.setItem(GUEST_IDENTITY_KEY, session.identityId);
        }
      }
      
      // Extract credentials if available
      if (session.credentials) {
        this.currentState.credentials = {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken,
          expiration: session.credentials.expiration
        };
      }

      logger.info('Auth initialized:', {
        isGuest: this.currentState.isGuest,
        isAuthenticated: this.currentState.isAuthenticated,
        identityId: this.currentState.identityId,
        hasCredentials: !!this.currentState.credentials
      });

      // Setup auth event listener
      this.setupAuthListener();

      return { ...this.currentState };
    } catch {
      logger.error('Failed to initialize auth:', error);
      throw error;
    }
  }

  /**
   * Get current auth state
   */
  getCurrentState(): AmplifyAuthState {
    return { ...this.currentState };
  }

  /**
   * Get current credentials (refreshes if needed)
   */
  async getCurrentCredentials(): Promise<AmplifyCredentials | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      
      if (session.credentials) {
        this.currentState.credentials = {
          accessKeyId: session.credentials.accessKeyId,
          secretAccessKey: session.credentials.secretAccessKey,
          sessionToken: session.credentials.sessionToken,
          expiration: session.credentials.expiration
        };
        
        return this.currentState.credentials;
      }
      
      return null;
    } catch {
      logger.error('Failed to get credentials:', error);
      return null;
    }
  }

  /**
   * Sign in user
   */
  async signInUser(email: string, password: string) {
    try {
      const result = await signIn({ username: email, password });
      
      if (result.isSignedIn) {
        this.currentState.isGuest = false;
        this.currentState.isAuthenticated = true;
        
        // Get the authenticated user
        const user = await getCurrentUser();
        this.currentState.user = user;
        
        logger.info('User signed in:', user.username);
      }
      
      return result;
    } catch {
      logger.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign up new user
   */
  async signUpUser(email: string, password: string) {
    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      
      logger.info('User signed up:', result.userId);
      return result;
    } catch {
      logger.error('Sign up failed:', error);
      throw error;
    }
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUpUser(email: string, code: string) {
    try {
      const result = await confirmSignUp({ username: email, confirmationCode: code });
      logger.info('Sign up confirmed for:', email);
      return result;
    } catch {
      logger.error('Confirm sign up failed:', error);
      throw error;
    }
  }

  /**
   * Sign out current user (reverts to guest)
   */
  async signOutUser() {
    try {
      await signOut();
      
      // Reset to guest state
      this.currentState.isGuest = true;
      this.currentState.isAuthenticated = false;
      this.currentState.user = null;
      
      // Re-initialize to get guest credentials
      await this.initialize();
      
      logger.info('User signed out, reverted to guest mode');
    } catch {
      logger.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get identity ID (for both guest and authenticated users)
   */
  getIdentityId(): string | null {
    return this.currentState.identityId;
  }

  /**
   * Check if current user is guest
   */
  isGuest(): boolean {
    return this.currentState.isGuest;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  /**
   * Get stored guest identity (for data migration)
   */
  async getStoredGuestIdentity(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(GUEST_IDENTITY_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Clear guest identity (after successful migration)
   */
  async clearGuestIdentity(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GUEST_IDENTITY_KEY);
    } catch {
      logger.error('Failed to clear guest identity:', error);
    }
  }

  /**
   * Setup auth state change listener
   */
  private setupAuthListener() {
    Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          logger.info('Auth event: User signed in');
          this.currentState.isGuest = false;
          this.currentState.isAuthenticated = true;
          break;
          
        case 'signedOut':
          logger.info('Auth event: User signed out');
          this.currentState.isGuest = true;
          this.currentState.isAuthenticated = false;
          this.currentState.user = null;
          break;
          
        case 'tokenRefresh':
          logger.info('Auth event: Token refreshed');
          break;
          
        case 'tokenRefresh_failure':
          logger.error('Auth event: Token refresh failed');
          break;
          
        default:
          logger.debug('Auth event:', payload.event);
      }
    });
  }
}

// Export singleton instance
export const amplifyAuthService = new AmplifyAuthService();

// Export convenience functions
export const isAmplifyGuest = () => amplifyAuthService.isGuest();
export const getAmplifyIdentityId = () => amplifyAuthService.getIdentityId();
export const getAmplifyCredentials = () => amplifyAuthService.getCurrentCredentials();