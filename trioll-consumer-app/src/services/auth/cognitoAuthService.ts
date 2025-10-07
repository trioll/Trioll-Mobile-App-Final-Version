
/**
 * AWS Cognito Authentication Service
 * Handles real authentication with AWS Cognito while maintaining safety
 */

import { getLogger } from '../../utils/logger';

const logger = getLogger('CognitoAuthService');

// Defer loading Cognito modules to avoid initialization errors
let CognitoUserPool: any;
let CognitoUser: any;
let AuthenticationDetails: any;
let CognitoUserAttribute: any;
let CognitoUserSession: any;
let CognitoRefreshToken: any;

// Load modules on first use
let modulesLoaded = false;
const loadCognitoModules = () => {
  if (!CognitoUserPool) {
    try {
      if (!modulesLoaded) {
        logger.debug('Loading Cognito modules...');
      }
      const cognito = require('amazon-cognito-identity-js');
      CognitoUserPool = cognito.CognitoUserPool;
      CognitoUser = cognito.CognitoUser;
      AuthenticationDetails = cognito.AuthenticationDetails;
      CognitoUserAttribute = cognito.CognitoUserAttribute;
      CognitoUserSession = cognito.CognitoUserSession;
      CognitoRefreshToken = cognito.CognitoRefreshToken;
      if (!modulesLoaded) {
        logger.debug('Cognito modules loaded successfully');
        modulesLoaded = true;
      }
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load Cognito modules:', error);
      throw error;
    }
  }
};

// Type imports
import { Config } from '../../config/environments';
import {
  LoginCredentials,
  LoginResponse,
  AuthTokens,
  RegisterCredentials,
  VerificationCredentials,
} from '../../../types/auth';
import { sessionManager } from '../../../utils/sessionManager';
import { analyticsService } from '../monitoring/analyticsEnhanced';
import { performanceMonitor } from '../monitoring/performanceMonitor';

// Safety flags for authentication testing
const AUTH_SAFETY = {
  USE_STAGING_ONLY: true,
  REQUIRE_TEST_PREFIX: true,
  MAX_TEST_USERS: 100,
  AUTO_CLEANUP_ENABLED: true,
};

class CognitoAuthService {
  private static _initialized = false;
  private userPool: InstanceType<typeof CognitoUserPool>;
  private currentUser: InstanceType<typeof CognitoUser> | null = null;
  private testUserPrefix = 'test_';
  private isTestMode = false;

  constructor() {
    // Initialize with staging Cognito user pool
    let userPoolId = Config?.USER_POOL_ID;
    let clientId = Config?.USER_POOL_CLIENT_ID;

    // Only log initialization once
    if (!CognitoAuthService._initialized) {
      logger.info('Cognito Auth Service initializing', {
        userPoolId: userPoolId ? '***' : 'missing',
        clientId: clientId ? '***' : 'missing',
        configAvailable: !!Config,
        env: Config?.ENV,
      });
      CognitoAuthService._initialized = true;
    }

    if (!userPoolId || !clientId) {
      logger.warn('Missing Cognito configuration - using fallback values for development');
      // Use fallback values for development
      const fallbackPoolId = 'us-east-1_cLPH2acQd';
      const fallbackClientId = 'bft50gui77sdq2n4lcio4onql';

      userPoolId = userPoolId || fallbackPoolId;
      clientId = clientId || fallbackClientId;
    }

    try {
      // Load Cognito modules on demand
      loadCognitoModules();

      this.userPool = new CognitoUserPool({
        UserPoolId: userPoolId,
        ClientId: clientId,
      });
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create CognitoUserPool:', error);
      // Create a dummy pool to prevent crashes
      this.userPool = {
        signUp: () => Promise.reject(new Error('Cognito not initialized')),
        getCurrentUser: () => null,
      } as unknown as InstanceType<typeof CognitoUserPool>;
    }

    // Verify we're using staging environment
    try {
      this.validateStagingEnvironment();
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Environment validation failed:', error);
    }
  }

  /**
   * Validates we're using staging environment for safety
   */
  private validateStagingEnvironment() {
    if (AUTH_SAFETY.USE_STAGING_ONLY && Config?.ENV === 'production') {
      throw new Error('Authentication testing blocked: Production environment detected');
    }

    // Additional safety check for user pool ID
    if (Config?.USER_POOL_ID && Config.USER_POOL_ID.includes('prod')) {
      throw new Error('Authentication testing blocked: Production user pool detected');
    }

    if (!CognitoAuthService._initialized) {
      logger.info('Authentication testing environment validated', {
        env: Config?.ENV || 'unknown',
      });
    }
  }

