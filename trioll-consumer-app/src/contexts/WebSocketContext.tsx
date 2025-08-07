
/**
 * WebSocket Context
 * Provides WebSocket state and functionality to components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { WebSocketState } from '../utils/websocketManager';
import { websocketIntegration } from '../utils/websocketIntegration';

interface WebSocketContextValue {
  connectionState: WebSocketState;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToGame: (gameId: string, callback: (data: unknown) => void) => () => void;
  subscribeToNotifications: (
    userId: string,
    callback: (notification: unknown) => void
  ) => () => void;
  sendAction: (action: string, data: any) => boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function WebSocketProvider({ children, autoConnect = true }: WebSocketProviderProps) {
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');

  useEffect(() => {
    // Initialize WebSocket integration
    if (autoConnect) {
      websocketIntegration.initialize().catch(console.error);
    }

    // Update connection state
    const updateState = () => {
      setConnectionState(websocketIntegration.getConnectionState());
    };

    // Poll for state changes (temporary until we add proper event emitter)
    const interval = setInterval(updateState, 1000);
    updateState();

    return () => {
      clearInterval(interval);
    };
  }, [autoConnect]);

  const connect = useCallback(async () => {
    await websocketIntegration.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketIntegration.disconnect();
  }, []);

  const subscribeToGame = useCallback((gameId: string, callback: (data: unknown) => void) => {
    return websocketIntegration.subscribeToGameUpdates(gameId, callback);
  }, []);

  const subscribeToNotifications = useCallback(
    (userId: string, callback: (notification: unknown) => void) => {
      return websocketIntegration.subscribeToUserNotifications(userId, callback);
    },
    []
  );

  const sendAction = useCallback((action: string, data: any) => {
    return websocketIntegration.sendUserAction(action, data);
  }, []);

  const value: WebSocketContextValue = {
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    subscribeToGame,
    subscribeToNotifications,
    sendAction,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
