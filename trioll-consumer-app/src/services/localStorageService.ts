/**
 * Local Storage Service for Guest Data
 * Manages guest user interactions locally before registration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '../utils/logger';

const logger = getLogger('LocalStorageService');

// Storage keys
const STORAGE_KEYS = {
  GUEST_DATA: '@trioll/guest_data',
  GUEST_LIKES: '@trioll/guest_likes',
  GUEST_BOOKMARKS: '@trioll/guest_bookmarks',
  GUEST_PLAY_HISTORY: '@trioll/guest_play_history',
  GUEST_RATINGS: '@trioll/guest_ratings',
  GUEST_PREFERENCES: '@trioll/guest_preferences',
};

// Types
interface GuestLike {
  gameId: string;
  timestamp: Date;
}

interface GuestBookmark {
  gameId: string;
  timestamp: Date;
}

interface GuestPlaySession {
  gameId: string;
  duration: number;
  score?: number;
  timestamp: Date;
}

interface GuestRating {
  gameId: string;
  rating: number;
  timestamp: Date;
}

interface GuestData {
  likes: GuestLike[];
  bookmarks: GuestBookmark[];
  playHistory: GuestPlaySession[];
  ratings: GuestRating[];
  preferences: Record<string, any>;
  createdAt: Date;
  lastUpdated: Date;
}

class LocalStorageService {
  private guestData: GuestData = {
    likes: [],
    bookmarks: [],
    playHistory: [],
    ratings: [],
    preferences: {},
    createdAt: new Date(),
    lastUpdated: new Date(),
  };

  constructor() {
    this.loadGuestData();
  }

  /**
   * Load guest data from AsyncStorage
   */
  private async loadGuestData() {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_DATA);
      if (storedData) {
        this.guestData = JSON.parse(storedData);
        logger.info('Guest data loaded', { 
          likes: this.guestData.likes.length,
          bookmarks: this.guestData.bookmarks.length,
          plays: this.guestData.playHistory.length,
        });
      }
    } catch {
      logger.error('Failed to load guest data:', error);
    }
  }

  /**
   * Save guest data to AsyncStorage
   */
  private async saveGuestData() {
    try {
      this.guestData.lastUpdated = new Date();
      await AsyncStorage.setItem(STORAGE_KEYS.GUEST_DATA, JSON.stringify(this.guestData));
    } catch {
      logger.error('Failed to save guest data:', error);
    }
  }

  /**
   * Add a guest like
   */
  async addGuestLike(gameId: string): Promise<{ success: boolean; local: boolean }> {
    try {
      // Check if already liked
      const existingIndex = this.guestData.likes.findIndex(like => like.gameId === gameId);
      if (existingIndex >= 0) {
        return { success: true, local: true };
      }

      // Add new like
      this.guestData.likes.push({
        gameId,
        timestamp: new Date(),
      });

      await this.saveGuestData();
      logger.info('Guest like added locally', { gameId });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to add guest like:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Remove a guest like
   */
  async removeGuestLike(gameId: string): Promise<{ success: boolean; local: boolean }> {
    try {
      this.guestData.likes = this.guestData.likes.filter(like => like.gameId !== gameId);
      await this.saveGuestData();
      logger.info('Guest like removed locally', { gameId });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to remove guest like:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Add a guest bookmark
   */
  async addGuestBookmark(gameId: string): Promise<{ success: boolean; local: boolean }> {
    try {
      // Check if already bookmarked
      const existingIndex = this.guestData.bookmarks.findIndex(bookmark => bookmark.gameId === gameId);
      if (existingIndex >= 0) {
        return { success: true, local: true };
      }

      // Add new bookmark
      this.guestData.bookmarks.push({
        gameId,
        timestamp: new Date(),
      });

      await this.saveGuestData();
      logger.info('Guest bookmark added locally', { gameId });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to add guest bookmark:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Remove a guest bookmark
   */
  async removeGuestBookmark(gameId: string): Promise<{ success: boolean; local: boolean }> {
    try {
      this.guestData.bookmarks = this.guestData.bookmarks.filter(bookmark => bookmark.gameId !== gameId);
      await this.saveGuestData();
      logger.info('Guest bookmark removed locally', { gameId });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to remove guest bookmark:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Track guest play session
   */
  async trackGuestPlay(gameId: string, duration: number, score?: number): Promise<{ success: boolean; local: boolean }> {
    try {
      this.guestData.playHistory.push({
        gameId,
        duration,
        score,
        timestamp: new Date(),
      });

      // Keep only last 100 play sessions
      if (this.guestData.playHistory.length > 100) {
        this.guestData.playHistory = this.guestData.playHistory.slice(-100);
      }

      await this.saveGuestData();
      logger.info('Guest play tracked locally', { gameId, duration, score });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to track guest play:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Add guest rating
   */
  async addGuestRating(gameId: string, rating: number): Promise<{ success: boolean; local: boolean }> {
    try {
      // Update existing rating or add new
      const existingIndex = this.guestData.ratings.findIndex(r => r.gameId === gameId);
      if (existingIndex >= 0) {
        this.guestData.ratings[existingIndex] = {
          gameId,
          rating,
          timestamp: new Date(),
        };
      } else {
        this.guestData.ratings.push({
          gameId,
          rating,
          timestamp: new Date(),
        });
      }

      await this.saveGuestData();
      logger.info('Guest rating added locally', { gameId, rating });
      
      return { success: true, local: true };
    } catch {
      logger.error('Failed to add guest rating:', error);
      return { success: false, local: true };
    }
  }

  /**
   * Get all guest data
   */
  async getGuestData(): Promise<GuestData> {
    await this.loadGuestData(); // Ensure fresh data
    return this.guestData;
  }

  /**
   * Check if game is liked by guest
   */
  isGameLiked(gameId: string): boolean {
    return this.guestData.likes.some(like => like.gameId === gameId);
  }

  /**
   * Check if game is bookmarked by guest
   */
  isGameBookmarked(gameId: string): boolean {
    return this.guestData.bookmarks.some(bookmark => bookmark.gameId === gameId);
  }

  /**
   * Get guest rating for game
   */
  getGameRating(gameId: string): number | null {
    const rating = this.guestData.ratings.find(r => r.gameId === gameId);
    return rating ? rating.rating : null;
  }

  /**
   * Merge guest data to account after registration
   */
  async mergeGuestDataToAccount(userId: string): Promise<{ merged: number; failed: number }> {
    const guestData = await this.getGuestData();
    let merged = 0;
    let failed = 0;

    logger.info('Starting guest data merge', { 
      userId,
      likes: guestData.likes.length,
      bookmarks: guestData.bookmarks.length,
      ratings: guestData.ratings.length,
    });

    // Merge likes
    for (const like of guestData.likes) {
      try {
        await triollAPI.likeGame(like.gameId);
        merged++;
      } catch {
        logger.error('Failed to merge like', { gameId: like.gameId, error });
        failed++;
      }
    }

    // Merge bookmarks
    for (const bookmark of guestData.bookmarks) {
      try {
        await triollAPI.bookmarkGame(bookmark.gameId);
        merged++;
      } catch {
        logger.error('Failed to merge bookmark', { gameId: bookmark.gameId, error });
        failed++;
      }
    }

    // Merge ratings
    for (const rating of guestData.ratings) {
      try {
        await triollAPI.rateGame(rating.gameId, rating.rating);
        merged++;
      } catch {
        logger.error('Failed to merge rating', { gameId: rating.gameId, error });
        failed++;
      }
    }

    // Clear guest data after successful merge
    if (merged > 0) {
      await this.clearGuestData();
    }

    logger.info('Guest data merge completed', { merged, failed });
    return { merged, failed };
  }

  /**
   * Clear all guest data
   */
  async clearGuestData() {
    this.guestData = {
      likes: [],
      bookmarks: [],
      playHistory: [],
      ratings: [],
      preferences: {},
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.GUEST_DATA);
      logger.info('Guest data cleared');
    } catch {
      logger.error('Failed to clear guest data:', error);
    }
  }

  /**
   * Get guest data summary for display
   */
  getGuestDataSummary(): { 
    likesCount: number; 
    bookmarksCount: number; 
    playsCount: number; 
    ratingsCount: number;
    totalInteractions: number;
  } {
    return {
      likesCount: this.guestData.likes.length,
      bookmarksCount: this.guestData.bookmarks.length,
      playsCount: this.guestData.playHistory.length,
      ratingsCount: this.guestData.ratings.length,
      totalInteractions: 
        this.guestData.likes.length + 
        this.guestData.bookmarks.length + 
        this.guestData.playHistory.length + 
        this.guestData.ratings.length,
    };
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();