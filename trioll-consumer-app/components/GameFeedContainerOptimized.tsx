import type { Game } from './../src/types/api.types';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { useApp } from '../context/AppContext';
import { dummyGames } from '../data/dummyGames';
import { CardSwipeStackOptimized } from './CardSwipeStackOptimized';
import { CardSwipeStack } from './CardSwipeStack'; // Fallback
import { CardSwipeStackErrorBoundary } from './CardSwipeStackErrorBoundary';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('GameFeedContainerOptimized');

interface GameFeedContainerOptimizedProps {
  onPlayTrial: (game: Game) => void;
  disabled?: boolean;
  onGameChange?: (game: Game | null) => void;
  onShareError?: (error: Error) => void;
}

export const GameFeedContainerOptimized = React.memo<GameFeedContainerOptimizedProps>(({
  onPlayTrial,
  disabled = false,
  onGameChange,
  onShareError,
}) => {
  const { games, setGames, likes, bookmarks, toggleLike, toggleBookmark } = useApp();
  const [currentDisplayedGame, setCurrentDisplayedGame] = useState<Game | null>(null);

  // Initialize games only once
  useEffect(() => {
    if (games.length === 0) {
      setGames(dummyGames);
    }
  }, []); // Remove dependency on games.length to prevent re-runs

  // Memoize callbacks to prevent re-renders
  const handleGameChange = useCallback((game: Game) => {
    setCurrentDisplayedGame(game);
    if (onGameChange) {
      onGameChange(game);
    }
  }, [onGameChange]);

  const handleLike = useCallback((game: Game) => {
    toggleLike(game.id);
  }, [toggleLike]);

  const handleBookmark = useCallback((game: Game) => {
    toggleBookmark(game.id);
  }, [toggleBookmark]);

  const handleShare = useCallback(async (game: Game) => {
    try {
      await Share.share({
        message: `Check out ${game.title} on TRIOLL! 🎮\n\nPlay this amazing game now: https://trioll.com/game/${game.id}`,
        title: game.title,
        url: `https://trioll.com/game/${game.id}`, // iOS only
      });
      
      logger.debug('Shared game:', game.title);
    } catch {
      if (error instanceof Error && error.message !== 'User did not share') {
        logger.error('Share error:', error);
        if (onShareError) {
          onShareError(error);
        }
      }
    }
  }, [onShareError]);

  // Memoize the games array to prevent unnecessary re-renders
  const memoizedGames = useMemo(() => games, [games]);

  if (memoizedGames.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  // Use optimized version by default, fallback if there's an issue
  const useOptimized = true; // Can be made conditional based on device performance

  return (
    <View style={styles.container}>
      <CardSwipeStackErrorBoundary>
        {useOptimized ? (
          <CardSwipeStackOptimized
            games={memoizedGames}
            onPlayTrial={onPlayTrial}
            onGameChange={handleGameChange}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
            likes={likes}
            bookmarks={bookmarks}
            disabled={disabled}
          />
        ) : (
          <CardSwipeStack
            games={memoizedGames}
            onPlayTrial={onPlayTrial}
            onGameChange={handleGameChange}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
            likes={likes}
            bookmarks={bookmarks}
            disabled={disabled}
          />
        )}
      </CardSwipeStackErrorBoundary>
    </View>
  );
});

GameFeedContainerOptimized.displayName = 'GameFeedContainerOptimized';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});