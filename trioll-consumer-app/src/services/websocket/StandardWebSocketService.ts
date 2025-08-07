/**
 * Standard WebSocket Service
 * Enhanced WebSocket service with standardized message types
 * Builds on existing WebSocketService while providing type safety
 */

import { WebSocketService } from './WebSocketService';
import { 
  StandardWebSocketMessage,
  WebSocketMessageType,
  WebSocketConnectionState,
  WebSocketConfig,
  StandardWebSocketEventPayloads,
  createStandardWebSocketMessage,
  isStandardWebSocketMessage
} from '../../types/websocket.types';
import { 
  adaptToStandardMessage, 
  adaptFromStandardMessage,
  createTypedMessageHandler 
} from './messageAdapter';
import { getLogger } from '../../utils/logger';

const logger = getLogger('StandardWebSocketService');

export class StandardWebSocketService extends WebSocketService {
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.DISCONNECTED;
  private config: WebSocketConfig;
  private messageHandlers = new Map<WebSocketMessageType, Set<Function>>();
  private channelHandlers = new Map<string, Set<Function>>();

  constructor(config?: Partial<WebSocketConfig>) {
    super();
    
    this.config = {
      url: config?.url || 'wss://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod',
      autoReconnect: config?.autoReconnect ?? true,
      reconnectInterval: config?.reconnectInterval ?? 5000,
      maxReconnectAttempts: config?.maxReconnectAttempts ?? 10,
      pingInterval: config?.pingInterval ?? 30000,
      messageTimeout: config?.messageTimeout ?? 30000,
      enableCompression: config?.enableCompression ?? true
    };

    // Set up internal event handlers
    this.setupInternalHandlers();
  }

  /**
   * Connect with enhanced error handling and state management
   */
  async connect(url?: string): Promise<void> {
    try {
      this.connectionState = WebSocketConnectionState.CONNECTING;
      await super.connect(url || this.config.url);
    } catch (error) {
      this.connectionState = WebSocketConnectionState.ERROR;
      throw error;
    }
  }

  /**
   * Send a standardized message
   */
  sendStandardMessage<T>(
    type: WebSocketMessageType,
    data: T,
    channel?: string,
    metadata?: Partial<StandardWebSocketMessage['metadata']>
  ): void {
    const standardMessage = createStandardWebSocketMessage(
      type,
      data,
      channel || 'default',
      metadata
    );

    // Convert to legacy format for compatibility
    const legacyMessage = adaptFromStandardMessage(standardMessage);
    
    this.send(legacyMessage);
    
    logger.debug('Sent standard message:', { type, channel });
  }

  /**
   * Subscribe to a specific message type
   */
  onMessageType<T extends WebSocketMessageType>(
    type: T,
    handler: (message: StandardWebSocketMessage) => void
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Subscribe to a specific channel
   */
  subscribeToChannel(
    channel: string,
    handler?: (message: StandardWebSocketMessage) => void
  ): () => void {
    // Use parent's subscribe method for actual subscription
    super.subscribe(channel);
    
    if (handler) {
      if (!this.channelHandlers.has(channel)) {
        this.channelHandlers.set(channel, new Set());
      }
      this.channelHandlers.get(channel)!.add(handler);
    }
    
    // Send standardized subscribe message
    this.sendStandardMessage(
      WebSocketMessageType.SUBSCRIBE,
      { channels: [channel] },
      'system'
    );
    
    // Return unsubscribe function
    return () => {
      this.unsubscribeFromChannel(channel);
      if (handler) {
        this.channelHandlers.get(channel)?.delete(handler);
      }
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channel: string): void {
    super.unsubscribe(channel);
    this.channelHandlers.delete(channel);
    
    this.sendStandardMessage(
      WebSocketMessageType.UNSUBSCRIBE,
      { channels: [channel] },
      'system'
    );
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Get enhanced status including connection state
   */
  getEnhancedStatus() {
    const baseStatus = super.getStatus();
    
    return {
      ...baseStatus,
      connectionState: this.connectionState,
      config: this.config,
      activeChannels: Array.from(this.channelHandlers.keys()),
      messageHandlerCount: this.messageHandlers.size
    };
  }

  /**
   * Subscribe to specific game updates
   */
  subscribeToGame(gameId: string, handler?: (update: StandardWebSocketMessage) => void): () => void {
    return this.subscribeToChannel(`game:${gameId}`, handler);
  }

  /**
   * Subscribe to friend activity
   */
  subscribeToFriendActivity(handler: (activity: StandardWebSocketMessage) => void): () => void {
    return this.onMessageType(WebSocketMessageType.FRIEND_ACTIVITY, handler);
  }

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications(handler: (notification: StandardWebSocketMessage) => void): () => void {
    return this.onMessageType(WebSocketMessageType.NOTIFICATION, handler);
  }

  /**
   * Subscribe to queue updates
   */
  subscribeToQueueUpdates(queueId: string, handler: (update: StandardWebSocketMessage) => void): () => void {
    const channelUnsub = this.subscribeToChannel(`queue:${queueId}`);
    const typeUnsub = this.onMessageType(WebSocketMessageType.QUEUE_STATUS, (message) => {
      if (message.data.queueId === queueId) {
        handler(message);
      }
    });
    
    // Return combined unsubscribe
    return () => {
      channelUnsub();
      typeUnsub();
    };
  }

  /**
   * Set up internal event handlers
   */
  private setupInternalHandlers(): void {
    // Handle connection events
    this.onConnect(() => {
      this.connectionState = WebSocketConnectionState.CONNECTED;
      logger.info('WebSocket connected');
      
      // Start ping interval
      if (this.config.pingInterval) {
        this.startPingInterval();
      }
    });

    this.onDisconnect(() => {
      this.connectionState = WebSocketConnectionState.DISCONNECTED;
      logger.info('WebSocket disconnected');
    });

    this.onError((error) => {
      this.connectionState = WebSocketConnectionState.ERROR;
      logger.error('WebSocket error:', error);
    });

    // Handle incoming messages
    this.on('message', (rawMessage: any) => {
      try {
        const standardMessage = adaptToStandardMessage(rawMessage);
        this.handleStandardMessage(standardMessage);
      } catch (error) {
        logger.error('Failed to process WebSocket message:', error);
      }
    });
  }

  /**
   * Handle standardized messages
   */
  private handleStandardMessage(message: StandardWebSocketMessage): void {
    // Emit to type-specific handlers
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error(`Error in ${message.type} handler:`, error);
        }
      });
    }

    // Emit to channel-specific handlers
    const channelHandlers = this.channelHandlers.get(message.channel);
    if (channelHandlers) {
      channelHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error(`Error in ${message.channel} handler:`, error);
        }
      });
    }

    // Emit generic message event
    this.emit('standardMessage', message);
  }

  /**
   * Start ping interval for connection health
   */
  private pingIntervalId?: NodeJS.Timeout;
  
  private startPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }
    
    this.pingIntervalId = setInterval(() => {
      if (this.connectionState === WebSocketConnectionState.CONNECTED) {
        this.sendStandardMessage(WebSocketMessageType.PING, {}, 'system');
      }
    }, this.config.pingInterval!);
  }

  /**
   * Enhanced disconnect that cleans up intervals
   */
  disconnect(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = undefined;
    }
    
    this.messageHandlers.clear();
    this.channelHandlers.clear();
    
    super.disconnect();
  }
}

// Export singleton instance with standard configuration
export const standardWebSocketService = new StandardWebSocketService();

// Export typed event handler creator for convenience
export { createTypedMessageHandler } from './messageAdapter';