
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DURATIONS, SPRING_CONFIGS } from '../../constants/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface OfflineBannerProps {
  isOffline: boolean;
  onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, onRetry }) => {
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const haptics = useHaptics();

  useEffect(() => {
    Animated.spring(slideAnim, {
      ...SPRING_CONFIGS.BOUNCY,
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  const handleRetry = () => {
    haptics.impact('light');
    if (onRetry) onRetry();
  };

  return (
    <Animated.View
      style={[
        styles.offlineBanner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.offlineContent}>
        <Ionicons name="cloud-offline" size={20} color="#FFAA00" />
        <Text style={styles.offlineText}>You're offline</Text>
        {onRetry && (
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

interface OfflineIndicatorProps {
  size?: 'small' | 'large';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ size = 'small' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        size === 'small' ? styles.offlineIndicatorSmall : styles.offlineIndicatorLarge,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={size === 'small' ? 16 : 24} color="#FFAA00" />
    </Animated.View>
  );
};

interface SyncQueueIndicatorProps {
  itemCount: number;
  onViewQueue?: () => void;
}

export const SyncQueueIndicator: React.FC<SyncQueueIndicatorProps> = ({
  itemCount,
  onViewQueue,
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const haptics = useHaptics();

  useEffect(() => {
    if (itemCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [itemCount]);

  if (itemCount === 0) return null;

  const handlePress = () => {
    haptics.impact('light');
    if (onViewQueue) onViewQueue();
  };

  return (
    <Pressable onPress={handlePress} style={styles.syncQueueContainer}>
      <Animated.View
        style={[
          styles.syncQueueContent,
          {
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        <Ionicons name="sync" size={20} color="#00FFFF" />
        <Text style={styles.syncQueueText}>
          {itemCount} {itemCount === 1 ? 'action' : 'actions'} pending sync
        </Text>
        {onViewQueue && <Ionicons name="chevron-forward" size={16} color="#00FFFF" />}
      </Animated.View>
    </Pressable>
  );
};

interface CachedBadgeProps {
  isCached: boolean;
}

export const CachedBadge: React.FC<CachedBadgeProps> = ({ isCached }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isCached ? 1 : 0,
      duration: DURATIONS.FAST,
      useNativeDriver: true,
    }).start();
  }, [isCached]);

  if (!isCached) return null;

  return (
    <Animated.View
      style={[
        styles.cachedBadge,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Ionicons name="download-outline" size={16} color="#00FF88" />
      <Text style={styles.cachedText}>CACHED</Text>
    </Animated.View>
  );
};

interface OfflineGameOverlayProps {
  isOffline: boolean;
  isCached: boolean;
}

export const OfflineGameOverlay: React.FC<OfflineGameOverlayProps> = ({ isOffline, isCached }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOffline && !isCached ? 0.8 : 0,
      duration: DURATIONS.NORMAL,
      useNativeDriver: true,
    }).start();
  }, [isOffline, isCached]);

  if (!isOffline || isCached) return null;

  return (
    <Animated.View
      style={[
        styles.offlineOverlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.offlineOverlayContent}>
        <Ionicons name="cloud-offline" size={48} color="#FFFFFF" />
        <Text style={styles.offlineOverlayText}>Not available offline</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 170, 0, 0.3)',
    zIndex: 1000,
  },
  offlineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  offlineText: {
    color: '#FFAA00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    marginLeft: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFAA00',
  },
  retryText: {
    color: '#FFAA00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  offlineIndicatorSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  offlineIndicatorLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  syncQueueContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 900,
  },
  syncQueueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  syncQueueText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  cachedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  cachedText: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineOverlayContent: {
    alignItems: 'center',
  },
  offlineOverlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
