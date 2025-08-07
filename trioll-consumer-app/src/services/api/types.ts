import type { ApiResponse, Game, User } from '../../types/api.types';
/**
 * Type definitions for Trioll API services
 */

// Base API response type
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  error?: string;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Games API types
export interface GamesResponse {
  games: Game[];
  pagination?: PaginationMeta;
  filters?: {
    category?: string;
    sortBy?: string;
  };
}

export interface GameDetailsResponse extends Game {
  relatedGames?: Game[];
  developerGames?: Game[];
}

// User API types
export interface UserProfile extends User {
  displayName?: string;
  bio?: string;
  coverImage?: string;
  level?: number;
  xp?: number;
  gamesPlayed?: number;
  achievements?: number;
  friends?: number;
  joinedDate?: string;
  lastActive?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    friendRequests: boolean;
    gameUpdates: boolean;
    achievements: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    activityVisibility: 'public' | 'friends' | 'private';
  };
  gameplay: {
    autoPlay: boolean;
    hapticFeedback: boolean;
    soundEffects: boolean;
  };
}

export interface UserProfileUpdate {
  displayName?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserStats {
  userId: string;
  totalPlayTime: number;
  gamesPlayed: number;
  achievementsUnlocked: number;
  favoriteGenre: string;
  longestStreak: number;
  currentStreak: number;
  weeklyActivity: number[];
  topGames: Array<{
    gameId: string;
    playTime: number;
    lastPlayed: string;
  }>;
}

// Interaction API types
export interface LikeResponse {
  success: boolean;
  gameId: string;
  userId: string;
  totalLikes: number;
  isLiked: boolean;
}

export interface PlaySessionData {
  userId: string;
  gameId: string;
  sessionId: string;
  duration: number;
  score?: number;
  achievements?: string[];
  timestamp?: string;
}

export interface PlaySessionResponse {
  success: boolean;
  sessionId: string;
  totalPlays: number;
}

export interface RatingData {
  userId: string;
  gameId: string;
  rating: number;
  review?: string;
}

export interface RatingResponse {
  success: boolean;
  gameId: string;
  averageRating: number;
  totalRatings: number;
  userRating?: number;
}

// Friends API types
export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  level?: number;
  status: 'online' | 'offline' | 'playing';
  currentGame?: string;
  friendsSince: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar?: string;
  toUserId: string;
  message?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface FriendActivity {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  type: 'played' | 'liked' | 'rated' | 'achievement' | 'friend_added';
  gameId?: string;
  gameTitle?: string;
  gameThumbnail?: string;
  details?: {
    rating?: number;
    achievement?: string;
    duration?: number;
    friendUsername?: string;
  };
  timestamp: string;
}

export interface FriendsResponse {
  friends: Friend[];
  total: number;
}

export interface FriendRequestsResponse {
  requests: FriendRequest[];
  total: number;
}

export interface FriendActivityResponse {
  activities: FriendActivity[];
  hasMore: boolean;
}

// Analytics API types
export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  data: AnalyticsEventData;
  platform?: string;
  appVersion?: string;
}

export interface AnalyticsEventData {
  gameId?: string;
  screen?: string;
  action?: string;
  category?: string;
  label?: string;
  value?: number;
  duration?: number;
  error?: string;
  metadata?: Record<string, string | number | boolean>;
}

// Category API types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  gameCount: number;
}

export interface CategoriesResponse {
  categories: Category[];
}

// Search API types
export interface SearchResponse {
  results: Game[];
  query: string;
  total: number;
  suggestions?: string[];
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Request options
export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}
