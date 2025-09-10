import type { Game } from './../src/types/api.types';
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useHaptics } from './useHaptics';
import { safeAPI } from '../src/services/api/SafeTriollAPI';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('useGameActions');

export const useGameActions = () => {
  const {
    toggleLike,
    toggleBookmark,
    likes,
    bookmarks,
    rateGameAsGuest,
    guestRatings,
    recordTrialPlay,
  } = useApp();
  const haptics = useHaptics();

  const handleLike = useCallback(
    (game: Game) => {
      toggleLike(game.id);
      haptics.trigger('light');
    },
    [toggleLike, haptics]
  );

  const handleBookmark = useCallback(
    async (game: Game) => {
      await toggleBookmark(game.id);
      haptics.trigger('success');
    },
    [toggleBookmark, haptics]
  );

  const handleRate = useCallback(
    async (game: Game, rating: number) => {
      await rateGameAsGuest(game.id, rating);
      haptics.trigger('success');
    },
    [rateGameAsGuest, haptics]
  );

  const isLiked = useCallback(
    (gameId: string) => {
      return likes.has(gameId);
    },
    [likes]
  );

  const isBookmarked = useCallback(
    (gameId: string) => {
      return bookmarks.has(gameId);
    },
    [bookmarks]
  );

  const getRating = useCallback(
    (gameId: string) => {
      const rating = guestRatings.find(r => r.gameId === gameId);
      return rating ? rating.rating : 0;
    },
    [guestRatings]
  );

  const playGame = useCallback(
    async (gameId: string, sessionId?: string, duration?: number) => {
      try {
        // Track via API
        const result = await safeAPI.playGame(gameId, sessionId, duration);

        // Also record for guest tracking if needed
        if (duration && duration > 0) {
          await recordTrialPlay(gameId, duration, true);
        }

        return result;
      } catch (error) {
        logger.error('Error tracking game play:', error);
        throw error;
      }
    },
    [recordTrialPlay]
  );

  // API-connected like/unlike methods
  const likeGame = useCallback(async (gameId: string, wasLiked: boolean) => {
    try {
      if (wasLiked) {
        // If it was liked, we need to unlike it
        return await safeAPI.unlikeGame(gameId);
      } else {
        // If it wasn't liked, we need to like it
        return await safeAPI.likeGame(gameId);
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
      throw error;
    }
  }, []);

  // API-connected bookmark method
  const bookmarkGame = useCallback(async (gameId: string, isBookmarked: boolean) => {
    try {
      if (isBookmarked) {
        // If already bookmarked, unbookmark it
        return await safeAPI.unbookmarkGame(gameId);
      } else {
        // If not bookmarked, bookmark it
        return await safeAPI.bookmarkGame(gameId);
      }
    } catch (error) {
      logger.error('Error toggling bookmark:', error);
      throw error;
    }
  }, []);

  return {
    handleLike,
    handleBookmark,
    handleRate,
    isLiked,
    isBookmarked,
    getRating,
    playGame,

    // API methods
    likeGame,
    bookmarkGame,
  };
};
