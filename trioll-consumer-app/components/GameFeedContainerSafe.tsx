import type { Game } from './../src/types/api.types';
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { dummyGames } from '../data/dummyGames';
import { CardSwipeStackSafe } from './CardSwipeStackSafe';
import { CardSwipeStackErrorBoundary } from './CardSwipeStackErrorBoundary';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('GameFeedContainerSafe');

interface GameFeedContainerSafeProps {
  onPlayTrial: (game: Game) => void;
  disabled?: boolean;
  onGameChange?: (game: Game | null) => void;
  onShareError?: (error: Error) => void;
}

export const GameFeedContainerSafe = React.memo<GameFeedContainerSafeProps>(({
  onPlayTrial,
  disabled = false,
  onGameChange,
  onShareError,
}) => {
  const { games, setGames, likes, bookmarks, toggleLike, toggleBookmark } = useApp();
  const [currentDisplayedGame, setCurrentDisplayedGame] = useState<Game | null>(null);

  // Initialize games from API or dummy data
  useEffect(() => {
    if (games.length === 0) {
      setGames(dummyGames);
    }
  }, []); // Empty deps to run only once

  // Notify parent when game changes - memoized to prevent loops
  const handleGameChange = useCallback((game: Game) => {
    setCurrentDisplayedGame(game);
    onGameChange?.(game);
  }, [onGameChange]);

  // Memoized action handlers
  const handleLike = useCallback((game: Game) => {
    toggleLike(game.id);
  }, [toggleLike]);

  const handleBookmark = useCallback((game: Game) => {
    toggleBookmark(game.id);
  }, [toggleBookmark]);

  const handleShare = useCallback(async (game: Game) => {
    try {
      logger.debug('Sharing game:', game.title);
    } catch {
      if (onShareError && error instanceof Error) {
        onShareError(error);
      }
    }
  }, [onShareError]);

  if (games.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  return (
    <View style={styles.container}>
      <CardSwipeStackErrorBoundary>
        <CardSwipeStackSafe
          games={games}
          onPlayTrial={onPlayTrial}
          onGameChange={handleGameChange}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onShare={handleShare}
          likes={likes}
          bookmarks={bookmarks}
          disabled={disabled}
        />
      </CardSwipeStackErrorBoundary>
    </View>
  );
});

GameFeedContainerSafe.displayName = 'GameFeedContainerSafe';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});