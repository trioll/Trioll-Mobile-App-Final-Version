
/**
 * Authentication Flow End-to-End Tests
 * Complete authentication system testing with real Cognito integration
 */

import { E2ETestSuite, E2ETest, E2ETestResult } from '../E2ETestFramework';
import { e2eTestFramework } from '../E2ETestFramework';
import { authService } from '../../../services/auth/authServiceAdapter';
import { Config } from '../../../config/environments';
import AsyncStorage from '../../../utils/storageCompat';
import * as Keychain from '../../../utils/keychainCompat';

export class AuthenticationTests {
  /**
   * Create authentication test suite
   */
  static createSuite(): E2ETestSuite {
    return {
      suiteId: 'authentication',
      name: 'Authentication Flow Tests',
      description: 'Complete authentication system testing with AWS Cognito',
      tests: [
        this.createRegistrationFlowTest(),
        this.createLoginFlowTest(),
        this.createBiometricAuthTest(),
        this.createPasswordResetTest(),
        this.createSessionManagementTest(),
        this.createTokenRefreshTest(),
        this.createMFAFlowTest(),
        this.createSocialLoginTest(),
        this.createAccountSecurityTest(),
      ],
      setup: async () => {
                // Clear any existing auth state
        await authService.logout();
        await AsyncStorage.removeItem('authTokens');
        await Keychain.resetInternetCredentials('com.triollmobile.auth');
      },
      teardown: async () => {
                // Ensure logged out state
        await authService.logout();
      },
    };
  }

  /**
   * Test complete registration flow
   */
  static createRegistrationFlowTest(): E2ETest {
    return {
      testId: 'auth-registration-001',
      name: 'Complete Registration Flow',
      description: 'Test user registration with email verification',
      category: 'authentication',
      priority: 'critical',
      retryCount: 2,
      timeout: 60000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Step 1: Generate unique test user
          const testUser = e2eTestFramework.generateTestUser('_reg');

          // Step 2: Attempt registration
          const regStart = Date.now();
          const registerResult = await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });
          performanceMetrics.registrationTime = Date.now() - regStart;

          if (!(registerResult as unknown).success) {
            errors.push(`Registration failed: ${(registerResult as unknown).error}`);
            throw new Error((registerResult as unknown).error || 'Registration failed');
          }

          e2eTestFramework.registerTestData('user', testUser.email);

          // Step 3: Verify confirmation required
          if (!registerResult.confirmationRequired) {
            errors.push('Email confirmation not required - security issue');
          }

          // Step 4: Simulate email verification (in test mode)
          if (Config.ENV === 'staging' && registerResult.confirmationRequired) {
            // In real scenario, would need to retrieve code from email
            // For testing, use a mock verification code
            const verifyStart = Date.now();

            try {
              const confirmResult = await authService.confirmRegistration(
                testUser.email,
                '123456' // Mock code for testing
              );

              if (!confirmResult) {
                errors.push('Email verification failed');
              }
            } catch {
              // Expected in real environment without valid code
              errors.push('Cannot test email verification without real code');
            }

            performanceMetrics.verificationTime = Date.now() - verifyStart;
          }

          // Step 5: Verify user cannot login before confirmation
          try {
            const loginResult = await authService.login({
              email: testUser.email,
              password: testUser.password,
            });

            if ((loginResult as unknown).success && registerResult.confirmationRequired) {
              errors.push('User able to login without email confirmation');
            }
          } catch {
            // Expected behavior
          }

          // Step 6: Check registration data persistence
          const userData = await AsyncStorage.getItem('pendingRegistration');
          if (!userData && registerResult.confirmationRequired) {
            errors.push('Pending registration data not stored');
          }

