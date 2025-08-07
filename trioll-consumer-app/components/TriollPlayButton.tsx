import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, TouchableWithoutFeedback, Dimensions, StyleSheet } from 'react-native';

interface TriollPlayButtonProps {
  onPress: () => void;
  gameGenre?: 'action' | 'puzzle' | 'horror' | 'default' | string;
  size?: number;
  isApproaching?: boolean; // For swipe approach detection
}

export const TriollPlayButton: React.FC<TriollPlayButtonProps> = ({
  onPress,
  gameGenre: _gameGenre = 'default',
  size,
  isApproaching = false,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const buttonSize = size || Math.min(screenWidth * 0.32, 120); // Bigger size
  const [_isPressed, setIsPressed] = useState(false);

  // Core animations
  const scale = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const neonGlow = useRef(new Animated.Value(0.5)).current;
  const pressGlow = useRef(new Animated.Value(0)).current;

  // Handle approach animation
  useEffect(() => {
    if (isApproaching) {
      Animated.spring(scale, {
        toValue: 1.08,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [isApproaching]);

  // Initialize animations
  useEffect(() => {
    // Breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Neon glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(neonGlow, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(neonGlow, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);

    // Scale down with neon burst
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(pressGlow, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);

    // Bouncy spring back with glow fade
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(pressGlow, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger action
    // Call onPress after animations
    setTimeout(() => {
      onPress();
    }, 150); // Small delay for visual feedback
  };

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View style={[styles.container, { width: buttonSize, height: buttonSize }]}>
        {/* Single pulsing ring */}
        <Animated.View
          style={[
            styles.pulsingRing,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              opacity: neonGlow,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        {/* Main button */}
        <Animated.View
          style={[
            styles.button,
            {
              width: buttonSize * 0.8,
              height: buttonSize * 0.8,
              borderRadius: buttonSize * 0.4,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Solid play triangle */}
          <View
            style={[
              styles.playTriangle,
              {
                borderLeftColor: '#FFFFFF',
                borderLeftWidth: buttonSize * 0.22,
                borderTopWidth: buttonSize * 0.13,
                borderBottomWidth: buttonSize * 0.13,
                marginLeft: buttonSize * 0.06,
              },
            ]}
          />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
