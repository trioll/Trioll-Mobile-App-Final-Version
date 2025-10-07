/**
 * Test utility to verify AWS Amplify setup
 * Run this to confirm Amplify is properly configured
 */

import { getLogger } from './logger';
import { amplifyAuthService } from '../services/auth/amplifyAuthService';
import { Config } from '../config/environments';

const logger = getLogger('AmplifyTest');

export const testAmplifySetup = async () => {
  console.log('=== Testing AWS Amplify Setup ===');
  logger.info('=== Testing AWS Amplify Setup ===');
  
  try {
    // 1. Check environment variables
    logger.info('1. Checking environment variables:');
    logger.info('   - User Pool ID:', Config.USER_POOL_ID ? '✓ Set' : '✗ Missing');
    logger.info('   - Client ID:', Config.USER_POOL_CLIENT_ID ? '✓ Set' : '✗ Missing');
    logger.info('   - Identity Pool ID:', Config.IDENTITY_POOL_ID ? '✓ Set' : '✗ Missing');
    logger.info('   - AWS Region:', Config.AWS_REGION || 'us-east-1');
    
    // 2. Initialize Amplify Auth
    logger.info('2. Initializing Amplify Auth Service...');
    const authState = await amplifyAuthService.initialize();
    
    logger.info('3. Auth State:');
    logger.info('   - Is Guest:', authState.isGuest);
    logger.info('   - Is Authenticated:', authState.isAuthenticated);
    logger.info('   - Identity ID:', authState.identityId || 'Not available');
    logger.info('   - Has Credentials:', !!authState.credentials);
    
    // Also log to console for visibility
    console.log('Amplify Auth State:', {
      isGuest: authState.isGuest,
      isAuthenticated: authState.isAuthenticated,
      identityId: authState.identityId,
      hasCredentials: !!authState.credentials
    });
    
    if (authState.identityId) {
      logger.info('✅ SUCCESS: AWS Amplify is properly configured!');
      logger.info(`   Guest Identity ID: ${authState.identityId}`);
    } else {
      logger.warn('⚠️  WARNING: No Identity ID received. Check Cognito configuration.');
    }
    
    // 4. Test credential refresh
    if (authState.credentials) {
      logger.info('4. Testing credential refresh...');
      const creds = await amplifyAuthService.getCurrentCredentials();
      if (creds) {
        logger.info('   ✓ Credentials refreshed successfully');
      }
    }
    
    logger.info('=== Amplify Setup Test Complete ===');
    console.log('=== Amplify Setup Test Complete ===');
    console.log('Success:', !!authState.identityId);
    
    return {
      success: !!authState.identityId,
      authState
    };
  } catch {
    console.error('❌ FAILED: Amplify setup test failed:', error);
    logger.error('❌ FAILED: Amplify setup test failed:', error);
    return {
      success: false,
      error
    };
  }
};

// Export for use in development console
if (__DEV__) {
  (global as any).testAmplifySetup = testAmplifySetup;
}