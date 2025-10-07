/**
 * AWS Amplify Configuration
 * Configures Amplify for guest and authenticated user access
 */

import { Amplify } from 'aws-amplify';
import { getLogger } from '../utils/logger';

const logger = getLogger('AmplifyConfig');

// Import existing environment configuration
import { Config } from './environments';

const amplifyConfig = {
  Auth: {
    Cognito: {
      // From existing Trioll infrastructure
      userPoolId: Config.USER_POOL_ID || 'us-east-1_cLPH2acQd',
      userPoolClientId: Config.USER_POOL_CLIENT_ID || 'bft50gui77sdq2n4lcio4onql', 
      identityPoolId: Config.IDENTITY_POOL_ID || 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268',
      
      // Allow guest users - this is critical for the app
      allowGuestAccess: true,
      
      // Region configuration
      region: Config.AWS_REGION || 'us-east-1',
      
      // Authentication flow configuration
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        username: false,
      },
      
      // Password policy
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      }
    }
  },
  
  // API configuration for existing endpoints
  API: {
    REST: {
      TriollAPI: {
        endpoint: Config.API_BASE_URL,
        region: Config.AWS_REGION || 'us-east-1',
        // Custom headers will be added per request
      }
    }
  },
  
  // Storage configuration for S3 access
  Storage: {
    S3: {
      bucket: Config.S3_UPLOADS_BUCKET || 'trioll-prod-uploads-us-east-1',
      region: Config.AWS_REGION || 'us-east-1',
      // Paths for user isolation
      dangerouslyConnectToHttpEndpointForTesting: false
    }
  }
};

/**
 * Configure Amplify with error handling
 */
export const configureAmplify = async (): Promise<boolean> => {
  try {
    logger.info('Configuring AWS Amplify...');
    
    Amplify.configure(amplifyConfig);
    
    logger.info('AWS Amplify configured successfully', {
      userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
      identityPoolId: amplifyConfig.Auth.Cognito.identityPoolId,
      region: amplifyConfig.Auth.Cognito.region
    });
    
    return true;
  } catch {
    console.error('[Amplify] Configuration failed:', error);
    logger.error('Failed to configure Amplify:', error);
    // Don't crash the app if Amplify fails to configure
    // Fall back to existing auth mechanism
    return false;
  }
};

/**
 * Get Amplify configuration for debugging
 */
export const getAmplifyConfig = () => amplifyConfig;