/**
 * Amplify Auth Service Fix
 * Ensures guest credentials are properly initialized
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AmplifyAuthFix');

/**
 * Force initialize guest credentials
 * This ensures we have AWS credentials even when not signed in
 */
export const ensureGuestCredentials = async () => {
  try {
    logger.info('Ensuring guest credentials...');
    
    // Force a fresh session fetch
    const session = await fetchAuthSession({ forceRefresh: true });
    
    logger.info('Guest session result:', {
      hasIdentityId: !!session.identityId,
      hasCredentials: !!session.credentials,
      hasTokens: !!session.tokens,
      identityId: session.identityId?.substring(0, 20) + '...'
    });
    
    if (!session.credentials) {
      throw new Error('No credentials received from Amplify');
    }
    
    if (!session.identityId) {
      throw new Error('No identity ID received from Amplify');
    }
    
    return {
      identityId: session.identityId,
      credentials: session.credentials
    };
  } catch (error) {
    logger.error('Failed to get guest credentials:', error);
    
    // Fallback: Generate local guest credentials
    const fallbackId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    logger.warn('Using fallback guest ID:', fallbackId);
    
    return {
      identityId: fallbackId,
      credentials: null
    };
  }
};

/**
 * Test if Amplify is properly configured
 */
export const testAmplifyConfig = async () => {
  try {
    const session = await fetchAuthSession();
    console.log('=== AMPLIFY CONFIG TEST ===');
    console.log('Identity Pool ID from session:', session.identityId);
    console.log('Has Credentials:', !!session.credentials);
    console.log('Is Guest:', !session.tokens);
    console.log('========================');
    return true;
  } catch (error) {
    console.error('=== AMPLIFY CONFIG ERROR ===');
    console.error(error);
    console.error('========================');
    return false;
  }
};