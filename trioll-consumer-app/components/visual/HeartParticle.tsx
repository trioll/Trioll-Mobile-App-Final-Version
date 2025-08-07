import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeartParticleProps {
  x: number;
  y: number;
  onComplete?: () => void;
}

interface SingleParticleProps {
  index: number;
  onComplete?: () => void;
}

const SingleParticle: React.FC<SingleParticleProps> = ({ index, onComplete }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Random spread values
    const randomX = (Math.random() - 0.5) * 120; // -60 to 60
    const randomDelay = index * 30 + Math.random() * 50;
    const randomRotation = (Math.random() - 0.5) * 90; // -45 to 45 degrees

    // Start animation after delay
    setTimeout(() => {
      Animated.parallel([
        // Fade in then out
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
        // Rise up with Bezier-like curve
        Animated.timing(translateY, {
          toValue: -100 - Math.random() * 50, // -100 to -150
          duration: 1000,
          easing: t => t * t * (3 - 2 * t), // Smooth ease-out curve
          useNativeDriver: true,
        }),
        // Horizontal spread
        Animated.spring(translateX, {
          toValue: randomX,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
        // Scale animation
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1 + Math.random() * 0.5, // 1 to 1.5
            tension: 80,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 300,
            delay: 400,
            useNativeDriver: true,
          }),
        ]),
        // Gentle rotation
        Animated.timing(rotation, {
          toValue: randomRotation,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }, randomDelay);
  }, [index, onComplete]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
            {
              rotate: rotation.interpolate({
                inputRange: [-90, 90],
                outputRange: ['-90deg', '90deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons name="heart" size={20} color="#FF2D55" />
    </Animated.View>
  );
};

export const HeartParticle: React.FC<HeartParticleProps> = ({ x, y, onComplete }) => {
  const [particles, setParticles] = React.useState<number[]>([0, 1, 2, 3, 4, 5]);
  const completedCount = useRef(0);

  const handleParticleComplete = () => {
    completedCount.current += 1;
    if (completedCount.current === particles.length && onComplete) {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { left: x - 50, top: y - 50 }]} pointerEvents="none">
      {particles.map(index => (
        <SingleParticle key={index} index={index} onComplete={handleParticleComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    zIndex: 1000,
  },
});
