
/**
 * React Hook for WebSocket Integration
 * Provides easy access to real-time features in components
 */

import { useEffect, useCallback, useState } from 'react';
import { webSocketService, WebSocketEvents } from '../src/services/websocket/WebSocketService';
import type {
  NotificationData,
  FriendActivityData,
  GameStateData,
} from '../src/services/websocket/types';
import { useAuth } from '../context/AuthContext';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  channels?: string[];
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
}

interface Notification {
  id: string;
  type: 'friend_request' | 'game_invite' | 'achievement' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  data?: Record<string, unknown>;
}

interface FriendActivity {
  id: string;
  userId: string;
  username: string;
  type: 'playing' | 'achievement' | 'friend_added' | 'level_up';
  gameId?: string;
  gameName?: string;
  achievement?: string;
  level?: number;
  timestamp: string;
}

interface GameState {
  score?: number;
  level?: number;
  progress?: number;
  status?: 'playing' | 'paused' | 'completed';
  achievements?: string[];
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, channels = [] } = options;
  const { isAuthenticated, userId } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  });

  // Update state when connection status changes
  const updateState = useCallback(() => {
    const status = webSocketService.getStatus();
    setState(status);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    await webSocketService.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Send notification
  const sendNotification = useCallback(
    (targetUserId: string, notification: Omit<Notification, 'id' | 'timestamp'>) => {
      webSocketService.sendNotification(targetUserId, notification as NotificationData);
    },
    []
  );

  // Broadcast activity
  const broadcastActivity = useCallback((activity: Omit<FriendActivity, 'id' | 'timestamp'>) => {
    webSocketService.broadcastActivity(activity as FriendActivityData);
  }, []);

  // Update game state
  const updateGameState = useCallback((gameId: string, state: GameState) => {
    webSocketService.updateGameState(gameId, state as GameStateData);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    webSocketService.sendTypingIndicator(conversationId, isTyping);
  }, []);

  // Subscribe to channels
  const subscribe = useCallback((newChannels: string[]) => {
    webSocketService.subscribe(newChannels);
  }, []);

  // Unsubscribe from channels
  const unsubscribe = useCallback((channelsToRemove: string[]) => {
    webSocketService.unsubscribe(channelsToRemove);
  }, []);

  // Add event listener
  const on = useCallback(
    <K extends keyof WebSocketEvents>(event: K, handler: (data: WebSocketEvents[K]) => void) => {
      webSocketService.on(event, handler);
      return () => {
        webSocketService.off(event, handler);
      };
    },
    []
  );

  // Setup WebSocket connection and listeners
  useEffect(() => {
    // Update state on connection events
    const handleConnected = () => updateState();
    const handleDisconnected = () => updateState();
    const handleError = () => updateState();

    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('error', handleError);

    // Auto-connect if enabled and user is authenticated (not guest)
    if (autoConnect && isAuthenticated && !userId?.startsWith('guest_')) {
      connect();
    }

    // Subscribe to initial channels
    if (channels.length > 0) {
      subscribe(channels);
    }

    // Cleanup
    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('error', handleError);

      if (channels.length > 0) {
        unsubscribe(channels);
      }
    };
  }, [
    autoConnect,
    isAuthenticated,
    userId,
    channels,
    connect,
    subscribe,
    unsubscribe,
    updateState,
  ]);

  return {
    // State
    ...state,

    // Methods
    connect,
    disconnect,
    sendNotification,
    broadcastActivity,
    updateGameState,
    sendTypingIndicator,
    subscribe,
    unsubscribe,
    on,

    // Direct service access if needed
    service: webSocketService,
  };
};

// Hook for listening to specific WebSocket events
export const useWebSocketEvent = <K extends keyof WebSocketEvents>(
  event: K,
  handler: (data: WebSocketEvents[K]) => void,
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    const unsubscribe = webSocketService.on(event, handler);
    return unsubscribe;
  }, deps);
};

// Hook for real-time notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useWebSocketEvent('notification', notification => {
    setNotifications(prev => [notification as Notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  });

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
};

// Hook for friend activity feed
export const useFriendActivity = () => {
  const [activities, setActivities] = useState<FriendActivity[]>([]);

  useWebSocketEvent('friendActivity', activity => {
    setActivities(prev => [activity as FriendActivity, ...prev].slice(0, 50)); // Keep last 50 activities
  });

  return activities;
};

// Hook for typing indicators
export const useTypingIndicator = (conversationId: string) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useWebSocketEvent('userTyping', data => {
    if (data.conversationId === conversationId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    }
  });

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      webSocketService.sendTypingIndicator(conversationId, isTyping);
    },
    [conversationId]
  );

  return {
    typingUsers: Array.prototype.slice.call(typingUsers),
    sendTyping,
  };
};
