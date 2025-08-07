import { Config } from '../../config/environments';
// Check if we have valid AWS credentials
const hasValidCredentials = () => {
  // In development/mock mode, credentials are not required
  if (Config.USE_MOCK_API) {
    return false;
  }

  // Check for required AWS configuration
  return !!(
    Config.AWS_REGION &&
    Config.USER_POOL_ID &&
    Config.USER_POOL_CLIENT_ID &&
    Config.IDENTITY_POOL_ID
  );
};

// Create AWS client configuration
export const getAWSConfig = () => {
  const baseConfig = {
    region: Config.AWS_REGION || 'us-east-1',
  };

  // Only add credentials if we have them
  if (hasValidCredentials()) {
    return {
      ...baseConfig,
      // Additional credential configuration can be added here
    };
  }

  return baseConfig;
};

// Check if AWS services are properly configured
export const isAWSConfigured = (): boolean => {
  if (Config.USE_MOCK_API) {
    return false;
  }

  const configured = hasValidCredentials();

  if (!configured && __DEV__) {
    console.warn('AWS services not properly configured. Missing required configuration:');
    if (!Config.AWS_REGION) console.warn('- AWS_REGION');
    if (!Config.USER_POOL_ID) console.warn('- USER_POOL_ID');
    if (!Config.USER_POOL_CLIENT_ID) console.warn('- USER_POOL_CLIENT_ID');
    if (!Config.IDENTITY_POOL_ID) console.warn('- IDENTITY_POOL_ID');
  }

  return configured;
};

// Export configuration status
export const awsStatus = {
  isConfigured: isAWSConfigured(),
  hasCredentials: hasValidCredentials(),
  region: Config.AWS_REGION,
  isUsingMockMode: Config.USE_MOCK_API,
};
