
/**
 * Secure Cognito Configuration
 * Manages AWS credentials through Cognito Identity Pools
 * NO HARDCODED CREDENTIALS - All access via temporary STS tokens
 */

import { Config } from '../../config/environments';

export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  region: string;
  authRole: string;
  guestRole: string;
}

/**
 * Environment-specific Cognito configuration
 * SECURITY: Never hardcode credentials here
 */
export const cognitoConfig: CognitoConfig = {
  // Existing User Pool configuration
  userPoolId: Config.USER_POOL_ID,
  userPoolClientId: Config.USER_POOL_CLIENT_ID,

  // NEW: Identity Pool for secure AWS access
  identityPoolId: Config.IDENTITY_POOL_ID || 'MUST_BE_CONFIGURED',
  region: Config.AWS_REGION,

  // IAM Roles for authenticated and guest users
  authRole: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || ''}:role/trioll-${Config.ENV}-auth-role`,
  guestRole: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || ''}:role/trioll-${Config.ENV}-guest-role`,
};

/**
 * Validate configuration on app startup
 */
export function validateCognitoConfig(): void {
  const required = ['userPoolId', 'userPoolClientId', 'identityPoolId', 'region'];

  for (let i = 0; i < required.length; i++) {
        const field = required[i];
    if (
      !cognitoConfig[field as keyof CognitoConfig] ||
      cognitoConfig[field as keyof CognitoConfig] === 'MUST_BE_CONFIGURED'
    ) {
      throw new Error(
        `Security Error: ${field } not configured. ` +
          'AWS credentials cannot be obtained without proper Cognito configuration.'
      );
    }
  }

  // Ensure we're not in production with test configuration
  if (Config.ENV === 'production' && cognitoConfig.identityPoolId.includes('test')) {
    throw new Error('Security Error: Test configuration detected in production environment');
  }
}

/**
 * Get login map for Cognito Identity Pool
 */
export function getCognitoLogins(idToken: string): { [key: string]: string } {
  const providerName = `cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`;
  return {
    [providerName]: idToken,
  };
}

/**
 * Security best practices enforced:
 * 1. No hardcoded AWS credentials
 * 2. All access through temporary STS tokens
 * 3. User isolation via Cognito Identity ID
 * 4. Environment-specific configuration
 * 5. Automatic credential rotation
 */

// Import Amplify auth service to get real credentials
import { amplifyAuthService } from './amplifyAuthService';

// Get real Cognito credentials from Amplify
export const getCognitoCredentials = async () => {
  try {
    const credentials = await amplifyAuthService.getCurrentCredentials();
    if (credentials) {
      return {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      };
    }
    return null;
  } catch {
    console.error('Failed to get Cognito credentials:', error);
    return null;
  }
};

export const areCredentialsValid = (credentials: any) => {
  return credentials && credentials.accessKeyId && credentials.secretAccessKey;
};

export const monitorCredentialUsage = () => {
  // Can be implemented later for tracking credential usage
};
