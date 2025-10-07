/**
 * Enhanced API Service
 * Provides access to new backend features:
 * - Game progress tracking
 * - Play streaks
 * - Achievements
 * - Trending games
 * - Personalized recommendations
 * - Leaderboards
 */

import { triollAPI } from './TriollAPI';
import { safeAuthService } from '../auth/safeAuthService';

export interface GameProgress {
  userId: string;
  gameId: string;
  level: number;
  score: number;
  achievements: string[];
  lastPlayed: string;
  totalPlayTime: number;
  saveData?: any;
}

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string;
  totalDaysPlayed: number;
  playDates: string[];
}

export interface Achievement {
  userId: string;
  achievementId: string;
  gameId?: string;
  unlockedAt: string;
  progress?: number;
  metadata?: any;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  timestamp: string;
}

export interface TrendingGame {
  gameId: string;
  title: string;
  thumbnail: string;
  category: string;
  trendingScore: number;
  playCount: number;
  likeCount: number;
  averageRating: number;
}

class EnhancedAPI {
  private baseUrl = triollAPI.baseUrl;

  /**
   * Game Progress & Saves
   */
  async getGameProgress(gameId: string): Promise<GameProgress | null> {
    try {
      return await triollAPI.makeRequest<GameProgress>(`/games/${gameId}/progress`);
    } catch {
      console.error('Error getting game progress:', error);
      return null;
    }
  }

  async saveGameProgress(gameId: string, progress: Partial<GameProgress>): Promise<GameProgress> {
    return triollAPI.makeRequest<GameProgress>(`/games/${gameId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  }

  /**
   * Play Streaks
   */
  async getUserStreak(): Promise<UserStreak | null> {
    try {
      return await triollAPI.makeRequest<UserStreak>('/users/streaks');
    } catch {
      console.error('Error getting user streak:', error);
      return null;
    }
  }

  async updateUserStreak(): Promise<UserStreak> {
    return triollAPI.makeRequest<UserStreak>('/users/streaks', {
      method: 'POST',
    });
  }

  /**
   * Achievements
   */
  async getUserAchievements(): Promise<Achievement[]> {
    try {
      const response = await triollAPI.makeRequest<{ achievements: Achievement[] }>('/users/achievements');
      return response.achievements || [];
    } catch {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  async unlockAchievement(achievementId: string, gameId?: string): Promise<Achievement> {
    return triollAPI.makeRequest<Achievement>('/users/achievements', {
      method: 'POST',
      body: JSON.stringify({ achievementId, gameId }),
    });
  }

  /**
   * Trending & Recommendations
   */
  async getTrendingGames(limit = 10): Promise<TrendingGame[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      const response = await triollAPI.makeRequest<{ games: TrendingGame[] }>(`/games/trending?${params}`);
      return response.games || [];
    } catch {
      console.error('Error getting trending games:', error);
      return [];
    }
  }

  async getRecommendedGames(limit = 10): Promise<TrendingGame[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      const response = await triollAPI.makeRequest<{ games: TrendingGame[] }>(`/games/recommended?${params}`);
      return response.games || [];
    } catch {
      console.error('Error getting recommended games:', error);
      return [];
    }
  }

  /**
   * Advanced Search
   */
  async searchGamesAdvanced(params: {
    query?: string;
    categories?: string[];
    minRating?: number;
    maxPlayers?: number;
    tags?: string[];
    sortBy?: 'relevance' | 'popularity' | 'rating' | 'newest';
    limit?: number;
  }): Promise<TrendingGame[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append('q', params.query);
      if (params.categories?.length) searchParams.append('categories', params.categories.join(','));
      if (params.minRating) searchParams.append('minRating', params.minRating.toString());
      if (params.maxPlayers) searchParams.append('maxPlayers', params.maxPlayers.toString());
      if (params.tags?.length) searchParams.append('tags', params.tags.join(','));
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await triollAPI.makeRequest<{ games: TrendingGame[] }>(`/games/search/advanced?${searchParams}`);
      return response.games || [];
    } catch {
      console.error('Error in advanced search:', error);
      return [];
    }
  }

  /**
   * Leaderboards
   */
  async getGameLeaderboard(gameId: string, period: 'daily' | 'weekly' | 'alltime' = 'alltime', limit = 50): Promise<LeaderboardEntry[]> {
    try {
      const params = new URLSearchParams({
        period,
        limit: limit.toString(),
      });
      const response = await triollAPI.makeRequest<{ leaderboard: LeaderboardEntry[] }>(`/games/${gameId}/leaderboard?${params}`);
      return response.leaderboard || [];
    } catch {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * WebSocket Connection for Real-time Updates
   */
  subscribeToLeaderboard(gameId: string, onUpdate: (data: LeaderboardEntry[]) => void): () => void {
    // This would connect to WebSocket for real-time leaderboard updates
    // For now, return a no-op unsubscribe function
    console.log('WebSocket leaderboard subscription not yet implemented');
    return () => {};
  }

  /**
   * Batch Operations
   */
  async batchGetProgress(gameIds: string[]): Promise<GameProgress[]> {
    try {
      const response = await triollAPI.makeRequest<{ progress: GameProgress[] }>('/games/progress/batch', {
        method: 'POST',
        body: JSON.stringify({ gameIds }),
      });
      return response.progress || [];
    } catch {
      console.error('Error getting batch progress:', error);
      return [];
    }
  }

  /**
   * Statistics
   */
  async getPlayerStats(userId?: string): Promise<{
    totalPlayTime: number;
    gamesPlayed: number;
    achievementsUnlocked: number;
    currentStreak: number;
    favoriteCategory: string;
    averageSessionLength: number;
  }> {
    try {
      const id = userId || (await safeAuthService.getCurrentUserId());
      return triollAPI.makeRequest(`/users/${id}/stats/detailed`);
    } catch {
      console.error('Error getting player stats:', error);
      return {
        totalPlayTime: 0,
        gamesPlayed: 0,
        achievementsUnlocked: 0,
        currentStreak: 0,
        favoriteCategory: 'Unknown',
        averageSessionLength: 0,
      };
    }
  }
}

// Export singleton instance
export const enhancedAPI = new EnhancedAPI();

// Also export types
export type { 
  GameProgress, 
  UserStreak, 
  Achievement, 
  LeaderboardEntry, 
  TrendingGame 
};