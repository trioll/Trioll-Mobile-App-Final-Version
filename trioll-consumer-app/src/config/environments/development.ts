// Import type only to avoid circular dependency
import type { EnvironmentConfig } from './index';
import { ENV, getEnvVar, getBooleanEnvVar, getNumericEnvVar } from '../envLoader';

export const development: EnvironmentConfig = {
  ENV: 'development' as const,
  API_BASE_URL: ENV.API_BASE_URL || 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
  WEBSOCKET_URL: ENV.WEBSOCKET_URL || 'wss://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
  USE_MOCK_API: getBooleanEnvVar('USE_MOCK_API', false), // Default to production API
  API_TIMEOUT: getNumericEnvVar('API_TIMEOUT', 30000),

  // AWS Configuration - Production values as fallback
  AWS_REGION: ENV.AWS_REGION || 'us-east-1',
  USER_POOL_ID: ENV.USER_POOL_ID || 'us-east-1_cLPH2acQd',
  USER_POOL_CLIENT_ID: ENV.USER_POOL_CLIENT_ID || 'bft50gui77sdq2n4lcio4onql',
  IDENTITY_POOL_ID: ENV.IDENTITY_POOL_ID || 'us-east-1:c740f334-5bd2-43c6-85b9-48bfebf27268',

  // S3 Buckets
  S3_GAMES_BUCKET: ENV.S3_GAMES_BUCKET || 'trioll-prod-games-us-east-1',
  S3_UPLOADS_BUCKET: ENV.S3_UPLOADS_BUCKET || 'trioll-prod-uploads-us-east-1',
  S3_ANALYTICS_BUCKET: getEnvVar('S3_ANALYTICS_BUCKET', 'trioll-dev-analytics-us-east-1'),

  // DynamoDB Tables
  GAMES_TABLE: getEnvVar('DYNAMODB_GAMES_TABLE', 'trioll-dev-games'),
  USERS_TABLE: getEnvVar('DYNAMODB_USERS_TABLE', 'trioll-dev-users'),

  // Feature Flags
  FEATURES: {
    BIOMETRIC_AUTH: getBooleanEnvVar('FEATURE_BIOMETRIC_AUTH', true),
    SOCIAL_LOGIN: getBooleanEnvVar('FEATURE_SOCIAL_LOGIN', true),
    OFFLINE_MODE: ENV.ENABLE_OFFLINE_MODE,
    WEBSOCKET_ENABLED: ENV.ENABLE_WEBSOCKET,
    ANALYTICS_ENABLED: ENV.ENABLE_ANALYTICS,
    CRASH_REPORTING: ENV.ENABLE_CRASH_REPORTING,
    PERFORMANCE_MONITORING: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),
    AUTH_FALLBACK: getBooleanEnvVar('FEATURE_AUTH_FALLBACK', true), // Fall back to mock auth if AWS fails
  },

  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: getNumericEnvVar('CACHE_DEFAULT_TTL', 60000), // 1 minute
    MAX_CACHE_SIZE: getNumericEnvVar('CACHE_MAX_SIZE', 50 * 1024 * 1024), // 50MB
    ENABLE_PERSISTENCE: getBooleanEnvVar('CACHE_ENABLE_PERSISTENCE', true),
  },

  // Performance
  PERFORMANCE: {
    IMAGE_QUALITY: getNumericEnvVar('IMAGE_QUALITY', 0.8),
    MAX_CONCURRENT_REQUESTS: getNumericEnvVar('MAX_CONCURRENT_REQUESTS', 10),
    REQUEST_RETRY_COUNT: getNumericEnvVar('REQUEST_RETRY_COUNT', 3),
    // REQUEST_RETRY_DELAY: getNumericEnvVar('REQUEST_RETRY_DELAY', 1000),
  },

  // Debug
  DEBUG: {
    ENABLE_LOGGING: ENV.DEBUG_MODE,
    // ENABLE_NETWORK_INSPECTOR: ENV.ENABLE_NETWORK_INSPECTOR,
    ENABLE_REDUX_DEVTOOLS: getBooleanEnvVar('ENABLE_REDUX_DEVTOOLS', true),
    LOG_LEVEL: (ENV.LOG_LEVEL || 'debug') as const,
  },
};
