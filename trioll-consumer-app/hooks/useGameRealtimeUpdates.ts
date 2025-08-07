import { useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../src/contexts/WebSocketContext';
import { StandardWebSocketMessage, GameUpdateMessage } from '../src/types/websocket.types';
import { Game } from '../types';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('useGameRealtimeUpdates');

interface UseGameRealtimeUpdatesProps {
  games: Game[];
  onGamesUpdate: (updatedGames: Game[]) => void;
}

/**
 * Hook to handle real-time game count updates via WebSocket
 * Subscribes to game update events and updates the local game state
 */
export const useGameRealtimeUpdates = ({ games, onGamesUpdate }: UseGameRealtimeUpdatesProps) => {
  const { isConnected, subscribeToGame } = useWebSocketContext();

  const handleGameUpdate = useCallback((message: StandardWebSocketMessage<GameUpdateMessage>) => {
    try {
      const { gameId, updates } = message.data;
      
      // Find and update the game in the list
      const updatedGames = games.map(game => {
        if (game.id === gameId) {
          return {
            ...game,
            playCount: updates.playCount ?? game.playCount,
            likesCount: updates.likeCount ?? game.likesCount,
            rating: updates.rating ?? game.rating,
            featured: updates.featured ?? game.featured,
          };
        }
        return game;
      });

      onGamesUpdate(updatedGames);
      logger.debug('Game updated via WebSocket:', { gameId, updates });
    } catch (error) {
      logger.error('Error handling game update:', error);
    }
  }, [games, onGamesUpdate]);

  useEffect(() => {
    if (!isConnected || games.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to updates for each game
    games.forEach(game => {
      const unsubscribe = subscribeToGame(game.id, handleGameUpdate);
      unsubscribers.push(unsubscribe);
    });

    logger.info(`Subscribed to real-time updates for ${games.length} games`);

    // Cleanup subscriptions on unmount or when games change
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      logger.info('Unsubscribed from game real-time updates');
    };
  }, [isConnected, games, subscribeToGame, handleGameUpdate]);

  return { isConnected };
};