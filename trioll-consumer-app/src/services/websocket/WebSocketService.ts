import { SimpleEventEmitter } from './SimpleEventEmitter';
import type { WebSocketMessage } from './types';

export class WebSocketService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  
  async connect(url?: string): Promise<void> {
    try {
      this.isConnecting = true;
      this.ws = new WebSocket(url || 'wss://mock.trioll.com');
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        this.isConnecting = false;
        this.emit('error', error);
      };
      
      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      throw error;
    }
  }
  
  getStatus(): {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN || false,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
  
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.emit('disconnected');
  }
  
  subscribe(channel: string, callback?: (data: any) => void): boolean {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    
    if (callback) {
      this.subscriptions.get(channel)!.add(callback);
    }
    
    this.send({ type: 'subscribe', channel });
    return true;
  }
  
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ type: 'unsubscribe', channel });
  }
  
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  onError(callback: (error: unknown) => void): void {
    this.on('error', callback);
  }
  
  onConnect(callback: () => void): void {
    this.on('connected', callback);
  }
  
  onDisconnect(callback: () => void): void {
    this.on('disconnected', callback);
  }
  
  private handleMessage(message: WebSocketMessage): void {
    const { type, payload } = message;
    
    // Handle channel messages
    if (type === 'notification' && payload?.channel) {
      const callbacks = this.subscriptions.get(payload.channel);
      if (callbacks) {
        callbacks.forEach(cb => cb(payload.data));
      }
    }
    
    this.emit('message', message);
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(console.error);
    }, 5000);
  }
}

export const wsManager = new WebSocketService();
export const webSocketService = wsManager;
