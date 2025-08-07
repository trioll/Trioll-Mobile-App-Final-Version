import type { Game } from '../types/api.types';
/**
 * Data Mapper Utility
 * Maps API responses to existing app data structures
 * Preserves backward compatibility with dummy data format
 */

// Convert CloudFront URLs to S3 URLs to avoid 403 errors
// NOTE: This is only used for gameUrl and image URLs, NOT for trialUrl
// trialUrl should use CloudFront for optimal CDN performance
const convertCloudFrontToS3Url = (url: string | undefined): string => {
  if (!url) return '';
  
  // Replace CloudFront domain with S3 domain
  if (url.includes('d33yj1oylm0icp.cloudfront.net')) {
    return url.replace('d33yj1oylm0icp.cloudfront.net', 'trioll-prod-games-us-east-1.s3.amazonaws.com');
  }
  
  return url;
};

// API Response Types
interface ApiGame {
  gameId?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  desc?: string;
  tagline?: string;
  subtitle?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  image?: string;
  imageUrl?: string;
  coverImage?: string;
  videoUrl?: string;
  video?: string;
  genre?: string;
  category?: string;
  rating?: number;
  ratingCount?: number;
  likeCount?: number;
  playCount?: number | string;
  plays?: number | string;
  totalPlayCount?: number | string;
  downloads?: number | string;
  downloadCount?: number | string;
  developer?: string;
  developerName?: string;
  publisher?: string;
  publisherName?: string;
  gameUrl?: string;
  url?: string;
  downloadUrl?: string;
  size?: string;
  downloadSize?: string;
  trialDuration?: number | string;
  minPlayTime?: number | string;
  trialPlays?: number | string;
  trialType?: string;
  trialUrl?: string;
  releaseDate?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  price?: number | string;
  platform?: string;
  ageRating?: string;
  tags?: string[];
  categories?: string[];
  features?: string[];
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  status?: string;
  version?: string;
  gameType?: string;
}

