/**
 * Standardized WebSocket Types
 * Builds on existing WebSocket infrastructure to provide consistent message format
 */

// WebSocket Message Types Enum
export enum WebSocketMessageType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  
  // Subscription events
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SUBSCRIBED = 'subscribed',
  
  // Game events
  GAME_UPDATE = 'game:update',
  GAME_PLAY = 'game:play',
  GAME_END = 'game:end',
  GAME_STATE = 'game:state',
  
  // User events
  USER_UPDATE = 'user:update',
  USER_ACHIEVEMENT = 'user:achievement',
  USER_STATUS = 'user:status',
  USER_TYPING = 'user:typing',
  
  // Friend events
  FRIEND_ACTIVITY = 'friend:activity',
  FRIEND_REQUEST = 'friend:request',
  FRIEND_ONLINE = 'friend:online',
  FRIEND_OFFLINE = 'friend:offline',
  
  // Notification events
  NOTIFICATION = 'notification',
  
  // Queue events
  QUEUE_STATUS = 'queue:status',
  QUEUE_UPDATE = 'queue:update',
  QUEUE_COMPLETE = 'queue:complete',
  
  // System events
  SYSTEM_ALERT = 'system:alert',
  SYSTEM_MAINTENANCE = 'system:maintenance',
  SYSTEM_UPDATE = 'system:update'
}

// Standardized WebSocket Message Format
export interface StandardWebSocketMessage<T = any> {
  id: string;
  type: WebSocketMessageType;
  channel: string;
  timestamp: string;
  data: T;
  metadata?: {
    version: string;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  };
}

// Type guard for standard messages
export function isStandardWebSocketMessage(
  data: any
): data is StandardWebSocketMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.type === 'string' &&
    typeof data.channel === 'string' &&
    typeof data.timestamp === 'string' &&
    data.data !== undefined
  );
}

// Specific message type interfaces
export interface GameUpdateMessage {
  gameId: string;
  updates: {
    playCount?: number;
    likeCount?: number;
    rating?: number;
    featured?: boolean;
  };
}

export interface GamePlayMessage {
  gameId: string;
  userId: string;
  sessionId: string;
  startTime: string;
  score?: number;
}

export interface UserAchievementMessage {
  userId: string;
  achievementId: string;
  achievementName: string;
  unlockedAt: string;
  xpReward?: number;
}

export interface FriendActivityMessage {
  friendId: string;
  activityType: 'game_started' | 'game_completed' | 'achievement_unlocked' | 'status_changed';
  details: {
    gameId?: string;
    gameTitle?: string;
    score?: number;
    achievementId?: string;
    status?: string;
  };
}

export interface NotificationMessage {
  notificationId: string;
  type: 'friend_request' | 'game_invite' | 'achievement' | 'system';
  title: string;
  message: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface QueueStatusMessage {
  queueId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  position?: number;
  totalItems?: number;
  estimatedTimeSeconds?: number;
  progress?: number;
  error?: {
    code: string;
    message: string;
  };
}

// Union type for all message data types
export type WebSocketMessageData = 
  | GameUpdateMessage
  | GamePlayMessage
  | UserAchievementMessage
  | FriendActivityMessage
  | NotificationMessage
  | QueueStatusMessage
  | Record<string, any>; // For custom/unknown messages

// Standardized error message
export interface WebSocketErrorMessage {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable?: boolean;
}

// Connection state
export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  messageTimeout?: number;
  enableCompression?: boolean;
}

// Event payload types for typed event emitter
export interface StandardWebSocketEventPayloads {
  // Connection events
  [WebSocketMessageType.CONNECT]: void;
  [WebSocketMessageType.DISCONNECT]: { reason?: string };
  [WebSocketMessageType.ERROR]: WebSocketErrorMessage;
  
  // Message events
  [WebSocketMessageType.GAME_UPDATE]: StandardWebSocketMessage<GameUpdateMessage>;
  [WebSocketMessageType.USER_ACHIEVEMENT]: StandardWebSocketMessage<UserAchievementMessage>;
  [WebSocketMessageType.FRIEND_ACTIVITY]: StandardWebSocketMessage<FriendActivityMessage>;
  [WebSocketMessageType.NOTIFICATION]: StandardWebSocketMessage<NotificationMessage>;
  [WebSocketMessageType.QUEUE_STATUS]: StandardWebSocketMessage<QueueStatusMessage>;
  
  // Generic message event
  message: StandardWebSocketMessage;
}

// Helper to create standard messages
export function createStandardWebSocketMessage<T>(
  type: WebSocketMessageType,
  data: T,
  channel: string = 'default',
  metadata?: Partial<StandardWebSocketMessage['metadata']>
): StandardWebSocketMessage<T> {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    channel,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      version: '1.0',
      ...metadata
    }
  };
}