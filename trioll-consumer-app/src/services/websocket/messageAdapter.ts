/**
 * WebSocket Message Adapter
 * Converts between existing WebSocket message format and standardized format
 * Maintains backward compatibility while fixing TypeScript errors
 */

import { 
  StandardWebSocketMessage, 
  WebSocketMessageType,
  createStandardWebSocketMessage,
  isStandardWebSocketMessage,
  WebSocketErrorMessage
} from '../../types/websocket.types';
import { 
  WebSocketMessage, 
  IncomingMessage,
  NotificationData,
  FriendActivityData,
  GameStateData 
} from './types';

/**
 * Convert legacy WebSocket message to standardized format
 */
export function adaptToStandardMessage(
  message: WebSocketMessage | IncomingMessage | any
): StandardWebSocketMessage {
  // If already in standard format, return as-is
  if (isStandardWebSocketMessage(message)) {
    return message;
  }

  // Handle different message formats
  if ('action' in message) {
    return adaptActionMessage(message);
  }
  
  if ('type' in message) {
    return adaptTypeMessage(message);
  }

  // Default conversion for unknown format
  return createStandardWebSocketMessage(
    WebSocketMessageType.SYSTEM_UPDATE,
    message,
    'default',
    { correlationId: message.id || message.messageId }
  );
}

/**
 * Convert action-based messages (existing format)
 */
function adaptActionMessage(message: IncomingMessage): StandardWebSocketMessage {
  const timestamp = new Date().toISOString();
  
  switch (message.action) {
    case 'notification':
      const notification = (message as any).notification as NotificationData;
      return createStandardWebSocketMessage(
        WebSocketMessageType.NOTIFICATION,
        {
          notificationId: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.metadata?.gameId ? `/games/${notification.metadata.gameId}` : undefined
        },
        'notifications',
        { userId: notification.metadata?.userId }
      );

    case 'friendActivity':
      const activity = (message as any).activity as FriendActivityData;
      return createStandardWebSocketMessage(
        WebSocketMessageType.FRIEND_ACTIVITY,
        {
          friendId: activity.userId,
          activityType: activity.type,
          details: activity.details
        },
        'friends',
        { userId: activity.userId }
      );

    case 'gameStateUpdate':
      const gameUpdate = message as any;
      return createStandardWebSocketMessage(
        WebSocketMessageType.GAME_STATE,
        gameUpdate.state,
        `game:${gameUpdate.gameId}`,
        { userId: gameUpdate.fromUserId }
      );

    case 'userTyping':
      const typing = message as any;
      return createStandardWebSocketMessage(
        WebSocketMessageType.USER_TYPING,
        {
          conversationId: typing.conversationId,
          userId: typing.userId,
          isTyping: typing.isTyping
        },
        `conversation:${typing.conversationId}`
      );

    case 'error':
      const error = message as any;
      return createStandardWebSocketMessage(
        WebSocketMessageType.ERROR,
        {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          retryable: false
        } as WebSocketErrorMessage,
        'system'
      );

    case 'subscribed':
      const subscribed = message as any;
      return createStandardWebSocketMessage(
        WebSocketMessageType.SUBSCRIBED,
        { channels: subscribed.channels },
        'system'
      );

    case 'ping':
      return createStandardWebSocketMessage(
        WebSocketMessageType.PING,
        {},
        'system'
      );

    case 'pong':
      return createStandardWebSocketMessage(
        WebSocketMessageType.PONG,
        {},
        'system'
      );

    default:
      // Unknown action - preserve original
      return createStandardWebSocketMessage(
        WebSocketMessageType.SYSTEM_UPDATE,
        message,
        'unknown'
      );
  }
}

/**
 * Convert type-based messages (alternative existing format)
 */
function adaptTypeMessage(message: any): StandardWebSocketMessage {
  const typeMap: Record<string, WebSocketMessageType> = {
    'notification': WebSocketMessageType.NOTIFICATION,
    'game_update': WebSocketMessageType.GAME_UPDATE,
    'user_update': WebSocketMessageType.USER_UPDATE,
    'friend_activity': WebSocketMessageType.FRIEND_ACTIVITY,
    'subscribe': WebSocketMessageType.SUBSCRIBE,
    'unsubscribe': WebSocketMessageType.UNSUBSCRIBE,
    'error': WebSocketMessageType.ERROR
  };

  const standardType = typeMap[message.type] || WebSocketMessageType.SYSTEM_UPDATE;
  const channel = message.channel || extractChannelFromType(message.type) || 'default';

  return createStandardWebSocketMessage(
    standardType,
    message.payload || message.data || message,
    channel,
    {
      correlationId: message.id,
      userId: message.userId,
      sessionId: message.sessionId
    }
  );
}

/**
 * Convert standardized message back to legacy format for backward compatibility
 */
export function adaptFromStandardMessage(
  message: StandardWebSocketMessage
): WebSocketMessage {
  // Map standard types back to actions
  const actionMap: Partial<Record<WebSocketMessageType, string>> = {
    [WebSocketMessageType.NOTIFICATION]: 'notification',
    [WebSocketMessageType.FRIEND_ACTIVITY]: 'friendActivity',
    [WebSocketMessageType.GAME_STATE]: 'gameStateUpdate',
    [WebSocketMessageType.USER_TYPING]: 'userTyping',
    [WebSocketMessageType.ERROR]: 'error',
    [WebSocketMessageType.SUBSCRIBED]: 'subscribed',
    [WebSocketMessageType.PING]: 'ping',
    [WebSocketMessageType.PONG]: 'pong'
  };

  const action = actionMap[message.type] || message.type;

  return {
    action,
    data: {
      ...message.data,
      channel: message.channel,
      timestamp: message.timestamp,
      messageId: message.id
    }
  };
}

/**
 * Extract channel from message type
 */
function extractChannelFromType(type: string): string | null {
  if (type.includes(':')) {
    return type.split(':')[0];
  }
  
  const channelMap: Record<string, string> = {
    'notification': 'notifications',
    'friend': 'friends',
    'game': 'games',
    'user': 'users',
    'system': 'system'
  };

  for (const [prefix, channel] of Object.entries(channelMap)) {
    if (type.toLowerCase().includes(prefix)) {
      return channel;
    }
  }

  return null;
}

/**
 * Batch convert multiple messages
 */
export function batchAdaptMessages(
  messages: Array<WebSocketMessage | IncomingMessage | any>
): StandardWebSocketMessage[] {
  return messages.map(adaptToStandardMessage);
}

/**
 * Create a typed message handler
 */
export function createTypedMessageHandler<T extends WebSocketMessageType>(
  type: T,
  handler: (message: StandardWebSocketMessage) => void
): (rawMessage: any) => void {
  return (rawMessage: any) => {
    const standardMessage = adaptToStandardMessage(rawMessage);
    if (standardMessage.type === type) {
      handler(standardMessage);
    }
  };
}