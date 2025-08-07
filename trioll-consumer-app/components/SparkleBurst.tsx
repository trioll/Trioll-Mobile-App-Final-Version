import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SparkleBurstProps {
  x: number;
  y: number;
  onComplete?: () => void;
}

interface SparkleProps {
  angle: number;
  delay: number;
}

const Sparkle: React.FC<SparkleProps> = ({ angle, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const radians = (angle * Math.PI) / 180;
    const distance = 30 + Math.random() * 20; // 30-50 pixels
    const endX = Math.cos(radians) * distance;
    const endY = Math.sin(radians) * distance;

    setTimeout(() => {
      Animated.parallel([
        // Fade in and out
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        // Scale up then down
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1,
            tension: 200,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 200,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
        // Move outward
        Animated.spring(translateX, {
          toValue: endX,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: endY,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, [angle, delay]);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Ionicons name="star" size={8} color="#FFD700" />
    </Animated.View>
  );
};

export const SparkleBurst: React.FC<SparkleBurstProps> = ({ x, y, onComplete }) => {
  const particles = Array.prototype.slice.call({ length: 8 }, (_, i) => ({
    angle: (i * 360) / 8 + Math.random() * 20 - 10, // Even distribution with slight randomness
    delay: i * 30, // Staggered appearance
  }));

  useEffect(() => {
    // Cleanup after all animations complete
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Animated.View style={[styles.container, { left: x, top: y }]}>
      {particles.map((particle, index) => (
        <Sparkle key={index} angle={particle.angle} delay={particle.delay} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 1,
    height: 1,
    zIndex: 1000,
  },
  sparkle: {
    position: 'absolute',
  },
});