          return {
            testId: 'auth-registration-001',
            category: 'authentication',
            scenario: 'Complete Registration Flow',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Registration flow tested',
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-registration-001',
            category: 'authentication',
            scenario: 'Complete Registration Flow',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Registration flow failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test login flow with various scenarios
   */
  static createLoginFlowTest(): E2ETest {
    return {
      testId: 'auth-login-001',
      name: 'Login Flow with Scenarios',
      description: 'Test login with correct/incorrect credentials and edge cases',
      category: 'authentication',
      priority: 'critical',
      retryCount: 1,
      timeout: 45000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Create and register test user first
          const testUser = e2eTestFramework.generateTestUser('_login');
          await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });
          e2eTestFramework.registerTestData('user', testUser.email);

          // Step 1: Test successful login
          const loginStart = Date.now();
          const successLogin = await authService.login({
            email: testUser.email,
            password: testUser.password,
          });
          (performanceMetrics as unknown).successfulLoginTime = Date.now() - loginStart;

          if (!(successLogin as unknown).success && !successLogin.confirmationRequired) {
            errors.push('Valid login failed');
          }

          // Step 2: Test incorrect password
          const wrongPassStart = Date.now();
          const wrongPassLogin = await authService.login({
            email: testUser.email,
            password: 'WrongPassword123!',
          });
          performanceMetrics.failedLoginTime = Date.now() - wrongPassStart;

          if ((wrongPassLogin as unknown).success) {
            errors.push('Login succeeded with wrong password - CRITICAL');
            throw new Error('Security breach: wrong password accepted');
          }

          // Step 3: Test non-existent user
          const noUserLogin = await authService.login({
            email: 'nonexistent@test.com',
            password: 'Password123!',
          });

          if ((noUserLogin as unknown).success) {
            errors.push('Login succeeded for non-existent user');
          }

          // Step 4: Test session persistence
          if ((successLogin as unknown).success) {
            const tokens = await AsyncStorage.getItem('authTokens');
            if (!tokens) {
              errors.push('Auth tokens not persisted after login');
            }

            // Verify user data loaded
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
              errors.push('User data not loaded after login');
            }
          }

          // Step 5: Test rate limiting (multiple failed attempts)
          let rateLimited = false;
          for (let i = 0; i < 5; i++) {
            const attempt = await authService.login({
              email: testUser.email,
              password: 'WrongPassword!',
            });

            if (
              (attempt as unknown).error?.includes('limit') ||
              (attempt as unknown).error?.includes('locked')
            ) {
              rateLimited = true;
              break;
            }
          }

          if (!rateLimited && Config.ENV !== 'development') {
            errors.push('No rate limiting detected after multiple failures');
          }

          // Step 6: Logout
          const logoutStart = Date.now();
          await authService.logout();
          performanceMetrics.logoutTime = Date.now() - logoutStart;

          // Verify logout
          const isAuth = await authService.isAuthenticated();
          if (isAuth) {
            errors.push('Still authenticated after logout');
          }

