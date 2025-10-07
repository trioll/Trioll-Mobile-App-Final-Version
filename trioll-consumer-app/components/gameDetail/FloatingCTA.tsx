import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface FloatingCTAProps {
  onPress: () => void;
  trialDuration: number;
  scrollY: Animated.Value;
}

export const FloatingCTA: React.FC<FloatingCTAProps> = ({ onPress, trialDuration, scrollY }) => {
  const _insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  // Show/hide based on scroll position
  const opacity = scrollY.interpolate({
    inputRange: [200, 300],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Listen to scroll position to update visibility
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setIsVisible(value > 250);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // Bounce animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: _insets.bottom + 20,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <Pressable onPress={handlePress} style={styles.button}>
        <LinearGradient
          colors={['#6366f1', '#5558e3']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="play-circle" size={32} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Try Now</Text>
              <Text style={styles.subtitle}>{trialDuration} min free trial</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Shadow */}
      <View style={styles.shadow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    opacity: 0.2,
    zIndex: -1,
  },
});