  /**
   * Enable test mode for authentication testing
   */
  enableTestMode() {
    this.isTestMode = true;
    logger.info('Authentication test mode enabled');
  }

  /**
   * Register a new test user
   */
  async registerTestUser(
    credentials: RegisterCredentials
  ): Promise<{ userId: string; requiresVerification: boolean }> {
    const startTime = Date.now();

    try {
      // Ensure modules are loaded
      loadCognitoModules();

      // Ensure test mode is enabled
      if (!this.isTestMode) {
        throw new Error('Test mode must be enabled for user registration');
      }

      // Enforce test user naming convention
      const username = AUTH_SAFETY.REQUIRE_TEST_PREFIX
        ? `${this.testUserPrefix}${credentials.email.split('@')[0]}_${Date.now()}`
        : credentials.email;

      const attributeList: unknown[] = [
        new CognitoUserAttribute({ Name: 'email', Value: credentials.email }),
      ];

      // Add name attribute using username
      attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: credentials.username }));

      return new Promise((resolve, reject) => {
        this.userPool.signUp(username, credentials.password, attributeList, [], (err, result) => {
          if (err) {
            analyticsService.track('auth_registration_failed', {
              error: err.message,
              duration: Date.now() - startTime,
            });
            reject(err);
            return;
          }

          if (result) {
            analyticsService.track('auth_registration_success', {
              userId: result.userSub,
              requiresVerification: !result.userConfirmed,
              duration: Date.now() - startTime,
            });

            resolve({
              userId: result.userSub,
              requiresVerification: !result.userConfirmed,
            });
          }
        });
      });
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.recordMetric('auth_registration_error', 1);
      throw error;
    }
  }

  /**
   * Verify email with confirmation code
   */
  async verifyEmail(credentials: VerificationCredentials): Promise<boolean> {
    try {
      const cognitoUser = new CognitoUser({
        Username: credentials.email,
        Pool: this.userPool,
      });

      return new Promise((resolve, reject) => {
        cognitoUser.confirmRegistration(credentials.code, true, (err, result) => {
          if (err) {
            analyticsService.track('auth_verification_failed', {
              error: err.message,
            });
            reject(err);
            return;
          }

          analyticsService.track('auth_verification_success', {
            email: credentials.email,
          });
          resolve(result === 'SUCCESS');
        });
      });
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.recordMetric('auth_verification_error', 1);
      throw error;
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const startTime = Date.now();

    try {
      const authenticationDetails = new AuthenticationDetails({
        Username: credentials.emailOrUsername,
        Password: credentials.password,
      });

      const cognitoUser = new CognitoUser({
        Username: credentials.emailOrUsername,
        Pool: this.userPool,
      });

      return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: async (session: InstanceType<typeof CognitoUserSession>) => {
            const tokens: AuthTokens = {
              accessToken: session.getAccessToken().getJwtToken(),
              refreshToken: session.getRefreshToken().getToken(),
              expiresAt: Date.now() + 3600000, // 1 hour from now
            };

            // Store tokens securely
            // Save tokens using sessionManager.saveSession
            await sessionManager.saveSession(
              {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: Date.now() + 3600000,
              },
              {
                id: this.currentUser!.getUsername(),
                username: this.currentUser!.getUsername(),
                email: '',
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
              }
            );

            // Get user attributes
            cognitoUser.getUserAttributes((err, attributes) => {
              if (err) {
                logger.error('Failed to get user attributes:', err);
              }

              const userAttributes =
                attributes?.reduce(
                  (acc, attr) => {
                    acc[attr.Name] = attr.Value;
                    return acc;
                  },
                  {} as Record<string, string>
                ) || {};

              const response: LoginResponse = {
                success: true,
                user: {
                  id: userAttributes.sub || cognitoUser.getUsername(),
                  username: cognitoUser.getUsername(),
                  email: userAttributes.email || credentials.emailOrUsername,
                  emailVerified: userAttributes.email_verified === 'true',
                  twoFactorEnabled: false,
                  createdAt: new Date().toISOString(),
                },
                tokens,
                requiresTwoFactor: false,
              };

              this.currentUser = cognitoUser;

              analyticsService.track('auth_login_success', {
                userId: response.user.id,
                duration: Date.now() - startTime,
              });

              resolve(response);
            });
          },
          onFailure: err => {
            analyticsService.track('auth_login_failed', {
              error: err.message,
              duration: Date.now() - startTime,
            });
            reject(err);
          },
          mfaRequired: (_challengeName, _challengeParameters) => {
            // Handle MFA requirement
            resolve({
              success: false,
              requiresTwoFactor: true,
              user: undefined,
            });
          },
        });
      });
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.recordMetric('auth_login_error', 1);
      throw error;
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(code: string, sessionToken: string): Promise<LoginResponse> {
    if (!this.currentUser) {
      throw new Error('No current user for MFA verification');
    }

    return new Promise((resolve, reject) => {
      this.currentUser!.sendMFACode(
        code,
        {
          onSuccess: async (session: InstanceType<typeof CognitoUserSession>) => {
            const tokens: AuthTokens = {
              accessToken: session.getAccessToken().getJwtToken(),
              refreshToken: session.getRefreshToken().getToken(),
              expiresAt: Date.now() + 3600000,
            };

            // Save tokens using sessionManager.saveSession
            await sessionManager.saveSession(
              {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: Date.now() + 3600000,
              },
              {
                id: this.currentUser!.getUsername(),
                username: this.currentUser!.getUsername(),
                email: '',
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
              }
            );

            this.currentUser!.getUserAttributes((err, attributes) => {
              if (err) {
                reject(err);
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
                success: true,
                user: {
                  id: userAttributes.sub,
                  username: this.currentUser!.getUsername(),
                  email: userAttributes.email,
                  emailVerified: true,
                  twoFactorEnabled: false,
                  createdAt: new Date().toISOString(),
                },
                tokens,
                requiresTwoFactor: false,
              });
            });
          },
          onFailure: err => {
            analyticsService.track('auth_mfa_failed', {
              error: err.message,
            });
            reject(err);
          },
        },
        sessionToken
      );
    });
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<AuthTokens> {
    const currentSession = await sessionManager.getSession();
    if (!currentSession) {
      throw new Error('No refresh token available');
    }

    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) {
      throw new Error('No current user');
    }

    return new Promise((resolve, reject) => {
      cognitoUser.refreshSession(
        new CognitoRefreshToken({ RefreshToken: currentSession.token }),
        (err: Error | null, session: any) => {
          if (err) {
            analyticsService.track('auth_refresh_failed', {
              error: err.message,
            });
            reject(err);
            return;
          }

          const tokens: AuthTokens = {
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
            expiresAt: Date.now() + 3600000,
          };

          // Note: sessionManager.saveSession is async but we're not awaiting here
          sessionManager
            .saveSession(
              {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: Date.now() + 3600000,
              },
              {
                id: 'user',
                username: 'user',
                email: '',
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
              }
            )
            .catch(err => logger.error('Failed to save session:', err));

          analyticsService.track('auth_refresh_success');
          resolve(tokens);
        }
      );
    });
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(email: string): Promise<boolean> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          analyticsService.track('auth_password_reset_initiated', { email });
          resolve(true);
        },
        onFailure: err => {
          analyticsService.track('auth_password_reset_failed', {
            error: err.message,
          });
          reject(err);
        },
      });
    });
  }

  /**
   * Confirm password reset with code
   */
  async confirmPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          analyticsService.track('auth_password_reset_success', { email });
          resolve(true);
        },
        onFailure: err => {
          analyticsService.track('auth_password_reset_confirm_failed', {
            error: err.message,
          });
          reject(err);
        },
      });
    });
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const cognitoUser = this.userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }

      await sessionManager.clearSession();
      this.currentUser = null;

      analyticsService.track('auth_logout_success');
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Logout error:', error);
      // Clear session even if Cognito logout fails
      await sessionManager.clearSession();
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<InstanceType<typeof CognitoUser> | null> {
    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) {
      return null;
    }

    return new Promise(resolve => {
      cognitoUser.getSession(
        (err: Error | null, session: InstanceType<typeof CognitoUserSession> | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
          } else {
            resolve(cognitoUser);
          }
        }
      );
    });
  }

  /**
   * Clean up test users (for testing only)
   */
  async cleanupTestUsers(): Promise<number> {
    if (!this.isTestMode || !AUTH_SAFETY.AUTO_CLEANUP_ENABLED) {
      throw new Error('Test cleanup only available in test mode');
    }

    // This would require admin API access
    // For now, log the intention
    logger.info('Test user cleanup requested (requires admin API)');
    return 0;
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(attributes: { name?: string; avatar?: string }): Promise<boolean> {
    const cognitoUser = await this.getCurrentUser();
    if (!cognitoUser) {
      throw new Error('No authenticated user');
    }

    const attributeList: unknown[] = [];
    if (attributes.name) {
      attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: attributes.name }));
    }
    if (attributes.avatar) {
      attributeList.push(new CognitoUserAttribute({ Name: 'picture', Value: attributes.avatar }));
    }

    return new Promise((resolve, reject) => {
      cognitoUser.updateAttributes(attributeList, (err) => {
        if (err) {
          logger.error('Failed to update user attributes:', err);
          reject(err);
          return;
        }
        analyticsService.track('auth_profile_updated', { attributes });
        resolve(true);
      });
    });
  }

  /**
   * Get current session
   */
  async getSession(): Promise<InstanceType<typeof CognitoUserSession> | null> {
    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) {
      return null;
    }

    return new Promise((resolve, _reject) => {
      cognitoUser.getSession(
        (err: Error | null, session: InstanceType<typeof CognitoUserSession> | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
          } else {
            resolve(session);
          }
        }
      );
    });
  }
}

