import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, Easing } from 'react-native';
import Svg, { Defs, Mask, Rect, Circle, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useOrientation } from '../hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularRevealTransitionProps {
  isVisible: boolean;
  origin: { x: number; y: number };
  onTransitionComplete?: () => void;
}

export const CircularRevealTransition: React.FC<CircularRevealTransitionProps> = ({
  isVisible,
  origin,
  onTransitionComplete,
}) => {
  const { width: screenWidth, height: screenHeight } = useOrientation();
  const screenDiagonal = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);

  // Core animation value for the expanding circle (non-native for SVG)
  // Start with 0.1 to avoid zero radius error
  const circleRadius = useRef(new Animated.Value(0.1)).current;

  // Separate animated values for native animations
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const innerGlow = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const innerGlowScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let hapticTimeout: ReturnType<typeof setTimeout>;

    if (isVisible) {
      // Subtle haptic feedback
      hapticTimeout = setTimeout(() => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }, 0);

      // Main circular reveal animation
      Animated.parallel([
        // Circle expansion with custom easing (non-native for SVG)
        Animated.timing(circleRadius, {
          toValue: screenDiagonal,
          duration: 550,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // easeOutCirc equivalent
          useNativeDriver: false, // Can't use native driver with SVG radius
        }),

        // Ring scale animation (native)
        Animated.timing(ringScale, {
          toValue: 3,
          duration: 550,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),

        // Subtle ring fade for depth
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.15,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        // Inner glow scale (native)
        Animated.timing(innerGlowScale, {
          toValue: 2,
          duration: 550,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),

        // Inner glow opacity for wonder effect
        Animated.sequence([
          Animated.timing(innerGlow, {
            toValue: 0.3,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerGlow, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Transition complete
        setTimeout(() => {
          if (onTransitionComplete) {
            onTransitionComplete();
          }
        }, 0);
      });
    } else {
      // Reset animations smoothly
      Animated.timing(circleRadius, {
        toValue: 0.1,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }).start();
      ringOpacity.setValue(0);
      innerGlow.setValue(0);
      ringScale.setValue(0.5);
      innerGlowScale.setValue(0.3);
    }

    return () => {
      if (hapticTimeout) {
        clearTimeout(hapticTimeout);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1100 }]} pointerEvents="none">
      {/* Subtle expanding ring */}
      <Animated.View
        style={[
          styles.subtleRing,
          {
            position: 'absolute',
            left: origin.x - 60,
            top: origin.y - 60,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Main circular reveal mask */}
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {/* Radial gradient for soft edges */}
          <RadialGradient id="softEdge" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="white" stopOpacity="1" />
            <Stop offset="85%" stopColor="white" stopOpacity="1" />
            <Stop offset="100%" stopColor="white" stopOpacity="0.7" />
          </RadialGradient>

          <Mask id="revealMask">
            <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="black" />
            <AnimatedCircle cx={origin.x} cy={origin.y} r={circleRadius} fill="url(#softEdge)" />
          </Mask>
        </Defs>

        {/* Subtle overlay with circular reveal */}
        <Rect
          x="0"
          y="0"
          width={screenWidth}
          height={screenHeight}
          fill="black"
          fillOpacity="0.92"
          mask="url(#revealMask)"
        />
      </Svg>

      {/* Inner glow for depth and wonder */}
      <Animated.View
        style={[
          styles.innerGlow,
          {
            position: 'absolute',
            left: origin.x - 100,
            top: origin.y - 100,
            opacity: innerGlow,
            transform: [{ scale: innerGlowScale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  subtleRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  innerGlow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 5,
  },
});
