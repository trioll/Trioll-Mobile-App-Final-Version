import { useState, useEffect } from 'react';

// Mock network state hook for MVP
// In production, would use expo-network or @react-native-community/netinfo
export const useNetworkState = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType] = useState<string>('wifi');

  useEffect(() => {
    // Mock network state changes for demo
    const interval = setInterval(() => {
      // Randomly simulate offline state (10% chance)
      const offline = Math.random() < 0.1;
      setIsOffline(offline);
      setIsConnected(!offline);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    isOffline,
    isConnected,
    connectionType,
  };
};
