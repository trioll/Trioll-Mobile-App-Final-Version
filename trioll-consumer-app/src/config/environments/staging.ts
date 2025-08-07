// Import type only to avoid circular dependency
import type { EnvironmentConfig } from './index';
import { ENV, getEnvVar, getBooleanEnvVar, getNumericEnvVar } from '../envLoader';

export const staging: EnvironmentConfig = {
  ENV: 'staging' as const,
  API_BASE_URL:
    ENV.API_BASE_URL || 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/staging',
  WEBSOCKET_URL: ENV.WEBSOCKET_URL || 'wss://staging-api.trioll.com/ws',
  USE_MOCK_API: getBooleanEnvVar('USE_MOCK_API', false),
  API_TIMEOUT: getNumericEnvVar('API_TIMEOUT', 20000),

  // AWS Configuration - NO FALLBACK CREDENTIALS FOR SECURITY
  AWS_REGION: ENV.AWS_REGION || 'us-east-1',
  AWS_ACCOUNT_ID: getEnvVar('AWS_ACCOUNT_ID', ''),
  USER_POOL_ID: ENV.USER_POOL_ID || getEnvVar('AWS_COGNITO_USER_POOL_ID', ''),
  USER_POOL_CLIENT_ID:
    ENV.USER_POOL_CLIENT_ID || getEnvVar('AWS_COGNITO_CLIENT_ID', ''),
  AWS_COGNITO_USER_POOL_ID:
    ENV.USER_POOL_ID || getEnvVar('AWS_COGNITO_USER_POOL_ID', ''),
  AWS_COGNITO_CLIENT_ID:
    ENV.USER_POOL_CLIENT_ID || getEnvVar('AWS_COGNITO_CLIENT_ID', ''),
  IDENTITY_POOL_ID:
    ENV.IDENTITY_POOL_ID ||
    getEnvVar('AWS_COGNITO_IDENTITY_POOL_ID', 'us-east-1:ae39242b-19c1-4740-9feb-84f9eabc5d20'),
  AWS_COGNITO_IDENTITY_POOL_ID:
    ENV.IDENTITY_POOL_ID ||
    getEnvVar('AWS_COGNITO_IDENTITY_POOL_ID', 'us-east-1:ae39242b-19c1-4740-9feb-84f9eabc5d20'),

  // S3 Buckets
  S3_GAMES_BUCKET: ENV.S3_GAMES_BUCKET || 'trioll-staging-games-us-east-1',
  S3_UPLOADS_BUCKET: ENV.S3_UPLOADS_BUCKET || 'trioll-staging-uploads-us-east-1',
  S3_ANALYTICS_BUCKET: getEnvVar('S3_ANALYTICS_BUCKET', 'trioll-staging-analytics-us-east-1'),

  // DynamoDB Tables
  GAMES_TABLE: getEnvVar('DYNAMODB_GAMES_TABLE', 'trioll-staging-games'),
  USERS_TABLE: getEnvVar('DYNAMODB_USERS_TABLE', 'trioll-staging-users'),

  // Feature Flags
  FEATURES: {
    BIOMETRIC_AUTH: getBooleanEnvVar('FEATURE_BIOMETRIC_AUTH', true),
    SOCIAL_LOGIN: getBooleanEnvVar('FEATURE_SOCIAL_LOGIN', true),
    OFFLINE_MODE: ENV.ENABLE_OFFLINE_MODE,
    WEBSOCKET_ENABLED: ENV.ENABLE_WEBSOCKET,
    ANALYTICS_ENABLED: ENV.ENABLE_ANALYTICS,
    CRASH_REPORTING: ENV.ENABLE_CRASH_REPORTING,
    PERFORMANCE_MONITORING: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),
    AUTH_FALLBACK: getBooleanEnvVar('FEATURE_AUTH_FALLBACK', true),
  },

  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: getNumericEnvVar('CACHE_DEFAULT_TTL', 300000), // 5 minutes
    MAX_CACHE_SIZE: getNumericEnvVar('CACHE_MAX_SIZE', 100 * 1024 * 1024), // 100MB
    ENABLE_PERSISTENCE: getBooleanEnvVar('CACHE_ENABLE_PERSISTENCE', true),
  },

  // Performance
  PERFORMANCE: {
    IMAGE_QUALITY: getNumericEnvVar('IMAGE_QUALITY', 0.85),
    MAX_CONCURRENT_REQUESTS: getNumericEnvVar('MAX_CONCURRENT_REQUESTS', 8),
    REQUEST_RETRY_COUNT: getNumericEnvVar('REQUEST_RETRY_COUNT', 2),
    // REQUEST_RETRY_DELAY: getNumericEnvVar('REQUEST_RETRY_DELAY', 2000),
  },

  // Debug
  DEBUG: {
    ENABLE_LOGGING: ENV.DEBUG_MODE,
    // ENABLE_NETWORK_INSPECTOR: ENV.ENABLE_NETWORK_INSPECTOR,
    ENABLE_REDUX_DEVTOOLS: getBooleanEnvVar('ENABLE_REDUX_DEVTOOLS', false),
    LOG_LEVEL: (ENV.LOG_LEVEL || 'warn') as const,
  },
};
