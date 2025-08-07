/**
 * Test script to verify authentication flow with real AWS credentials
 */

import { amplifyAuthService } from '../services/auth/amplifyAuthService';
import { checkAuthStatus, logAuthStatus } from './checkAuthStatusFixed';
import { getCognitoCredentials } from '../services/auth/cognitoConfig';
import { getLogger } from './logger';

const logger = getLogger('AuthFlowTest');

export async function testAuthFlow() {
  console.log('\n🔍 Testing Authentication Flow...\n');
  
  try {
    // 1. Initialize Amplify
    console.log('1️⃣ Initializing Amplify Auth Service...');
    const amplifyState = await amplifyAuthService.initialize();
    console.log('   ✅ Amplify State:', {
      isGuest: amplifyState.isGuest,
      identityId: amplifyState.identityId,
      hasCredentials: !!amplifyState.credentials
    });
    
    // 2. Get real credentials
    console.log('\n2️⃣ Getting AWS Credentials...');
    const credentials = await getCognitoCredentials();
    if (credentials) {
      console.log('   ✅ Got real AWS credentials:', {
        hasAccessKey: !!credentials.accessKeyId,
        hasSecretKey: !!credentials.secretAccessKey,
        hasSessionToken: !!credentials.sessionToken
      });
    } else {
      console.log('   ❌ No credentials returned');
    }
    
    // 3. Check auth status
    console.log('\n3️⃣ Checking Auth Status...');
    const authStatus = await checkAuthStatus();
    console.log('   ✅ Auth Status:', {
      mode: authStatus.mode,
      hasCredentials: authStatus.details.hasCredentials,
      credentialsSource: authStatus.details.credentialsSource
    });
    
    // 4. Log full status
    console.log('\n4️⃣ Full Auth Status:');
    await logAuthStatus();
    
    // 5. Test API call with identity header
    console.log('\n5️⃣ Testing API call with identity header...');
    try {
      const TriollAPIModule = await import('../services/api/TriollAPI');
      const api = TriollAPIModule.default;
      
      // Make a simple API call
      const response = await api.getGames({ limit: 1 });
      console.log('   ✅ API call successful, got', response.games?.length || 0, 'games');
    } catch (error) {
      console.log('   ❌ API call failed:', error.message);
    }
    
    console.log('\n✅ Auth flow test complete!\n');
    
  } catch (error) {
    console.error('\n❌ Auth flow test failed:', error);
    logger.error('Test failed:', error);
  }
}

// Auto-run if imported
testAuthFlow();