
/**
 * Game Actions Hook
 * Handles user interactions with games (like, bookmark, play, rate)
 * Integrates with existing analytics and offline capabilities
 */

import { useState, useCallback } from 'react';
import TriollAPI from '../services/api/TriollAPI';
import { performanceMonitor } from '../services/monitoring/performanceMonitor';
import { crashReporter } from '../services/monitoring/crashReporterStub';
import { analyticsService } from '../services/monitoring/analyticsEnhanced';

// Queue for offline actions (to sync later)
const offlineQueue: unknown[] = [];

export const useGameActions = () => {
  const [loading, setLoading] = useState(false);

  const likeGame = useCallback(async (gameId: string, isLiked: boolean = false) => {
    const operation = performanceMonitor.startOperation('likeGame');

    try {
      setLoading(true);

      if (isLiked) {
        await TriollAPI.unlikeGame(gameId);
      } else {
        await TriollAPI.likeGame(gameId);
      }

      // Track analytics event with enhanced analytics service
      await analyticsService.track('game_liked', {
        gameId,
        action: isLiked ? 'unlike' : 'like',
        timestamp: Date.now(),
      });

      // Also track with API for backend consistency
      await TriollAPI.trackEvent('game_liked', {
        gameId,
        action: isLiked ? 'unlike' : 'like',
      });

      performanceMonitor.endOperation(operation);
      return true;
    } catch (_error) {
      performanceMonitor.endOperation(operation, false);
      // Like action offline, queuing for later sync

      // Queue for offline sync
      offlineQueue.push({
        action: 'like',
        gameId,
        isLiked: !isLiked,
        timestamp: Date.now(),
      });

      // Still return true to update UI optimistically
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const bookmarkGame = useCallback(async (gameId: string, isBookmarked: boolean = false) => {
    const operation = performanceMonitor.startOperation('bookmarkGame');

    try {
      setLoading(true);

      // Using like endpoint as bookmark for now
      if (isBookmarked) {
        await TriollAPI.unlikeGame(gameId);
      } else {
        await TriollAPI.bookmarkGame(gameId);
      }

      await TriollAPI.trackEvent('game_bookmarked', {
        gameId,
        action: isBookmarked ? 'unbookmark' : 'bookmark',
      });

      performanceMonitor.endOperation(operation);
      return true;
    } catch (_error) {
      performanceMonitor.endOperation(operation, false);
      // Bookmark action offline, queuing for later sync

      offlineQueue.push({
        action: 'bookmark',
        gameId,
        isBookmarked: !isBookmarked,
        timestamp: Date.now(),
      });

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const playGame = useCallback(async (gameId: string) => {
    const operation = performanceMonitor.startOperation('playGame');

    try {
      setLoading(true);

      const sessionId = 'session-' + Date.now();
      await TriollAPI.playGame(gameId, sessionId, 0);
      await TriollAPI.trackEvent('game_played', { gameId, sessionId });

      performanceMonitor.endOperation(operation);
      return true;
    } catch (_error) {
      performanceMonitor.endOperation(operation, false);
      // Play tracking offline, queuing for later sync

      offlineQueue.push({
        action: 'play',
        gameId,
        timestamp: Date.now(),
      });

      // Don't prevent game from playing
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const rateGame = useCallback(async (gameId: string, rating: number) => {
    const operation = performanceMonitor.startOperation('rateGame');

    try {
      setLoading(true);

      await TriollAPI.rateGame(gameId, rating);

      // Track analytics event with enhanced analytics service
      await analyticsService.track('game_rated', {
        gameId,
        rating,
        timestamp: Date.now(),
      });

      // Also track with API for backend consistency
      await TriollAPI.trackEvent('game_rated', { gameId, rating });

      performanceMonitor.endOperation(operation);
      return true;
    } catch (_error) {
      performanceMonitor.endOperation(operation, false);
      // Rating offline, queuing for later sync

      offlineQueue.push({
        action: 'rate',
        gameId,
        rating,
        timestamp: Date.now(),
      });

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync offline actions when connection is restored
  const syncOfflineActions = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    // Syncing offline actions...
    const actionsToSync = [...offlineQueue];
    offlineQueue.length = 0; // Clear queue

    for (let i = 0; i < actionsToSync.length; i++) {
        const action = actionsToSync[i];
      try {
        switch (action.action) {
          case 'like':
            if (action.isLiked) {
              await TriollAPI.likeGame(action.gameId);
             } else {
              await TriollAPI.unlikeGame(action.gameId);
            }
            break;
          case 'bookmark':
            if (action.isBookmarked) {
              await TriollAPI.bookmarkGame(action.gameId);
            } else {
              await TriollAPI.unlikeGame(action.gameId);
            }
            break;
          case 'play':
            await TriollAPI.playGame(action.gameId);
            break;
          case 'rate':
            await TriollAPI.rateGame(action.gameId, action.rating);
            break;
        }
      } catch (_error) {
        // Re-queue failed actions
        offlineQueue.push(action);
        crashReporter.logError('Failed to sync offline action', error as Error);
      }
    }
  }, []);

  return {
    likeGame,
    bookmarkGame,
    playGame,
    rateGame,
    syncOfflineActions,
    loading,
    offlineQueueSize: offlineQueue.length,
  };
};
