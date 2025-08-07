/**
 * API Type Definitions
 * Central location for all API-related types
 */

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

// Game Types
export interface Game {
  id: string;
  title: string;
  description: string;
  genre: string;
  developer: string;
  publisher?: string;
  releaseDate?: string;
  thumbnailUrl: string;
  coverImageUrl?: string;
  coverUrl?: string; // Added for backward compatibility
  trailerUrl?: string;
  trialUrl?: string;
  rating: number;
  ratingCount: number;
  playCount: number;
  likeCount: number;
  likesCount?: number; // Alternative property name
  commentsCount?: number;
  averageRating?: number;
  tags?: string[];
  platforms?: string[];
  minAge?: number;
  featured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  
  // Preview content fields (optional - for future use)
  icon?: string;
  screenshots?: string[];
  videos?: string[];
  ageRating?: string;
  developerId?: string;
  
  // Computed/display fields
  platform?: string; // Single platform string for UI display
  totalRatings?: number; // Same as ratingCount, for UI compatibility
  hasVideo?: boolean; // Derived from trailerUrl
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  avatar?: string; // alias for avatarUrl
  bio?: string;
  level?: number;
  lastActive?: string;
  status?: 'active' | 'inactive' | 'banned';
  xp?: number;
  gamesPlayed?: number;
  achievements?: Achievement[];
  friends?: string[];
  createdAt?: string;
  updatedAt?: string;
  preferences?: UserPreferences;
  stats?: UserStats;
  
  // Guest user properties
  isGuest?: boolean;
  guestId?: string;
  guestCreatedAt?: string;
  
  // Conversion tracking
  convertedFromGuest?: boolean;
  originalGuestId?: string;
}

export interface UserPreferences {
  favoriteGenres?: string[];
  notificationsEnabled?: boolean;
  privateProfile?: boolean;
  language?: string;
  theme?: 'dark' | 'light';
}

export interface UserStats {
  totalPlayTime?: number;
  gamesPlayed?: number;
  achievementsUnlocked?: number;
  friendsCount?: number;
  level?: number;
  xp?: number;
}

// Interaction Types
export interface GameInteraction {
  userId: string;
  gameId: string;
  type: 'like' | 'play' | 'rating' | 'bookmark';
  value?: number; // For ratings
  timestamp: string;
}

// Achievement Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  xpReward?: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  category?: string;
}

// Auth Types
export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    idToken?: string;
  };
  expiresIn?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}

// Analytics Types
export interface AnalyticsEvent {
  eventType: string;
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
  platform?: string;
  appVersion?: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'notification' | 'friend_activity' | 'game_update' | 'system' | 'error';
  action?: string;
  payload?: any;
  timestamp?: string;
  id?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp?: string;
}

// Standardized Error Response (Building on existing ApiError)
export interface StandardErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  error?: {
    code: string;
    details?: Record<string, any>;
  };
}

// Standardized Success Response
export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  statusCode: number;
}

// Union type for all API responses
export type StandardApiResponse<T = any> = 
  | StandardSuccessResponse<T> 
  | StandardErrorResponse;

// Type guard for error responses
export function isErrorResponse(
  response: StandardApiResponse
): response is StandardErrorResponse {
  return !response.success;
}

// Type guard for success responses
export function isSuccessResponse<T>(
  response: StandardApiResponse<T>
): response is StandardSuccessResponse<T> {
  return response.success === true;
}

// Search Types
export interface SearchParams {
  query: string;
  filters?: {
    genres?: string[];
    platforms?: string[];
    minRating?: number;
    maxAge?: number;
    featured?: boolean;
  };
  pagination?: PaginationParams;
}

// Friend Types
export interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'in_game';
  lastSeen?: string;
  currentGame?: string;
  mutualFriends?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  message?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'friend_request' | 'achievement' | 'game_update' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
  actionUrl?: string;
}

// Trial Types
export interface Trial {
  id: string;
  gameId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  score?: number;
  achievements?: string[];
  completed: boolean;
  timeLimit: number;
}

// Developer Types
export interface DeveloperGame {
  id: string;
  title: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  submittedAt?: string;
  publishedAt?: string;
  reviewNotes?: string;
  analytics?: GameAnalytics;
}

export interface GameAnalytics {
  plays: number;
  likes: number;
  ratings: number;
  averageRating: number;
  revenue?: number;
  conversionRate?: number;
  retentionRate?: number;
}

// Admin Types
export interface AdminUser extends User {
  role: 'admin' | 'moderator' | 'support';
  permissions: string[];
  lastLogin?: string;
}

export interface GameReview {
  gameId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected';
  checklist: ReviewChecklist;
  notes?: string;
  reviewedAt?: string;
}

export interface ReviewChecklist {
  contentAppropriate: boolean;
  performanceAcceptable: boolean;
  noMaliciousCode: boolean;
  metadataComplete: boolean;
  assetsOptimized: boolean;
}

// Type Guards
export function isApiError(error: unknown): error is ApiError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return response && typeof response.success === 'boolean';
}

// Export all types
