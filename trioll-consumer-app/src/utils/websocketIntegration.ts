
import { WebSocketManager } from './websocketManager';
import { analyticsService } from '../services/monitoring/analyticsEnhanced';
import { performanceMonitor } from '../services/monitoring/performanceMonitor';
import { getLogger } from '../utils/logger';

const logger = getLogger('websocketIntegration');

// Mock WebSocket initialization removed - using real WebSocket service

// Initialize WebSocketManager with default config
const wsManager = WebSocketManager.getInstance({
  url: 'wss://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
  enableOfflineQueue: true,
  debug: __DEV__
});

/**
 * WebSocket integration with existing systems
 */
export class WebSocketIntegration {
  private static instance: WebSocketIntegration;
  private initialized = false;

  private constructor() {}

  static getInstance(): WebSocketIntegration {
    if (!WebSocketIntegration.instance) {
      WebSocketIntegration.instance = new WebSocketIntegration();
    }
    return WebSocketIntegration.instance;
  }

  /**
   * Initialize WebSocket with existing app infrastructure
   */
  async initialize() : Promise<void> {
    if (this.initialized) return;

    // Initializing WebSocket integration...

    // Set up connection state monitoring
    wsManager.onConnectionStateChange(state => {
      // Track connection state changes
      analyticsService.track('websocket_state_change', {
        state,
        timestamp: Date.now(),
      });

      // Update performance metrics
      if (state === 'connected') {
        performanceMonitor.recordMetric('websocket_connected', 1);
      } else if (state === 'error' || state === 'disconnected') {
        performanceMonitor.recordMetric('websocket_disconnected', 1);
      }
    });

    // Set up error handling
    wsManager.onError(error => {
      logger.error('WebSocket error:', error);

      // Track errors
      analyticsService.track('websocket_error', {
        error: error.message,
        timestamp: Date.now(),
      });
    });

    // Connect WebSocket
    await wsManager.connect();

    this.initialized = true;
    // WebSocket integration initialized
  }

  /**
   * Subscribe to game updates and update Context
   */
  subscribeToGameUpdates(gameId: string, updateCallback: (data: unknown) => void) {
    const channel = `game:${gameId}`;

    wsManager.subscribe(channel, data => {
      if (data.event === 'stats_update') {
        // Apply field mapping to match existing data structures
        const mappedData = {
          id: gameId,
          likes: data.likes,
          plays: data.plays,
          rating: data.rating,
          comments: data.comments,
        };

        updateCallback(mappedData);
      }
    });

    // Return unsubscribe function
    return () => {
      wsManager.unsubscribe(channel);
    };
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToUserNotifications(userId: string, callback: (notification: unknown) => void) {
    const channel = `user:${userId}`;

    wsManager.subscribe(channel, data => {
      if (data.event === 'notification') {
        callback(data.notification);
      } else if (data.event === 'achievement_unlocked') {
        callback({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: `You earned "${data.achievement.name}"`,
          data: data.achievement,
        });
      }
    });

    return () => {
      wsManager.unsubscribe(channel);
    };
  }

  /**
   * Subscribe to friend activity
   */
  subscribeToFriendActivity(callback: (activity: unknown) => void) {
    wsManager.subscribe('friends:activity', data => {
      if (data.event === 'friend_activity') {
        callback(data);
      }
    });

    return () => {
      wsManager.unsubscribe('friends:activity');
    };
  }

  /**
   * Join game room for real-time updates
   */
  joinGameRoom(gameId: string) {
    wsManager.send({
      type: 'join_room',
      data: { roomId: `game:${gameId}` },
      timestamp: Date.now(),
    });
  }

  /**
   * Leave game room
   */
  leaveGameRoom(gameId: string) {
    wsManager.send({
      type: 'leave_room',
      data: { roomId: `game:${gameId}` },
      timestamp: Date.now(),
    });
  }

  /**
   * Send user action (like, rating, etc.)
   */
  sendUserAction(action: string, data: any) {
    const message = {
      type: 'user_action',
      data: {
        action,
        ...data,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    const sent = wsManager.send(message);

    if (!sent) {
      // Action queued for later delivery
    }

    return sent;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return wsManager ? wsManager.isConnected() : false;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    if (!wsManager) {
      return 'disconnected';
    }
    // Check if getState method exists, otherwise use isConnected
    if (typeof wsManager.getState === 'function') {
      return wsManager.getState();
    }
    return wsManager.isConnected() ? 'connected' : 'disconnected';
  }

  /**
   * Manual connection management
   */
  connect() {
    return wsManager.connect();
  }

  disconnect() {
    wsManager.disconnect();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    wsManager.cleanup();
    this.initialized = false;
  }
}

// Export singleton instance
export const websocketIntegration = WebSocketIntegration.getInstance();

// Helper functions for easy integration
export const wsHelpers = {
  /**
   * Send like action via WebSocket
   */
  sendLike: (gameId: string, liked: boolean) => {
    return websocketIntegration.sendUserAction('like', {
      gameId,
      liked,
    });
  },

  /**
   * Send rating action via WebSocket
   */
  sendRating: (gameId: string, rating: number) => {
    return websocketIntegration.sendUserAction('rating', {
      gameId,
      rating,
    });
  },

  /**
   * Send play event via WebSocket
   */
  sendPlayEvent: (gameId: string, duration: number) => {
    return websocketIntegration.sendUserAction('play', {
      gameId,
      duration,
    });
  },

  /**
   * Send achievement progress
   */
  sendAchievementProgress: (achievementId: string, progress: number) => {
    return websocketIntegration.sendUserAction('achievement_progress', {
      achievementId,
      progress,
    });
  },
};

// Auto-initialize in development
if (__DEV__) {
  setTimeout(() => {
    websocketIntegration.initialize().catch(console.error);
  }, 1000);
}
