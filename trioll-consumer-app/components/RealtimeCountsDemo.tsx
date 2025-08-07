import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWebSocketContext } from '../src/contexts/WebSocketContext';
import { standardWebSocketService } from '../src/services/websocket/StandardWebSocketService';
import { WebSocketMessageType, createStandardWebSocketMessage, GameUpdateMessage } from '../src/types/websocket.types';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('RealtimeCountsDemo');

/**
 * Demo component to test real-time count updates
 * This simulates backend WebSocket messages for development
 */
export const RealtimeCountsDemo: React.FC = () => {
  const { isConnected, connectionState } = useWebSocketContext();

  const simulateGameUpdate = (gameId: string, updates: Partial<GameUpdateMessage['updates']>) => {
    if (!isConnected) {
      logger.warn('Cannot simulate update - WebSocket not connected');
      return;
    }

    // Create a standard WebSocket message
    const message = createStandardWebSocketMessage<GameUpdateMessage>(
      WebSocketMessageType.GAME_UPDATE,
      {
        gameId,
        updates
      },
      `game:${gameId}`
    );

    // Emit the message directly through the service for testing
    // In production, this would come from the backend
    (standardWebSocketService as any).handleStandardMessage(message);
    
    logger.info('Simulated game update:', { gameId, updates });
  };

  const testScenarios = [
    {
      label: 'Add 10 Likes',
      action: () => simulateGameUpdate('1', { likeCount: Math.floor(Math.random() * 100) + 10 })
    },
    {
      label: 'Update Rating',
      action: () => simulateGameUpdate('1', { rating: Number((Math.random() * 5).toFixed(1)) })
    },
    {
      label: 'Increase Play Count',
      action: () => simulateGameUpdate('1', { playCount: Math.floor(Math.random() * 1000) })
    },
    {
      label: 'Feature Game',
      action: () => simulateGameUpdate('1', { featured: true })
    },
    {
      label: 'Update All Counts',
      action: () => simulateGameUpdate('1', {
        likeCount: Math.floor(Math.random() * 200),
        rating: Number((Math.random() * 5).toFixed(1)),
        playCount: Math.floor(Math.random() * 2000),
      })
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Real-time Updates Demo</Text>
        <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]} />
        <Text style={styles.status}>{connectionState}</Text>
      </View>
      
      <Text style={styles.info}>
        Tap buttons below to simulate real-time count updates.
        Watch the game cards update automatically!
      </Text>

      <View style={styles.buttonGrid}>
        {testScenarios.map((scenario, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.button, !isConnected && styles.buttonDisabled]}
            onPress={scenario.action}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>{scenario.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isConnected && (
        <Text style={styles.warning}>
          WebSocket not connected. Real-time updates unavailable.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    maxWidth: 300,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  connected: {
    backgroundColor: '#00FF88',
  },
  disconnected: {
    backgroundColor: '#FF6B6B',
  },
  status: {
    color: '#999',
    fontSize: 12,
  },
  info: {
    color: '#999',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  buttonGrid: {
    gap: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  warning: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});