
/**
 * Type definitions for WebSocket service
 */

// Base types for websocket messages
export interface WebSocketMessageData {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | string[]
    | WebSocketMessageData
    | WebSocketMessageData[];
}

export interface WebSocketMessage {
  action: string;
  data?: WebSocketMessageData;
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'friend_request' | 'game_invite' | 'achievement' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: string;
  metadata?: {
    userId?: string;
    gameId?: string;
    achievementId?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

// Friend activity types
export interface FriendActivityData {
  id: string;
  userId: string;
  username: string;
  type:
    | 'game_started'
    | 'game_completed'
    | 'achievement_unlocked'
    | 'friend_added'
    | 'status_update';
  timestamp: string;
  details: {
    gameId?: string;
    gameTitle?: string;
    achievementId?: string;
    achievementName?: string;
    score?: number;
    duration?: number;
    newFriendId?: string;
    newFriendUsername?: string;
    status?: string;
  };
}

// Game state types
export interface GameStateData {
  gameId: string;
  playerId: string;
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  score?: number;
  level?: number;
  health?: number;
  inventory?: Array<{
    id: string;
    quantity: number;
  }>;
  customData?: Record<string, string | number | boolean>;
}

// Subscription data
export interface SubscriptionData {
  channels: string[];
}

// Typing indicator data
export interface TypingData {
  conversationId: string;
  isTyping: boolean;
  userId?: string;
}

// Extended message types for specific actions
export interface PingMessage extends WebSocketMessage {
  action: 'ping';
  data?: Record<string, never>;
}

export interface SubscribeMessage extends WebSocketMessage {
  action: 'subscribe';
  data?: WebSocketMessageData;
}

export interface UnsubscribeMessage extends WebSocketMessage {
  action: 'unsubscribe';
  data?: WebSocketMessageData;
}

export interface NotificationMessage extends WebSocketMessage {
  action: 'sendNotification';
  data?: WebSocketMessageData;
}

export interface ActivityMessage extends WebSocketMessage {
  action: 'broadcastActivity';
  data?: WebSocketMessageData;
}

export interface GameStateMessage extends WebSocketMessage {
  action: 'updateGameState';
  data?: WebSocketMessageData;
}

export interface TypingMessage extends WebSocketMessage {
  action: 'typing';
  data?: WebSocketMessageData;
}

// Incoming message types
export interface IncomingNotification {
  action: 'notification';
  notification: NotificationData;
}

export interface IncomingFriendActivity {
  action: 'friendActivity';
  activity: FriendActivityData;
}

export interface IncomingGameStateUpdate {
  action: 'gameStateUpdate';
  gameId: string;
  state: GameStateData;
  fromUserId: string;
  timestamp: string;
}

export interface IncomingTyping {
  action: 'userTyping';
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface IncomingError {
  action: 'error';
  message: string;
  code?: string;
}

export interface IncomingSubscribed {
  action: 'subscribed';
  channels: string[];
}

// Union type for all incoming messages
export type IncomingMessage =
  | IncomingNotification
  | IncomingFriendActivity
  | IncomingGameStateUpdate
  | IncomingTyping
  | IncomingError
  | IncomingSubscribed
  | { action: 'pong' }
  | { action: string; [key: string]: unknown };

// Event payload types
export interface WebSocketEventPayloads {
  connected: void;
  disconnected: void;
  error: Error;
  reconnectFailed: void;
  subscribed: string[];
  notification: NotificationData;
  friendActivity: FriendActivityData;
  gameStateUpdate: {
    gameId: string;
    state: GameStateData;
    fromUserId: string;
    timestamp: string;
  };
  userTyping: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
  serverError: string;
  message: IncomingMessage;
}
