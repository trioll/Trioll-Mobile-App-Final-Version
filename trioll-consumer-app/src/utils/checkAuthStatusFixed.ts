/**
 * Auth Status Checker
 * Utility to verify if you're properly authenticated as a guest user
 * Fixed version that doesn't require AWS SDK
 */

import { cognitoConfig, getCognitoCredentials } from '../services/auth/cognitoConfig';
import { safeAuthService } from '../services/auth/safeAuthService';
import { getLogger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGuestMode } from '../services/api/TriollAPI';

const logger = getLogger('AuthStatusChecker');

export interface AuthStatus {
  mode: 'authenticated' | 'guest' | 'fallback';
  details: {
    hasCredentials: boolean;
    cognitoUser?: string;
    configValid: boolean;
    credentialsSource?: string;
    errors: string[];
  };
}

export async function checkAuthStatus(): Promise<AuthStatus> {
  const errors: string[] = [];
  let mode: 'authenticated' | 'guest' | 'fallback' = 'fallback';
  const details: AuthStatus['details'] = {
    hasCredentials: false,
    configValid: false,
    errors
  };

  try {
    // 1. Check Cognito configuration
    details.configValid = !!(cognitoConfig.userPoolId && cognitoConfig.identityPoolId);
    if (!details.configValid) {
      errors.push('Invalid Cognito configuration');
      logger.error('Cognito config missing required fields');
    }
    
    // 2. Check if there's a Cognito user session
    const cognitoUser = await safeAuthService.getCurrentUser();
    if (cognitoUser) {
      details.cognitoUser = cognitoUser.getUsername();
      logger.info('Found Cognito user:', details.cognitoUser);
      
      try {
        const session = await safeAuthService.getSession();
        if (session && session.isValid()) {
          mode = 'authenticated';
          details.hasCredentials = true;
          details.credentialsSource = 'Cognito User Session';
        }
      } catch (e) {
        logger.info('No valid session for user');
      }
    }

    // 3. Check if using Amplify
    try {
      // Import and check Amplify state directly
      const { amplifyAuthService } = await import('../services/auth/amplifyAuthService');
      const amplifyState = amplifyAuthService.getCurrentState();
      
      logger.info('Amplify state in auth check:', {
        isGuest: amplifyState.isGuest,
        hasIdentity: !!amplifyState.identityId,
        hasCredentials: !!amplifyState.credentials
      });
      
      if (amplifyState.identityId) {
        // We have Amplify credentials
        mode = amplifyState.isGuest ? 'guest' : 'authenticated';
        details.hasCredentials = !!amplifyState.credentials;
        details.credentialsSource = `AWS Amplify (Identity: ${amplifyState.identityId})`;
        
        // Also check the user returned by safeAuthService
        const authService = await safeAuthService.getCurrentUser();
        if (authService && authService.getUsername) {
          details.cognitoUser = authService.getUsername();
        }
      }
    } catch (e) {
      logger.info('Amplify check failed:', e.message);
    }
    
    // 4. Check if in guest mode via API
    const apiGuestMode = isGuestMode();
    if (apiGuestMode && !details.hasCredentials) {
      mode = 'guest';
      // Try to get real AWS credentials from Amplify
      try {
        const realCreds = await getCognitoCredentials();
        if (realCreds && realCreds.accessKeyId) {
          details.hasCredentials = true;
          details.credentialsSource = 'Guest Mode (AWS Credentials)';
        }
      } catch (e) {
        logger.warn('Could not get AWS credentials');
      }
    }

    // 5. Check stored auth data
    try {
      const storedAuth = await AsyncStorage.getItem('@trioll/auth');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        logger.info('Found stored auth data for user:', parsed.username);
        if (!details.hasCredentials && (parsed.idToken || parsed.accessToken)) {
          details.hasCredentials = true;
          details.credentialsSource = 'Stored Tokens';
        }
      }
    } catch (e) {
      // No stored auth data
    }

    // 6. Determine final status
    if (!details.hasCredentials && !details.configValid) {
      mode = 'fallback';
      details.credentialsSource = 'Local fallback (no credentials)';
    } else if (!details.hasCredentials && details.configValid) {
      // Config is valid but no credentials yet
      mode = 'fallback';
      details.credentialsSource = 'Waiting for credentials';
    } else if (details.hasCredentials && (details.credentialsSource?.includes('AWS Amplify') || details.credentialsSource?.includes('AWS Credentials'))) {
      // We have real AWS credentials, ensure mode reflects this
      if (!details.cognitoUser || details.cognitoUser.startsWith('Guest_')) {
        mode = 'guest';
      }
    }

  } catch (error) {
    errors.push(`General error: ${error.message}`);
    logger.error('Auth status check error:', error);
  }

  const status: AuthStatus = { mode, details };
  
  // Log summary
  logger.info('=== AUTH STATUS SUMMARY ===');
  logger.info(`Mode: ${mode.toUpperCase()}`);
  logger.info(`Has Credentials: ${details.hasCredentials}`);
  logger.info(`Config Valid: ${details.configValid}`);
  logger.info(`Source: ${details.credentialsSource || 'Unknown'}`);
  if (errors.length > 0) {
    logger.error('Errors:', errors);
  }
  logger.info('========================');

  return status;
}

// Helper function to log auth status to console
export async function logAuthStatus() {
  const status = await checkAuthStatus();
  
  console.log('\n🔐 Authentication Status:');
  console.log('========================');
  console.log(`Mode: ${status.mode === 'guest' ? '⚡' : status.mode === 'authenticated' ? '✓' : '⚠️'} ${status.mode.toUpperCase()}`);
  console.log(`Credentials: ${status.details.hasCredentials ? '✓ Yes' : '✗ No'}`);
  console.log(`Config Valid: ${status.details.configValid ? '✓ Yes' : '✗ No'}`);
  
  if (status.details.cognitoUser) {
    console.log(`Cognito User: ${status.details.cognitoUser}`);
  }
  
  console.log(`Source: ${status.details.credentialsSource || 'Unknown'}`);
  
  if (status.details.errors.length > 0) {
    console.log('\n⚠️ Issues:');
    status.details.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('========================\n');
  
  return status;
}