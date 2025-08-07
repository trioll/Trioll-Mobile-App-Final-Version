import React, { useRef, useState } from 'react';
import { Animated, Pressable, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeartParticle } from './visual/HeartParticle';
import { useMultipleAnimations } from '../hooks/useSpringAnimation';
import { useHaptics } from '../hooks/useHaptics';
import { DURATIONS, SCALE_VALUES, SPRING_CONFIG } from '../constants/animations';

interface LikeButtonProps {
  isLiked: boolean;
  onPress: () => void;
  count?: number; // Temporary placeholder count
}

export const LikeButton: React.FC<LikeButtonProps> = ({ isLiked, onPress, count = 0 }) => {
  const { scale, glow } = useMultipleAnimations();
  const shine = useRef(new Animated.Value(0)).current;
  const plusOneOpacity = useRef(new Animated.Value(0)).current;
  const plusOneY = useRef(new Animated.Value(0)).current;
  const [particles, setParticles] = useState<number[]>([]);
  const haptics = useHaptics();

  const handlePress = async () => {
    // Call the parent handler
    onPress();

    // Trigger haptic feedback - different for like vs unlike
    if (!isLiked) {
      // Like: medium impact with a subtle double tap feel
      await haptics.impact('medium');
      setTimeout(() => haptics.impact('light'), 50); // Subtle echo
    } else {
      // Unlike: lighter single tap
      await haptics.impact('light');
    }

    if (!isLiked) {
      // Create particles
      const newParticles = Array.from({ length: 6 }, (_, i) => Date.now() + i);
      setParticles(prev => [...prev, ...newParticles]);

      // Animate the heart
      Animated.parallel([
        // Scale bounce
        Animated.sequence([
          Animated.spring(scale, {
            toValue: SCALE_VALUES.BOUNCE_LARGE,
            ...SPRING_CONFIG.BOUNCY,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            ...SPRING_CONFIG.NORMAL,
            useNativeDriver: true,
          }),
        ]),
        // Glow effect
        Animated.timing(glow, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Shine glint
        Animated.sequence([
          Animated.timing(shine, {
            toValue: 1,
            duration: DURATIONS.NORMAL,
            useNativeDriver: true,
          }),
          Animated.timing(shine, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // +1 animation
        Animated.parallel([
          Animated.sequence([
            Animated.timing(plusOneOpacity, {
              toValue: 1,
              duration: DURATIONS.NORMAL,
              useNativeDriver: true,
            }),
            Animated.timing(plusOneOpacity, {
              toValue: 0,
              duration: 600,
              delay: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(plusOneY, {
            toValue: -40,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset +1 position
        plusOneY.setValue(0);
      });
    } else {
      // Unlike animation
      Animated.parallel([
        Animated.spring(scale, {
          toValue: SCALE_VALUES.PRESSED,
          ...SPRING_CONFIG.BOUNCY,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: DURATIONS.NORMAL,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(scale, {
          toValue: 1,
          ...SPRING_CONFIG.BOUNCY,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const removeParticle = (id: number) => {
    setParticles(prev => prev.filter(p => p !== id));
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.button}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale }],
              shadowColor: '#FF2D55',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8],
              }),
              shadowRadius: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 15],
              }),
            },
          ]}
        >
          {/* Shine overlay */}
          <Animated.View
            style={[
              styles.shine,
              {
                opacity: shine,
              },
            ]}
          />
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline' as any}
            size={28}
            color={isLiked ? '#FF2D55' : '#FFFFFF'}
          />
        </Animated.View>
      </Pressable>

      {/* Like count */}
      <Text style={styles.countText}>
        {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString()}
      </Text>

      {/* +1 Text */}
      <Animated.View
        style={[
          styles.plusOne,
          {
            opacity: plusOneOpacity,
            transform: [{ translateY: plusOneY }],
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.plusOneText}>❤️ +1</Text>
      </Animated.View>

      {/* Heart particles */}
      {particles.map(id => (
        <HeartParticle key={id} x={0} y={0} onComplete={() => removeParticle(id)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    padding: 12,
  },
  iconContainer: {
    position: 'relative',
  },
  shine: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  plusOne: {
    position: 'absolute',
    top: -20,
  },
  plusOneText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF2D55',
    textShadowColor: 'rgba(255, 45, 85, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  countText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    // Removed absolute positioning to keep it in normal flow
  },
});