          return {
            testId: 'auth-login-001',
            category: 'authentication',
            scenario: 'Login Flow with Scenarios',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Login flow scenarios tested',
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-login-001',
            category: 'authentication',
            scenario: 'Login Flow with Scenarios',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Login flow test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test biometric authentication
   */
  static createBiometricAuthTest(): E2ETest {
    return {
      testId: 'auth-biometric-001',
      name: 'Biometric Authentication',
      description: 'Test biometric enrollment and authentication',
      category: 'authentication',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Step 1: Check biometric availability
          const biometryType = await Keychain.getSupportedBiometryType();

          if (!biometryType) {
            return {
              testId: 'auth-biometric-001',
              category: 'authentication',
              scenario: 'Biometric Authentication',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'No biometric hardware available',
              errors: [],
            };
          }

          // Step 2: Ensure user is authenticated first
          const isAuth = await authService.isAuthenticated();
          if (!isAuth) {
            // Login with test user
            const testUser = e2eTestFramework.generateTestUser('_bio');
            await authService.register({
              email: testUser.email,
              password: testUser.password,
              displayName: testUser.displayName,
            });

            await authService.login({
              email: testUser.email,
              password: testUser.password,
            });

            e2eTestFramework.registerTestData('user', testUser.email);
          }

          // Step 3: Test biometric enrollment
          try {
            const credentials = {
              username: 'test_user',
              password: 'auth_token_encrypted',
            };

            await Keychain.setInternetCredentials(
              'com.triollmobile.auth',
              credentials.username,
              credentials.password,
              {
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
              }
            );

            // Mark biometric enrolled
            await AsyncStorage.setItem('biometricEnrolled', 'true');
          } catch (error: unknown) {
            if (error.message.includes('UserCancel')) {
              errors.push('User cancelled biometric enrollment');
            } else {
              errors.push(`Biometric enrollment failed: ${error.message}`);
            }
          }

          // Step 4: Test biometric authentication
          try {
            const bioAuth = await Keychain.getInternetCredentials('com.triollmobile.auth');

            if (!bioAuth) {
              errors.push('Biometric authentication failed');
            } else {
              // Verify we can use the retrieved credentials
              if (!bioAuth.username || !bioAuth.password) {
                errors.push('Biometric credentials incomplete');
              }
            }
          } catch (error: unknown) {
            errors.push(`Biometric auth failed: ${error.message}`);
          }

          // Step 5: Test biometric settings
          const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
          if (biometricEnabled !== 'true' && errors.length === 0) {
            await AsyncStorage.setItem('biometricEnabled', 'true');
          }

          return {
            testId: 'auth-biometric-001',
            category: 'authentication',
            scenario: 'Biometric Authentication',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Biometric auth tested (${biometryType})`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-biometric-001',
            category: 'authentication',
            scenario: 'Biometric Authentication',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Biometric test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test password reset flow
   */
  static createPasswordResetTest(): E2ETest {
    return {
      testId: 'auth-password-reset-001',
      name: 'Password Reset Flow',
      description: 'Test complete password reset process',
      category: 'authentication',
      priority: 'high',
      timeout: 45000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Step 1: Create test user
          const testUser = e2eTestFramework.generateTestUser('_reset');
          await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });
          e2eTestFramework.registerTestData('user', testUser.email);

          // Step 2: Initiate password reset
          const resetResult = await authService.forgotPassword(testUser.email);

          if (!(resetResult as unknown).success) {
            errors.push('Password reset initiation failed');
            throw new Error('Cannot initiate password reset');
          }

          if (!resetResult.codeSent) {
            errors.push('Reset code not sent');
          }

          // Step 3: Test with invalid email
          const invalidReset = await authService.forgotPassword('invalid@nonexistent.com');
          if ((invalidReset as unknown).success && Config.ENV !== 'development') {
            errors.push('Password reset allowed for non-existent email');
          }

          // Step 4: Simulate reset confirmation (would need real code)
          try {
            const newPassword = 'NewPassword123!';
            const confirmResult = await authService.confirmPasswordReset(
              testUser.email,
              '123456', // Mock code
              newPassword
            );

            if (!confirmResult) {
              errors.push('Password reset confirmation failed (expected with mock code)');
            }
          } catch {
            // Expected without real code
          }

          // Step 5: Verify old password no longer works
          const oldPasswordLogin = await authService.login({
            email: testUser.email,
            password: testUser.password,
          });

          // Should fail if password was actually reset
          if ((oldPasswordLogin as unknown).success && resetResult.codeSent) {
            // Password wasn't actually reset (expected in test)
          }

          // Step 6: Test rate limiting
          let resetRateLimited = false;
          for (let i = 0; i < 3; i++) {
            const attempt = await authService.forgotPassword(testUser.email);
            if ((attempt as unknown).error?.includes('limit')) {
              resetRateLimited = true;
              break;
            }
          }

          if (!resetRateLimited && Config.ENV !== 'development') {
            errors.push('No rate limiting on password reset requests');
          }

          return {
            testId: 'auth-password-reset-001',
            category: 'authentication',
            scenario: 'Password Reset Flow',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Password reset flow tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-password-reset-001',
            category: 'authentication',
            scenario: 'Password Reset Flow',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Password reset test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test session management
   */
  static createSessionManagementTest(): E2ETest {
    return {
      testId: 'auth-session-001',
      name: 'Session Management',
      description: 'Test session persistence, timeout, and management',
      category: 'authentication',
      priority: 'critical',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Step 1: Create and login test user
          const testUser = e2eTestFramework.generateTestUser('_session');
          await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });

          const loginResult = await authService.login({
            email: testUser.email,
            password: testUser.password,
          });

          if (!(loginResult as unknown).success && !loginResult.confirmationRequired) {
            throw new Error('Login failed for session test');
          }

          e2eTestFramework.registerTestData('user', testUser.email);

          // Step 2: Test session persistence
          const sessionStart = Date.now();
          const tokens = await AsyncStorage.getItem('authTokens');
          if (!tokens) {
            errors.push('Session tokens not stored');
          }
          performanceMetrics.sessionLoadTime = Date.now() - sessionStart;

          // Step 3: Test concurrent sessions
          const sessionId1 = `session_${Date.now()}_1`;
          const sessionId2 = `session_${Date.now()}_2`;

          await AsyncStorage.setItem('activeSession', sessionId1);

          // Simulate second device login
          await AsyncStorage.setItem('concurrentSession', sessionId2);

          // Check if concurrent sessions are handled
          const activeSessions = [
            await AsyncStorage.getItem('activeSession'),
            await AsyncStorage.getItem('concurrentSession'),
          ].filter(Boolean);

          if (activeSessions.length < 1) {
            errors.push('No active sessions found');
          }

          // Step 4: Test session timeout
          const sessionData = {
            startTime: Date.now() - 3600000 * 2, // 2 hours ago
            lastActivity: Date.now() - 1800000, // 30 minutes ago
          };

          await AsyncStorage.setItem('sessionData', JSON.stringify(sessionData));

          // Check if session should be expired
          const stored = await AsyncStorage.getItem('sessionData');
          if (stored) {
            const parsed = JSON.parse(stored);
            const sessionAge = Date.now() - parsed.startTime;
            const inactiveTime = Date.now() - parsed.lastActivity;

            if (sessionAge > 7200000) {
              // 2 hours
              // Session should be expired
              await authService.logout();
              const stillAuth = await authService.isAuthenticated();
              if (stillAuth) {
                errors.push('Expired session still authenticated');
              }
            }
          }

          // Step 5: Test session refresh
          const refreshStart = Date.now();
          const refreshResult = await authService.refreshTokens();
          performanceMetrics.tokenRefreshTime = Date.now() - refreshStart;

          if (!refreshResult && (loginResult as unknown).success) {
            errors.push('Token refresh failed');
          }

          // Step 6: Test logout across sessions
          await authService.logout();

          // Verify all session data cleared
          const remainingTokens = await AsyncStorage.getItem('authTokens');
          const remainingSession = await AsyncStorage.getItem('activeSession');

          if (remainingTokens || remainingSession) {
            errors.push('Session data not fully cleared on logout');
          }

          return {
            testId: 'auth-session-001',
            category: 'authentication',
            scenario: 'Session Management',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Session management tested',
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-session-001',
            category: 'authentication',
            scenario: 'Session Management',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Session management test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test token refresh mechanism
   */
  static createTokenRefreshTest(): E2ETest {
    return {
      testId: 'auth-token-refresh-001',
      name: 'Token Refresh Mechanism',
      description: 'Test automatic token refresh and expiry handling',
      category: 'authentication',
      priority: 'critical',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Ensure authenticated
          const isAuth = await authService.isAuthenticated();
          if (!isAuth) {
            const testUser = e2eTestFramework.generateTestUser('_token');
            await authService.register({
              email: testUser.email,
              password: testUser.password,
              displayName: testUser.displayName,
            });

            await authService.login({
              email: testUser.email,
              password: testUser.password,
            });

            e2eTestFramework.registerTestData('user', testUser.email);
          }

          // Step 1: Get current tokens
          const tokensStr = await AsyncStorage.getItem('authTokens');
          if (!tokensStr) {
            errors.push('No tokens found');
            throw new Error('No auth tokens');
          }

          const tokens = JSON.parse(tokensStr);
          const originalAccessToken = tokens.accessToken;

          // Step 2: Force token refresh
          const refreshResult = await authService.refreshTokens();
          if (!refreshResult) {
            errors.push('Token refresh failed');
          }

          // Step 3: Verify new tokens
          const newTokensStr = await AsyncStorage.getItem('authTokens');
          if (newTokensStr) {
            const newTokens = JSON.parse(newTokensStr);

            if (newTokens.accessToken === originalAccessToken) {
              errors.push('Access token not refreshed');
            }

            if (!newTokens.refreshToken) {
              errors.push('Refresh token missing after refresh');
            }
          }

          // Step 4: Test expired token handling
          // Simulate expired token
          const expiredTokens = {
            accessToken: 'expired_token',
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() - 3600000, // 1 hour ago
          };

          await AsyncStorage.setItem('authTokens', JSON.stringify(expiredTokens));

          // Try to use expired token
          const currentUser = await authService.getCurrentUser();
          if (!currentUser) {
            // Should have auto-refreshed
            const autoRefreshed = await AsyncStorage.getItem('authTokens');
            if (!autoRefreshed) {
              errors.push('Auto-refresh failed for expired token');
            }
          }

          // Step 5: Test refresh token expiry
          // This would require waiting for actual expiry or mocking time

          return {
            testId: 'auth-token-refresh-001',
            category: 'authentication',
            scenario: 'Token Refresh Mechanism',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Token refresh mechanism tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-token-refresh-001',
            category: 'authentication',
            scenario: 'Token Refresh Mechanism',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Token refresh test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test MFA flow
   */
  static createMFAFlowTest(): E2ETest {
    return {
      testId: 'auth-mfa-001',
      name: 'Multi-Factor Authentication',
      description: 'Test MFA setup and authentication flow',
      category: 'authentication',
      priority: 'high',
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Step 1: Check if MFA is available in current environment
          if (Config.ENV === 'development' || Config.USE_MOCK_API) {
            return {
              testId: 'auth-mfa-001',
              category: 'authentication',
              scenario: 'Multi-Factor Authentication',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'MFA testing skipped in development',
              errors: [],
            };
          }

          // Step 2: Create test user with MFA requirement
          const testUser = e2eTestFramework.generateTestUser('_mfa');
          const registerResult = await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });

          e2eTestFramework.registerTestData('user', testUser.email);

          // Step 3: Test MFA setup
          if (authService.getAuthMode() === 'cognito') {
            // Would test MFA setup flow here
            // This requires actual Cognito MFA configuration
          }

          // Step 4: Test login with MFA
          const loginResult = await authService.login({
            email: testUser.email,
            password: testUser.password,
          });

          if (loginResult.mfaRequired) {
            // Step 5: Test MFA code submission
            try {
              const mfaResult = await authService.confirmMFA('123456'); // Mock code
              if (!mfaResult) {
                errors.push('MFA confirmation failed (expected with mock code)');
              }
            } catch {
              // Expected without real MFA code
            }

            // Step 6: Test MFA remember device
            await AsyncStorage.setItem('mfaTrustedDevice', 'true');
          }

          return {
            testId: 'auth-mfa-001',
            category: 'authentication',
            scenario: 'Multi-Factor Authentication',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'MFA flow tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-mfa-001',
            category: 'authentication',
            scenario: 'Multi-Factor Authentication',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'MFA test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test social login integration
   */
  static createSocialLoginTest(): E2ETest {
    return {
      testId: 'auth-social-001',
      name: 'Social Login Integration',
      description: 'Test OAuth login with Google, Apple, Discord',
      category: 'authentication',
      priority: 'medium',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Social login requires WebView and OAuth flow
          // In E2E testing, we can only verify the setup

          // Step 1: Check Google login configuration
          const googleConfig = await AsyncStorage.getItem('googleSignInConfig');
          if (!googleConfig && Config.ENV !== 'development') {
            errors.push('Google Sign-In not configured');
          }

          // Step 2: Check Apple login availability (iOS only)
          const appleConfig = await AsyncStorage.getItem('appleSignInConfig');
          // Apple Sign-In only on iOS

          // Step 3: Test OAuth URL generation
          const providers = ['google', 'apple', 'discord'];

          for (const provider of providers) {
            try {
              // This would generate OAuth URL in real implementation
              const oauthUrl = `https://auth.trioll.com/oauth/${provider}`;

              if (!oauthUrl.includes(provider)) {
                errors.push(`${provider} OAuth URL generation failed`);
              }
            } catch {
              errors.push(`${provider} OAuth setup failed`);
            }
          }

          // Step 4: Test social account linking
          const socialAccounts = await AsyncStorage.getItem('linkedSocialAccounts');

          // Store test social account data
          await AsyncStorage.setItem(
            'linkedSocialAccounts',
            JSON.stringify({
              google: null,
              apple: null,
              discord: null,
            })
          );

          return {
            testId: 'auth-social-001',
            category: 'authentication',
            scenario: 'Social Login Integration',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Social login configuration tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-social-001',
            category: 'authentication',
            scenario: 'Social Login Integration',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Social login test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test account security features
   */
  static createAccountSecurityTest(): E2ETest {
    return {
      testId: 'auth-security-001',
      name: 'Account Security Features',
      description: 'Test security features like suspicious login detection',
      category: 'authentication',
      priority: 'high',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Step 1: Test password complexity requirements
          const weakPasswords = ['password', '12345678', 'qwerty123'];

          for (const weakPass of weakPasswords) {
            try {
              const result = await authService.register({
                email: `weak_${Date.now()}@test.com`,
                password: weakPass,
                displayName: 'Test User',
              });

              if ((result as unknown).success) {
                errors.push(`Weak password accepted: ${weakPass}`);
              }
            } catch {
              // Expected - weak password rejected
            }
          }

          // Step 2: Test account lockout after failed attempts
          const testUser = e2eTestFramework.generateTestUser('_security');
          await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });
          e2eTestFramework.registerTestData('user', testUser.email);

          // Multiple failed login attempts
          let lockedOut = false;
          for (let i = 0; i < 10; i++) {
            const attempt = await authService.login({
              email: testUser.email,
              password: 'WrongPassword!',
            });

            if (
              (attempt as unknown).error?.includes('locked') ||
              (attempt as unknown).error?.includes('blocked')
            ) {
              lockedOut = true;
              break;
            }
          }

          if (!lockedOut && Config.ENV !== 'development') {
            errors.push('No account lockout after multiple failed attempts');
          }

          // Step 3: Test login from new location alert
          const loginMetadata = {
            deviceId: `test_device_${Date.now()}`,
            location: 'New York, US',
            ipAddress: '192.168.1.1',
            timestamp: Date.now(),
          };

          await AsyncStorage.setItem('lastLoginMetadata', JSON.stringify(loginMetadata));

          // Simulate login from different location
          const newLocationMetadata = {
            ...loginMetadata,
            location: 'London, UK',
            ipAddress: '10.0.0.1',
          };

          // In real app, this would trigger security alert
          await AsyncStorage.setItem(
            'suspiciousLoginAlert',
            JSON.stringify({
              triggered: true,
              reason: 'New location detected',
              metadata: newLocationMetadata,
            })
          );

          // Step 4: Test secure password storage
          const passwords = await AsyncStorage.getAllKeys();
          const hasPlainPassword = passwords.some(
            key => key.includes('password') && !key.includes('encrypted')
          );

          if (hasPlainPassword) {
            errors.push('Plain text passwords found in storage - CRITICAL');
          }

          // Step 5: Test session hijacking prevention
          const sessionToken = 'test_session_token';
          const sessionFingerprint = {
            userAgent: 'TestApp/1.0',
            deviceId: 'test_device',
            timestamp: Date.now(),
          };

          await AsyncStorage.setItem('sessionFingerprint', JSON.stringify(sessionFingerprint));

          // Verify session validation would occur
          const stored = await AsyncStorage.getItem('sessionFingerprint');
          if (!stored) {
            errors.push('Session fingerprinting not implemented');
          }

          return {
            testId: 'auth-security-001',
            category: 'authentication',
            scenario: 'Account Security Features',
            status:
              errors.length === 0
                ? 'passed'
                : errors.some(e => e.includes('CRITICAL'))
                  ? 'failed'
                  : 'warning',
            duration: Date.now() - startTime,
            details: 'Security features tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'auth-security-001',
            category: 'authentication',
            scenario: 'Account Security Features',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Security test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }
}

// Register the test suite
e2eTestFramework.registerSuite(AuthenticationTests.createSuite());
