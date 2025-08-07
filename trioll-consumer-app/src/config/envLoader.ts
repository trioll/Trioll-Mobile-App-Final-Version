/**
 * Environment variable loader for secure configuration
 * Loads from process.env in development and Constants.expoConfig.extra in production
 */

import Constants from 'expo-constants';

// Helper to get environment variable with fallback
export function getEnvVar(key: string, fallback: string = ''): string {
  // In development, check process.env
  if (__DEV__ && process.env[key]) {
    return process.env[key];
  }

  // In Expo, check Constants.expoConfig.extra
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }

  // Return fallback value
  return fallback;
}

// Helper to get boolean environment variable
export function getBooleanEnvVar(key: string, fallback: boolean = false): boolean {
  const value = getEnvVar(key);
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

// Helper to get numeric environment variable
export function getNumericEnvVar(key: string, fallback: number = 0): number {
  const value = getEnvVar(key);
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

// Load all environment variables with secure defaults
export const ENV = {
  // API Configuration
  API_BASE_URL: getEnvVar(
    'API_BASE_URL',
    'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod'
  ),
  WEBSOCKET_URL: getEnvVar(
    'WEBSOCKET_URL',
    'wss://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod'
  ),

  // AWS Configuration
  AWS_REGION: getEnvVar('AWS_REGION', 'us-east-1'),
  USER_POOL_ID: getEnvVar('AWS_COGNITO_USER_POOL_ID', 'us-east-1_cLPH2acQd'),
  USER_POOL_CLIENT_ID: getEnvVar('AWS_COGNITO_CLIENT_ID', 'bft50gui77sdq2n4lcio4onql'),
  IDENTITY_POOL_ID: getEnvVar('AWS_COGNITO_IDENTITY_POOL_ID', 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268'),

  // S3 Buckets
  S3_GAMES_BUCKET: getEnvVar('S3_GAMES_BUCKET', 'trioll-prod-games-us-east-1'),
  S3_UPLOADS_BUCKET: getEnvVar('S3_UPLOADS_BUCKET', 'trioll-prod-uploads-us-east-1'),

  // Feature Flags
  ENABLE_ANALYTICS: getBooleanEnvVar('ENABLE_ANALYTICS', true),
  ENABLE_CRASH_REPORTING: getBooleanEnvVar('ENABLE_CRASH_REPORTING', !__DEV__),
  ENABLE_WEBSOCKET: getBooleanEnvVar('ENABLE_WEBSOCKET', true),
  ENABLE_OFFLINE_MODE: getBooleanEnvVar('ENABLE_OFFLINE_MODE', true),

  // Debug Configuration
  DEBUG_MODE: getBooleanEnvVar('DEBUG_MODE', __DEV__),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', __DEV__ ? 'debug' : 'error'),
  // ENABLE_NETWORK_INSPECTOR: getBooleanEnvVar('ENABLE_NETWORK_INSPECTOR', __DEV__),

  // Third Party Services
  SENTRY_DSN: getEnvVar('SENTRY_DSN', ''),
  MIXPANEL_TOKEN: getEnvVar('MIXPANEL_TOKEN', ''),
  AMPLITUDE_API_KEY: getEnvVar('AMPLITUDE_API_KEY', ''),

  // App Configuration
  APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),
  BUILD_NUMBER: getEnvVar('BUILD_NUMBER', '1'),
  ENVIRONMENT: getEnvVar('ENVIRONMENT', __DEV__ ? 'development' : 'production'),
};

// Validate critical environment variables
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'AWS_COGNITO_USER_POOL_ID',
    'AWS_COGNITO_CLIENT_ID',
    'AWS_COGNITO_IDENTITY_POOL_ID',
  ];

  const missing: string[] = [];

  for (let i = 0; i < required.length; i++) {
        const key = required[i];
    if (!getEnvVar(key)) {
      missing.push(key);
     }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// Log environment configuration (development only) - delayed to avoid circular dependency
if (__DEV__) {
  setTimeout(() => {
    try {
      const { getLogger } = require('../utils/logger');
      const logger = getLogger('EnvLoader');

      logger.info('🔧 Environment Configuration:');
      logger.info('  API:', ENV.API_BASE_URL);
      logger.info('  WebSocket:', ENV.WEBSOCKET_URL);
      logger.info('  AWS Region:', ENV.AWS_REGION);
      logger.info('  Environment:', ENV.ENVIRONMENT);

      const validation = validateEnvironment();
      if (!validation.valid) {
        logger.warn('⚠️  Missing required environment variables:', validation.missing.join(', '));
      }
    } catch (error) {
      // If logger is not available, use console as fallback
                              
      const validation = validateEnvironment();
      if (!validation.valid) {
        console.warn('⚠️  Missing required environment variables:', validation.missing.join(', '));
      }
    }
  }, 0);
}
