import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOrientation } from '../hooks';

interface LoadingTransitionProps {
  isVisible: boolean;
}

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({ isVisible }) => {
  const { width: screenWidth } = useOrientation();
  const shimmer = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Fade in
      Animated.timing(fadeOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Shimmer animation
      Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Fade out
      Animated.timing(fadeOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeOpacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Shimmer effect */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenWidth, screenWidth],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: shimmer.interpolate({
                  inputRange: [0, 0.3, 0.6, 1],
                  outputRange:
                    index === 0
                      ? [0.3, 1, 0.3, 0.3]
                      : index === 1
                        ? [0.3, 0.3, 1, 0.3]
                        : [0.3, 0.3, 0.3, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  shimmer: {
    position: 'absolute',
    width: '200%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
