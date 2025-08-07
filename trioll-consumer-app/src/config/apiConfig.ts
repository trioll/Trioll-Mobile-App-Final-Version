
/**
 * API Configuration
 * Centralized configuration for backend endpoints
 */

import { Config } from './environments';

// Environment-based configuration
const ENV = Config.ENV || (__DEV__ ? 'development' : 'production');

// AWS Cognito configuration
const COGNITO_CONFIG = {
  userPoolId: Config.USER_POOL_ID,
  clientId: Config.USER_POOL_CLIENT_ID,
  region: Config.AWS_REGION,
};

// DynamoDB table names
const TABLE_NAMES = {
  users: Config.USERS_TABLE,
  games: Config.GAMES_TABLE,
  interactions: `trioll-${Config.ENV}-interactions`,
};

// Feature flags
const FEATURES = {
  useBackendRegistration: true, // Use backend API for registration
  useDirectCognito: false, // Use Cognito SDK directly (fallback)
  enableGuestMode: true, // Allow guest access
  requireEmailVerification: true, // Require email verification
};

// Export configuration
export const apiConfig = {
  baseUrl: Config.API_BASE_URL,
  cognito: COGNITO_CONFIG,
  tables: TABLE_NAMES,
  features: FEATURES,
  env: ENV,
};

// API endpoint paths
export const API_ENDPOINTS = {
  // User endpoints
  register: '/users/register',
  verify: '/users/verify',
  profile: '/users/profile',
  updateProfile: '/users/:userId',

  // Authentication endpoints
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',

  // Game endpoints
  games: '/games',
  gameDetails: '/games/:gameId',
  featuredGames: '/games/featured',
  searchGames: '/games/search',

  // Interaction endpoints
  likeGame: '/games/:gameId/likes',
  bookmarkGame: '/games/:gameId/bookmarks',
  playGame: '/games/:gameId/plays',
  rateGame: '/games/:gameId/ratings',

  // Analytics endpoints
  trackEvent: '/analytics/events',
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${apiConfig.baseUrl}${endpoint}`;

  // Replace path parameters
  if (params) {
    Object.keys(params).forEach((key) => { const value = params[key];
      url = url.replace(`:${key}`, value);
    });
  }

  return url;
};
