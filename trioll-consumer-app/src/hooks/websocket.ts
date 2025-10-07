
/**
 * WebSocket Hooks
 * React hooks for WebSocket integration
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketManager, WebSocketState } from '../utils/websocketManager';

const wsManager = WebSocketManager.getInstance();

/**
 * Hook to manage WebSocket connection
 */
export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<WebSocketState>(wsManager.getState());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Connect on mount
    wsManager.connect();

    // Listen to state changes
    const unsubscribeState = wsManager.onConnectionStateChange(setConnectionState);
    const unsubscribeError = wsManager.onError(setError);

    return () => {
      unsubscribeState();
      unsubscribeError();
    };
  }, []);

  const connect = useCallback(() => {
    setError(null);
    return wsManager.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  const send = useCallback((message: unknown) => {
    return wsManager.send(message);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    error,
    connect,
    disconnect,
    send,
  };
}

/**
 * Hook to subscribe to WebSocket channel
 */
export function useWebSocketChannel<T = any>(
  channel: string,
  options?: {
    enabled?: boolean;
    onMessage?: (data: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const callbackRef = useRef(options?.onMessage);

  // Update callback ref
  callbackRef.current = options?.onMessage;

  useEffect(() => {
    if (!channel || options?.enabled === false) return;

    const handleMessage = (messageData: T) => {
      setData(messageData);
      setError(null);
      callbackRef.current?.(messageData);
    };

    const handleError = (err: Error) => {
      setError(err);
      options?.onError?.(err);
    };

    // Subscribe to channel
    wsManager.subscribe(channel, handleMessage);

    // Listen for errors
    const unsubscribeError = wsManager.onError(handleError);

    return () => {
      wsManager.unsubscribe(channel, handleMessage);
      unsubscribeError();
    };
  }, [channel, options?.enabled, options?.onError]);

  return { data, error };
}

/**
 * Hook for game live data
 */
export function useGameLiveData(gameId: string) {
  const [liveData, setLiveData] = useState({
    likes: 0,
    plays: 0,
    rating: 0,
    activeUsers: 0,
  });

  const { data } = useWebSocketChannel(`game:${gameId}`, {
    enabled: !!gameId,
    onMessage: data => {
      if (data.event === 'stats_update') {
        setLiveData(prev => ({
          ...prev,
          likes: data.likes ?? prev.likes,
          plays: data.plays ?? prev.plays,
          rating: data.rating ?? prev.rating,
          activeUsers: data.activeUsers ?? prev.activeUsers,
        }));
      }
    },
  });

  return { liveData, isLive: !!data };
}

/**
 * Hook for user presence
 */
export function useUserPresence(roomId: string) {
  const [users, setUsers] = useState<
    Array<{
      id: string;
      username: string;
      status: 'online' | 'playing' | 'away';
    }>
  >([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useWebSocketChannel(`presence:${roomId}`, {
    enabled: !!roomId,
    onMessage: data => {
      if (data.event === 'presence_update') {
        setUsers(data.users || []);
        setOnlineCount(data.users?.length || 0);
      } else if (data.event === 'user_joined') {
        setUsers(prev => [...prev, data.user]);
        setOnlineCount(prev => prev + 1);
      } else if (data.event === 'user_left') {
        setUsers(prev => prev.filter(u => u.id !== data.userId));
        setOnlineCount(prev => Math.max(0, prev - 1));
      }
    },
  });

  // Join presence room on mount
  useEffect(() => {
    if (!roomId) return;

    wsManager.send({
      type: 'join_presence',
      channel: `presence:${roomId}`,
      timestamp: Date.now(),
    });

    return () => {
      wsManager.send({
        type: 'leave_presence',
        channel: `presence:${roomId}`,
        timestamp: Date.now(),
      });
    };
  }, [roomId]);

  return { users, onlineCount };
}

/**
 * Hook for friend activity
 */
export function useFriendActivity() {
  const [activities, setActivities] = useState<
    Array<{
      userId: string;
      username: string;
      activity: string;
      timestamp: number;
    }>
  >([]);

  useWebSocketChannel('friends:activity', {
    onMessage: data => {
      if (data.event === 'friend_activity') {
        setActivities(prev => [data, ...prev].slice(0, 50)); // Keep last 50
      }
    },
  });

  return { activities };
}

/**
 * Hook for live leaderboard
 */
export function useLeaderboard(gameId: string, scope: 'global' | 'friends' = 'global') {
  const [leaderboard, setLeaderboard] = useState<
    Array<{
      rank: number;
      userId: string;
      username: string;
      score: number;
      avatar?: string;
    }>
  >([]);

  const channel =
    scope === 'global' ? `leaderboard:global:${gameId}` : `leaderboard:friends:${gameId}`;

  useWebSocketChannel(channel, {
    enabled: !!gameId,
    onMessage: data => {
      if (data.event === 'leaderboard_update') {
        setLeaderboard(data.leaderboard || []);
      }
    },
  });

  return { leaderboard };
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: number;
      read: boolean;
    }>
  >([]);

  useWebSocketChannel('notifications', {
    onMessage: data => {
      if (data.event === 'new_notification') {
        setNotifications(prev => [data.notification, ...prev]);
      } else if (data.event === 'notification_read') {
        setNotifications(prev =>
          prev.map(n => (n.id === data.notificationId ? { ...n, read: true } : n))
        );
      }
    },
  });

  const markAsRead = useCallback((notificationId: string) => {
    wsManager.send({
      type: 'mark_notification_read',
      data: { notificationId },
      timestamp: Date.now(),
    });
  }, []);

  return { notifications, markAsRead };
}

/**
 * Hook for achievement unlocks
 */
export function useAchievementUnlocks() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      points: number;
      unlockedAt: number;
    }>
  >([]);

  useWebSocketChannel('achievements', {
    onMessage: data => {
      if (data.event === 'achievement_unlocked') {
        setUnlockedAchievements(prev => [
          ...prev,
          {
            ...data.achievement,
            unlockedAt: data.timestamp,
          },
        ]);
      }
    },
  });

  return { unlockedAchievements };
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(channelId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useWebSocketChannel(`typing:${channelId}`, {
    enabled: !!channelId,
    onMessage: data => {
      if (data.event === 'user_typing') {
        const { userId } = data;

        // Clear existing timeout
        if (typingTimeoutRef.current[userId]) {
          clearTimeout(typingTimeoutRef.current[userId]);
        }

        // Add user to typing list
        setTypingUsers(prev => (prev.includes(userId) ? prev : [...prev, userId]));

        // Remove after 3 seconds
        typingTimeoutRef.current[userId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== userId));
          delete typingTimeoutRef.current[userId];
        }, 3000);
      }
    },
  });

  const sendTyping = useCallback(() => {
    wsManager.send({
      type: 'typing',
      channel: `typing:${channelId}`,
      timestamp: Date.now(),
    });
  }, [channelId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  return { typingUsers, sendTyping };
}
