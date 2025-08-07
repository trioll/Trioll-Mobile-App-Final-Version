import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Network from 'expo-network';
import AsyncStorage from './storageCompat';
import { Config } from '../config/environments';
import { performanceMonitor } from '../services/monitoring/performanceMonitor';
import { analyticsService } from '../services/monitoring/analyticsEnhanced';
import { getLogger } from '../utils/logger';

const logger = getLogger('websocketManager');
// Types
export type WebSocketState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  id?: string;
  timestamp?: number;
}

export interface SubscriptionOptions {
  channel: string;
  callback: (data: unknown) => void;
  errorCallback?: (error: Error) => void;
}

interface WebSocketManagerConfig {
  url: string;
  authToken?: string | null;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  enableCompression?: boolean;
  enableOfflineQueue?: boolean;
  debug?: boolean;
}

interface QueuedMessage {
  message: WebSocketMessage;
  timestamp: number;
  retryCount: number;
}

// WebSocket Manager
export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private config: WebSocketManagerConfig;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, Set<(data: unknown) => void>>();
  private messageQueue: QueuedMessage[] = [];
  private appStateSubscription: any;
  private netInfoSubscription: any;
  private lastPingTime = 0;
  private latency = 0;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private stateChangeListeners = new Set<(state: WebSocketState) => void>();
  private errorListeners = new Set<(error: Error) => void>();

  private constructor(config: WebSocketManagerConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
      enableCompression: false,
      enableOfflineQueue: true,
      debug: false,
      ...config,
    };

    this.initialize();
  }

  static getInstance(config?: WebSocketManagerConfig): WebSocketManager {
    if (!WebSocketManager.instance && config) {
      WebSocketManager.instance = new WebSocketManager(config);
    }
    return WebSocketManager.instance!;
  }

  private initialize() {
    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Listen to network state changes
    // Note: expo-network doesn't have a direct event listener like NetInfo
    // We'll poll the network state when needed

    // Load queued messages from storage
    this.loadQueuedMessages();
  }

  async connect() {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    if (!Config.FEATURES.WEBSOCKET_ENABLED) {
      // WebSocket disabled in current environment
      return;
    }

    // Check network connectivity
    const netInfo = await Network.getNetworkStateAsync();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      // No network connection, queuing messages
      this.setState('disconnected');
      return;
    }

    this.setState('connecting');
    this.reconnectAttempts++;

    try {
      const url = this.buildWebSocketUrl();
      this.ws = new WebSocket(url, [], {
        headers: this.getHeaders(),
      });

      this.setupEventHandlers();
    } catch (error) {
      logger.error('Failed to create WebSocket', error);
      this.handleError(error as Error);
    }
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.config.url || Config.WEBSOCKET.URL;
    const params = new URLSearchParams();

    if (this.config.authToken) {
      params.append('token', this.config.authToken);
    }

    if (this.config.enableCompression) {
      params.append('compress', 'true');
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': `Trioll-Mobile/${Platform.OS}`,
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    return headers;
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.onOpen();
    };

    this.ws.onclose = (event) => {
      this.onClose(event);
    };

    this.ws.onerror = (error) => {
      this.onError(error);
    };

    this.ws.onmessage = (event) => {
      this.onMessage(event);
    };
  }

  private onOpen() {
    logger.info('WebSocket connected');
    this.setState('connected');
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    // Track connection event
    analyticsService.trackWebSocketEvent('connected', {
      reconnectAttempts: this.reconnectAttempts,
      latency: this.latency,
    });
  }

  private onClose(event: WebSocketCloseEvent) {
    logger.info('WebSocket disconnected', {
      code: event.code,
      reason: event.reason,
    });

    this.setState('disconnected');
    this.stopHeartbeat();

    // Handle reconnection
    if (this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    }

    // Track disconnection event
    analyticsService.trackWebSocketEvent('disconnected', {
      code: event.code,
      reason: event.reason,
    });
  }

  private onError(error: Event) {
    logger.error('WebSocket error', error);
    this.setState('error');

    // Track error event
    analyticsService.trackWebSocketEvent('error', {
      error: error.toString(),
    });
    
    // Notify error listeners
    const errorObj = new Error('WebSocket connection error');
    this.errorListeners.forEach(listener => {
      try {
        listener(errorObj);
      } catch (err) {
        logger.error('Error in error listener:', err);
      }
    });
  }

  private async onMessage(event: WebSocketMessageEvent) {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;

      // Handle different message types
      switch (message.type) {
        case 'pong':
          this.handlePong(message);
          break;
        case 'notification':
          this.handleNotification(message);
          break;
        case 'data':
          this.handleDataMessage(message);
          break;
        case 'error':
          this.handleErrorMessage(message);
          break;
        default:
          this.handleCustomMessage(message);
      }

      // Track message received
      performanceMonitor.trackWebSocketMessage('received', message.type);
    } catch (error) {
      logger.error('Failed to parse WebSocket message', error);
    }
  }

  private handlePong(_message: WebSocketMessage) {
    const now = Date.now();
    this.latency = now - this.lastPingTime;
    
    performanceMonitor.trackWebSocketLatency(this.latency);
  }

  private handleNotification(message: WebSocketMessage) {
    if (message.channel) {
      this.notifySubscribers(message.channel, message.data);
    }
  }

  private handleDataMessage(message: WebSocketMessage) {
    if (message.channel) {
      this.notifySubscribers(message.channel, message.data);
    }
  }

  private handleErrorMessage(message: WebSocketMessage) {
    logger.error('Server error message', message.data);
    
    // Notify error handlers
    if (message.channel) {
      this.notifySubscribers(`${message.channel}:error`, message.data);
    }
  }

  private handleCustomMessage(message: WebSocketMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    } else if (message.channel) {
      this.notifySubscribers(message.channel, message.data);
    }
  }

  private notifySubscribers(channel: string, data: unknown) {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Subscriber error for channel ${channel}`, error);
        }
      });
    }
  }

  subscribe(options: SubscriptionOptions): () => void {
    const { channel, callback } = options;

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(callback);

    // Send subscription message
    this.send({
      type: 'subscribe',
      channel,
    });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, callback);
    };
  }

  unsubscribe(channel: string, callback: (data: unknown) => void) {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.subscriptions.delete(channel);
        
        // Send unsubscribe message
        this.send({
          type: 'unsubscribe',
          channel,
        });
      }
    }
  }

  send(message: WebSocketMessage) {
    const queuedMessage: QueuedMessage = {
      message: {
        ...message,
        id: message.id || this.generateMessageId(),
        timestamp: message.timestamp || Date.now(),
      },
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(queuedMessage.message));
        
        // Track message sent
        performanceMonitor.trackWebSocketMessage('sent', message.type);
      } catch (error) {
        logger.error('Failed to send message', error);
        this.queueMessage(queuedMessage);
      }
    } else {
      this.queueMessage(queuedMessage);
    }
  }

  private queueMessage(message: QueuedMessage) {
    if (!this.config.enableOfflineQueue) {
      return;
    }

    // Add to queue
    this.messageQueue.push(message);

    // Limit queue size
    if (this.messageQueue.length > this.config.messageQueueSize!) {
      this.messageQueue.shift();
    }

    // Save queue to storage
    this.saveQueuedMessages();
  }

  private async processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    logger.info(`Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const queuedMessage of messages) {
      if (this.state !== 'connected') {
        // Re-queue remaining messages
        this.messageQueue.push(...messages.slice(messages.indexOf(queuedMessage)));
        break;
      }

      try {
        this.ws?.send(JSON.stringify(queuedMessage.message));
        await this.delay(100); // Rate limiting
      } catch (error) {
        logger.error('Failed to send queued message', error);
        
        queuedMessage.retryCount++;
        if (queuedMessage.retryCount < 3) {
          this.messageQueue.push(queuedMessage);
        }
      }
    }

    // Save updated queue
    this.saveQueuedMessages();
  }

  private async saveQueuedMessages() {
    try {
      await AsyncStorage.setItem(
        'websocket_message_queue',
        JSON.stringify(this.messageQueue)
      );
    } catch (error) {
      logger.error('Failed to save message queue', error);
    }
  }

  private async loadQueuedMessages() {
    try {
      const data = await AsyncStorage.getItem('websocket_message_queue');
      if (data) {
        this.messageQueue = JSON.parse(data);
        logger.info(`Loaded ${this.messageQueue.length} queued messages`);
      }
    } catch (error) {
      logger.error('Failed to load message queue', error);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect for certain close codes
    const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
    if (noReconnectCodes.includes(closeCode)) {
      return false;
    }

    return (
      this.reconnectAttempts < this.config.maxReconnectAttempts! &&
      Config.FEATURES.WEBSOCKET_ENABLED
    );
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    logger.info(`Scheduling reconnect in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setState(state: WebSocketState) {
    this.state = state;
    
    // Notify state change subscribers
    this.notifySubscribers('state:change', { state });
    
    // Notify state change listeners
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('Error in state change listener:', error);
      }
    });
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground
      if (this.state === 'disconnected') {
        const netInfo = await Network.getNetworkStateAsync();
        if (netInfo.isConnected && netInfo.isInternetReachable) {
          this.connect();
        }
      }
    } else if (nextAppState === 'background') {
      // App went to background
      // Keep connection alive for notifications
    }
  };

  private handleNetworkStateChange = async () => {
    const netInfo = await Network.getNetworkStateAsync();
    
    if (netInfo.isConnected && netInfo.isInternetReachable && this.state === 'disconnected') {
      // Network restored, reconnect
      this.connect();
    } else if (!netInfo.isConnected && this.state === 'connected') {
      // Network lost, disconnect
      this.disconnect();
    }
  };

  disconnect() {
    logger.info('Disconnecting WebSocket');
    
    this.setState('disconnecting');
    
    // Clear timers
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  dispose() {
    this.disconnect();

    // Remove listeners
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Clear subscriptions
    this.subscriptions.clear();
    this.messageHandlers.clear();

    // Clear instance
    WebSocketManager.instance = null;
  }

  // Helper methods
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API
  getState(): WebSocketState {
    return this.state;
  }

  getLatency(): number {
    return this.latency;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  registerMessageHandler(type: string, handler: (data: unknown) => void) {
    this.messageHandlers.set(type, handler);
  }

  unregisterMessageHandler(type: string) {
    this.messageHandlers.delete(type);
  }

  updateAuthToken(token: string | null) {
    this.config.authToken = token;
    
    // Reconnect with new token
    if (this.state === 'connected') {
      this.disconnect();
      this.connect();
    }
  }

  // Event listeners
  onConnectionStateChange(listener: (state: WebSocketState) => void): () => void {
    this.stateChangeListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }

  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.errorListeners.delete(listener);
    };
  }
}

// Export singleton instance
export const websocketManager = WebSocketManager.getInstance;