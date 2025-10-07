 
import { development } from './development';
import { staging } from './staging';
import { production } from './production';

// Type definitions
export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  ENV: Environment;
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  USE_MOCK_API: boolean;
  API_TIMEOUT: number;
  AWS_REGION: string;
  USER_POOL_ID: string;
  USER_POOL_CLIENT_ID: string;
  IDENTITY_POOL_ID: string;
  S3_GAMES_BUCKET: string;
  S3_UPLOADS_BUCKET: string;
  S3_ANALYTICS_BUCKET: string;
  GAMES_TABLE: string;
  USERS_TABLE: string;
  FEATURES: {
    BIOMETRIC_AUTH: boolean;
    SOCIAL_LOGIN: boolean;
    OFFLINE_MODE: boolean;
    WEBSOCKET_ENABLED: boolean;
    ANALYTICS_ENABLED: boolean;
    CRASH_REPORTING: boolean;
    PERFORMANCE_MONITORING: boolean;
    AUTH_FALLBACK: boolean;
  };
  CACHE: {
    DEFAULT_TTL: number;
    MAX_CACHE_SIZE: number;
    ENABLE_PERSISTENCE: boolean;
  };
  PERFORMANCE: {
    IMAGE_QUALITY: number;
    MAX_CONCURRENT_REQUESTS: number;
    REQUEST_RETRY_COUNT: number;
    REQUEST_TIMEOUT: number;
  };
  DEBUG: {
    ENABLE_LOGGING: boolean;
    LOG_LEVEL: string;
    ENABLE_NETWORK_LOGGING: boolean;
    ENABLE_REDUX_LOGGER: boolean;
  };
  ENV_NAME: string;
  API: {
    BASE_URL: string;
    TIMEOUT: number;
  };
}

const environments: Record<Environment, EnvironmentConfig> = {
  development,
  staging,
  production,
};

// Get environment from multiple sources
function getEnvironment(): Environment {
  // Check React Native __DEV__ flag
  if (__DEV__) {
    return 'development';
  }

  // Check environment variable
  const env = process.env.REACT_APP_ENV || process.env.NODE_ENV;

  if (env && (env === 'development' || env === 'staging' || env === 'production')) {
    return env as Environment;
  }

  // Default to production for release builds
  return 'production';
}

export const Config: EnvironmentConfig = environments[getEnvironment()];

// Export helper to switch environments (for testing)
export function setEnvironment(env: Environment): void {
  if (__DEV__) {
    // @ts-expect-error - Allow reassignment in dev
    Object.assign(Config, environments[env]);
  }
}

// Log current environment on startup (delayed to avoid circular dependency)
if (__DEV__) {
  setTimeout(() => {
    const { getLogger } = require('../../utils/logger');
    const logger = getLogger('Config');

    logger.info(`🚀 Running in ${Config.ENV} environment`);
    logger.info(`📡 API: ${Config.API_BASE_URL}`);
    logger.info(`🔌 WebSocket: ${Config.WEBSOCKET_URL}`);
    logger.info(`🎭 Mock API: ${Config.USE_MOCK_API ? 'Enabled' : 'Disabled'}`);
    logger.info(`🔐 Cognito Pool: ${Config.USER_POOL_ID}`);
    logger.info(`🔑 Cognito Client: ${Config.USER_POOL_CLIENT_ID}`);
  }, 0);
}
