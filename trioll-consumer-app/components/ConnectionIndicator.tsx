
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGames } from '../src/hooks/useGames';
import { Config } from '../src/config/environments';

export const ConnectionIndicator: React.FC = () => {
  const { isUsingApiData } = useGames();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(isUsingApiData && !Config.USE_MOCK_API);
  }, [isUsingApiData]);

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, isConnected ? styles.connected : styles.disconnected]}>
        <Ionicons
          name={isConnected ? 'cloud-done' : 'cloud-offline' as any}
          size={14}
          color={isConnected ? '#00FF88' : '#FF6B6B'}
        />
        <Text style={[styles.text, isConnected ? styles.connectedText : styles.disconnectedText]}>
          {isConnected ? 'API Data' : 'Local Data'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    gap: 6,
  },
  connected: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  disconnected: {
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectedText: {
    color: '#00FF88',
  },
  disconnectedText: {
    color: '#FF6B6B',
  },
});