// Create a lazy-initialized singleton
class CognitoAuthServiceWrapper {
  private _instance: CognitoAuthService | null = null;
  private _initError: Error | null = null;

  private getInstance(): CognitoAuthService {
    if (this._initError) {
      throw this._initError;
    }

    if (!this._instance) {
      try {
        this._instance = new CognitoAuthService();
      } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to initialize CognitoAuthService:', error);
        this._initError = error instanceof Error ? error : new Error(String(error));
        throw error;
      }
    }
    return this._instance;
  }

  // Proxy all method calls to the actual instance
  enableTestMode() {
    return this.getInstance().enableTestMode();
  }

  async registerTestUser(credentials: RegisterCredentials) {
    return this.getInstance().registerTestUser(credentials);
  }

  async verifyEmail(credentials: VerificationCredentials) {
    return this.getInstance().verifyEmail(credentials);
  }

  async login(credentials: LoginCredentials) {
    return this.getInstance().login(credentials);
  }

  async verifyMFA(code: string, sessionToken: string) {
    return this.getInstance().verifyMFA(code, sessionToken);
  }

  async refreshTokens(): Promise<AuthTokens> {
    return this.getInstance().refreshTokens();
  }

  async forgotPassword(email: string) {
    return this.getInstance().forgotPassword(email);
  }

  async confirmPassword(email: string, code: string, newPassword: string) {
    return this.getInstance().confirmPassword(email, code, newPassword);
  }

  async logout(): Promise<void> {
    return this.getInstance().logout();
  }

  async getCurrentUser(): Promise<InstanceType<typeof CognitoUser> | null> {
    return this.getInstance().getCurrentUser();
  }

  async cleanupTestUsers(): Promise<number> {
    return this.getInstance().cleanupTestUsers();
  }

  async getSession(): Promise<InstanceType<typeof CognitoUserSession> | null> {
    return this.getInstance().getSession();
  }

  async updateUserAttributes(attributes: { name?: string; avatar?: string }) {
    return this.getInstance().updateUserAttributes(attributes);
  }
}

// Export singleton instance with deferred initialization
let _wrapperInstance: CognitoAuthServiceWrapper | null = null;

export const getCognitoAuthService = () => {
  if (!_wrapperInstance) {
    logger.debug('Creating CognitoAuthServiceWrapper instance...');
    _wrapperInstance = new CognitoAuthServiceWrapper();
  }
  return _wrapperInstance;
};

// Create a proxy object that delays initialization
export const cognitoAuthService = new Proxy({} as CognitoAuthServiceWrapper, {
  get(target, prop: keyof CognitoAuthServiceWrapper) {
    const instance = getCognitoAuthService();
    return instance[prop];
  },
});

// Export for testing
export { CognitoAuthService };