interface ApiUser {
  userId?: string;
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  profilePicture?: string;
  avatar?: string;
  bio?: string;
  description?: string;
  level?: number | string;
  xp?: number | string;
  experience?: number | string;
  gamesPlayed?: number | string;
  totalPlayTime?: number | string;
  achievements?: unknown[];
  favoriteCategories?: string[];
  preferences?: {
    categories?: string[];
    [key: string]: unknown;
  };
  friends?: unknown[];
  createdAt?: string;
  joinDate?: string;
  lastActiveAt?: string;
  // isDeveloper?: boolean; // Developer portal removed
  role?: string;
  isPremium?: boolean;
  subscription?: boolean;
  gamingDNA?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

interface ApiCategory {
  id?: string;
  categoryId?: string;
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  emoji?: string;
  color?: string;
  gameCount?: number | string;
  count?: number | string;
}

interface ApiStats {
  totalGames?: number | string;
  gamesCount?: number | string;
  totalPlayTime?: number | string;
  playTime?: number | string;
  favoriteGenre?: string;
  topCategory?: string;
  achievements?: number | string;
  achievementCount?: number | string;
  level?: number | string;
  xp?: number | string;
  experience?: number | string;
  rank?: string;
  ranking?: string;
  weeklyStreak?: number | string;
  streak?: number | string;
}

// Maps API game response to existing Game type structure
export const mapGameData = (apiGame: ApiGame): Game => ({
  // Core fields
  id: apiGame.gameId || apiGame.id || '',
  title: apiGame.title || apiGame.name || 'Untitled Game',

  // Description fields
  description: apiGame.description || apiGame.desc || '',

  // Image/Media fields - Convert CloudFront URLs to S3 to avoid 403 errors
  thumbnailUrl: convertCloudFrontToS3Url(
    apiGame.thumbnailUrl ||
    apiGame.thumbnail ||
    apiGame.image ||
    apiGame.imageUrl ||
    'https://img.gamedistribution.com/07326c59e55a4796b087aa7c3ac51204-512x512.jpeg'
  ),
  coverImage: convertCloudFrontToS3Url(
    apiGame.coverImage ||
    apiGame.thumbnailUrl ||
    apiGame.image ||
    'https://img.gamedistribution.com/07326c59e55a4796b087aa7c3ac51204-512x512.jpeg'
  ),
  trailerUrl: convertCloudFrontToS3Url(apiGame.videoUrl || apiGame.video || ''),

  // Category/Genre - Map category to genre for consistency
  genre: apiGame.genre || apiGame.category || 'General',

  // Stats - Reset to 0 for fresh analytics
  rating: 0, // Reset all ratings to 0
  ratingCount: 0, // Reset rating count to 0
  likeCount: 0, // Reset all like counts to 0
  playCount: Number((apiGame as any).downloads || apiGame.downloadCount || 0),

  // Developer info
  developer:
    apiGame.developer || (apiGame as any).developerName || apiGame.publisher || 'Unknown Developer',
  publisherName:
    apiGame.publisher || apiGame.publisherName || apiGame.developer || 'Unknown Publisher',

  // Game details - Convert CloudFront URLs to S3
  gameUrl: convertCloudFrontToS3Url(apiGame.gameUrl || apiGame.url || apiGame.downloadUrl || ''),
  downloadUrl: convertCloudFrontToS3Url(apiGame.downloadUrl || apiGame.gameUrl || ''),
  downloadSize: apiGame.size || apiGame.downloadSize || '100 MB',

  // Trial info
  // trialDuration: Number(apiGame.trialDuration || apiGame.minPlayTime || 5),
  playCount: Number(apiGame.trialPlays || 0),
  trialType: (apiGame.trialType as 'webview' | 'native') || 'webview',
  // DO NOT convert trialUrl - keep CloudFront URLs as-is for optimal CDN performance
  trialUrl: apiGame.trialUrl ||
    apiGame.gameUrl ||
    apiGame.downloadUrl ||
    `https://html5.gamedistribution.com/a55c9cc9c21e4fc683c8c6b7b3a5b6d7/?gdpr-targeting=1&gdpr-tracking=1&gdpr-third-party=0&fullscreen=1`,

  // Release info
  releaseDate:
    apiGame.releaseDate || apiGame.publishedAt || apiGame.createdAt || new Date().toISOString(),

  // Pricing
  price: Number(apiGame.price || 0),

  // Platform/Age
  platforms: ["all"],
  minAge: 0,

  // Tags and features
  tags: Array.isArray(apiGame.tags) ? apiGame.tags : apiGame.categories || apiGame.features || [],

  // Status flags
  featured: Boolean(apiGame.featured || false),
  isNew: Boolean(apiGame.isNew || false),
  isTrending: Boolean(apiGame.isTrending || false),

  // User interaction states (will be set by the app)
  isLiked: Boolean(apiGame.isLiked || false),
  isBookmarked: Boolean(apiGame.isBookmarked || false),

  // Timestamps
  createdAt: apiGame.createdAt || new Date().toISOString(),
  updatedAt: apiGame.updatedAt || apiGame.createdAt || new Date().toISOString(),

  // Additional fields the app might expect
  status: apiGame.status || 'active',
  version: apiGame.version || '1.0.0',
  gameType: apiGame.gameType || 'html5',
});

// Maps array of games
export const mapGamesArray = (apiResponse: unknown): Game[] => {
  // Handle different response formats
  let games: ApiGame[] = [];

  if (Array.isArray(apiResponse)) {
    games = apiResponse as ApiGame[];
  } else if (typeof apiResponse === 'object' && apiResponse !== null) {
    const response = apiResponse as Record<string, unknown>;
    if (response.games && Array.isArray(response.games)) {
      games = response.games as ApiGame[];
    } else if (response.items && Array.isArray(response.items)) {
      games = response.items as ApiGame[];
    } else if ((response as any).data && Array.isArray((response as any).data)) {
      games = (response as any).data as ApiGame[];
    }
  }

  return games.map(mapGameData);
};

// Map user data to existing structure
export const mapUserData = (apiUser: ApiUser) => ({
  id: apiUser.userId || apiUser.id || '',
  username: apiUser.username || apiUser.displayName || 'Guest',
  email: apiUser.email || '',

  // Profile info
  displayName: apiUser.displayName || apiUser.username || 'Player',
  profilePicture: apiUser.profilePicture || apiUser.avatar || '',
  bio: apiUser.bio || apiUser.description || '',

  // Gaming stats
  level: Number(apiUser.level || 1),
  xp: Number(apiUser.xp || apiUser.experience || 0),
  gamesPlayed: Number(apiUser.gamesPlayed || 0),
  totalPlayTime: Number(apiUser.totalPlayTime || 0),

  // Collections
  achievements: apiUser.achievements || [],
  favoriteCategories: apiUser.favoriteCategories || apiUser.preferences?.categories || [],
  friends: apiUser.friends || [],

  // Dates
  joinDate: apiUser.createdAt || apiUser.joinDate || new Date().toISOString(),
  lastActiveAt: apiUser.lastActiveAt || new Date().toISOString(),

  // Flags
  // isDeveloper: Boolean(apiUser.isDeveloper || apiUser.role === 'developer'), // Developer portal removed
  isPremium: Boolean(apiUser.isPremium || apiUser.subscription),

  // Gaming DNA (if your app uses this)
  gamingDNA: apiUser.gamingDNA || apiUser.preferences || {},

  // Settings
  settings: apiUser.settings || {},
});

// Map category data
export const mapCategoryData = (apiCategory: ApiCategory) => ({
  id: apiCategory.id || apiCategory.categoryId || '',
  name: apiCategory.name || apiCategory.title || '',
  description: apiCategory.description || '',
  icon: apiCategory.icon || apiCategory.emoji || '🎮',
  color: apiCategory.color || '#6366f1',
  gameCount: Number(apiCategory.gameCount || apiCategory.count || 0),
});

// Map analytics/stats data
export const mapStatsData = (apiStats: ApiStats) => ({
  totalGames: Number(apiStats.totalGames || apiStats.gamesCount || 0),
  totalPlayTime: Number(apiStats.totalPlayTime || apiStats.playTime || 0),
  favoriteGenre: apiStats.favoriteGenre || apiStats.topCategory || '',
  achievements: Number(apiStats.achievements || apiStats.achievementCount || 0),
  level: Number(apiStats.level || 1),
  xp: Number(apiStats.xp || apiStats.experience || 0),
  rank: apiStats.rank || apiStats.ranking || 'Beginner',
  weeklyStreak: Number(apiStats.weeklyStreak || apiStats.streak || 0),
});

// Export dataMapper object for consistency with existing code
export const dataMapper = {
  mapApiGameToLocal: mapGameData,
  mapGamesArray,
  mapUserData,
  mapCategoryData,
  mapStatsData,
};
