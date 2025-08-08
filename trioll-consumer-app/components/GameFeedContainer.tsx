import type { Game } from './../src/types/api.types';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { useApp } from '../context/AppContext';
import { dummyGames } from '../data/dummyGames';
import { CardSwipeStack } from './CardSwipeStack';
import { CardSwipeStackErrorBoundary } from './CardSwipeStackErrorBoundary';
import { CommentModal } from './CommentModal';
import { getLogger } from '../src/utils/logger';
import { useGameRealtimeUpdates } from '../hooks/useGameRealtimeUpdates';
import { safeAuthService } from '../src/services/auth/safeAuthService';

const logger = getLogger('GameFeedContainer');

interface GameFeedContainerProps {
  onPlayTrial: (game: Game) => void;
  disabled?: boolean;
  onGameChange?: (game: Game | null) => void;
  onShareError?: (error: Error) => void;
}

export const GameFeedContainer = React.memo<GameFeedContainerProps>(({
  onPlayTrial,
  disabled = false,
  onGameChange,
  onShareError,
}) => {
  const { games, setGames, likes, bookmarks, toggleLike, toggleBookmark, isGuest, addComment, rateGameAsGuest, currentUser } = useApp();
  const [currentDisplayedGame, setCurrentDisplayedGame] = useState<Game | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedGameForComment, setSelectedGameForComment] = useState<Game | null>(null);
  const [gameInteractions, setGameInteractions] = useState<Map<string, { likeCount: number; rating: number; ratingCount: number }>>(new Map());
  // Remove local currentUserId state - we'll use currentUser from AppContext instead

  // Initialize games from API or dummy data
  useEffect(() => {
    if (games.length === 0) {
      // Always use dummy games which should contain all S3 bucket games
      setGames(dummyGames);
    }
  }, []); // Empty deps to run only once

  // No need to get current user ID - we use currentUser from AppContext

  // Initialize game interactions from game data
  useEffect(() => {
    const interactions = new Map();
    games.forEach(game => {
      interactions.set(game.id, {
        likeCount: game.likeCount || game.likesCount || 0,
        rating: game.averageRating || game.rating || 0,
        ratingCount: game.ratingCount || 0,
        commentCount: game.commentCount || 0
      });
    });
    setGameInteractions(interactions);
  }, [games]);

  // Handle real-time game updates via WebSocket
  const handleRealtimeGamesUpdate = useCallback((updatedGames: Game[]) => {
    // Update the games in the app context
    setGames(updatedGames);
    
    // Update local interaction state
    const interactions = new Map();
    updatedGames.forEach(game => {
      interactions.set(game.id, {
        likeCount: game.likeCount || game.likesCount || 0,
        rating: game.averageRating || game.rating || 0,
        ratingCount: game.ratingCount || 0,
        commentCount: game.commentCount || 0
      });
    });
    setGameInteractions(interactions);
    
    logger.info('Games updated via WebSocket');
  }, [setGames]);

  // Subscribe to real-time updates
  const { isConnected } = useGameRealtimeUpdates({
    games,
    onGamesUpdate: handleRealtimeGamesUpdate
  });

  // Memoized callbacks to prevent re-renders
  const handleGameChange = useCallback((game: Game) => {
    setCurrentDisplayedGame(game);
    if (onGameChange) {
      onGameChange(game);
    }
  }, [onGameChange]);

  const handleLike = useCallback(async (game: Game) => {
    toggleLike(game.id);
    
    // Update local like count
    setGameInteractions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(game.id) || { likeCount: 0, rating: 0, ratingCount: 0 };
      const isNowLiked = !likes.has(game.id);
      newMap.set(game.id, {
        ...current,
        likeCount: isNowLiked ? current.likeCount + 1 : Math.max(0, current.likeCount - 1)
      });
      return newMap;
    });

    // Call API to persist like
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      if (!likes.has(game.id)) {
        await api.likeGame(game.id);
      } else {
        await api.unlikeGame(game.id);
      }
    } catch (error) {
      console.error('Failed to update like:', error);
    }
  }, [toggleLike, likes]);

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
    } catch (error) {
      if (error instanceof Error && error.message !== 'User did not share') {
        logger.error('Share error:', error);
        if (onShareError) {
          onShareError(error);
        }
      }
    }
  }, [onShareError]);

  const handleComment = useCallback((game: Game) => {
    setSelectedGameForComment(game);
    setShowCommentModal(true);
  }, []);

  const handleSubmitComment = useCallback(async (gameId: string, comment: string) => {
    try {
      // Use addComment from AppContext which includes user data
      addComment(gameId, comment);
      
      // Also call API for persistence
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      await api.addGameComment(gameId, comment);
      
      // Update local comment count
      setGameInteractions(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(gameId) || { likeCount: 0, rating: 0, ratingCount: 0 };
        newMap.set(gameId, {
          ...current,
          commentCount: (current.commentCount || 0) + 1
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to submit comment:', error);
      throw error; // Re-throw to let CommentModal handle the error
    }
  }, [addComment]);

  const handleRate = useCallback(async (game: Game, rating: number) => {
    // Use rateGameAsGuest from AppContext which handles both guest and authenticated users
    await rateGameAsGuest(game.id, rating);
    
    // Update local rating
    setGameInteractions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(game.id) || { likeCount: 0, rating: 0, ratingCount: 0 };
      
      // Calculate new average rating
      const totalRating = (current.rating * current.ratingCount) + rating;
      const newRatingCount = current.ratingCount + 1;
      const newAvgRating = totalRating / newRatingCount;
      
      newMap.set(game.id, {
        ...current,
        rating: newAvgRating,
        ratingCount: newRatingCount
      });
      return newMap;
    });

    // Call API to persist rating
    try {
      const TriollAPIModule = await import('../src/services/api/TriollAPI');
      const api = TriollAPIModule.default;
      await api.rateGame(game.id, rating);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  }, [rateGameAsGuest]);

  if (games.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  // Create enhanced games with updated interaction data - memoized to prevent infinite loops
  const enhancedGames = useMemo(() => {
    return games.map(game => {
      const interactions = gameInteractions.get(game.id) || { likeCount: 0, rating: 0, ratingCount: 0, commentCount: 0 };
      return {
        ...game,
        likesCount: interactions.likeCount,
        averageRating: interactions.rating,
        ratingCount: interactions.ratingCount,
        commentCount: interactions.commentCount
      };
    });
  }, [games, gameInteractions]);

  return (
    <View style={styles.container}>
      <CardSwipeStackErrorBoundary>
        <CardSwipeStack
          games={enhancedGames} // Pass enhanced games with updated counts
          onPlayTrial={onPlayTrial}
          onGameChange={handleGameChange}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onShare={handleShare}
          onComment={handleComment}
          onRate={handleRate}
          likes={likes}
          bookmarks={bookmarks}
          disabled={disabled}
        />
      </CardSwipeStackErrorBoundary>
      
      {/* Comment Modal */}
      {showCommentModal && selectedGameForComment && (
        <CommentModal
          game={selectedGameForComment}
          visible={showCommentModal}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedGameForComment(null);
          }}
          onSubmit={handleSubmitComment}
          currentUserId={currentUser?.id || currentUser?.username}
          isGuest={isGuest}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
