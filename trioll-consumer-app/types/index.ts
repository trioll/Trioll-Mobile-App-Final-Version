// Re-export all types from api.types.ts
export type { 
  Game, 
  User, 
  ApiResponse,
  Achievement,
  Friend,
  FriendRequest,
  Notification,
  Trial,
  DeveloperGame,
  GameAnalytics,
  AdminUser,
  GameReview,
  ReviewChecklist,
  WebSocketMessage,
  ApiError,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  AnalyticsEvent,
  PaginationParams,
  PaginatedResponse,
  SearchParams,
  GameInteraction,
  UserPreferences,
  UserStats
} from '../src/types/api.types';

// Legacy Comment type for compatibility
export interface Comment {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

// Re-export guest types
export * from './guest';

// Additional type aliases for compatibility
export type GameLibraryItem = Game & {
  addedAt?: Date;
  lastPlayed?: Date | null;
  progress?: number;
  playTime?: number;
  isFavorite?: boolean;
  collection?: string | null;
};

export type SimilarGame = Game;
export type GameSubmission = Game & {
  submittedAt?: Date;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  reviewNotes?: string;
};
