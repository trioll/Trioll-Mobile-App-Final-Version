import { useEffect, useRef } from 'react';
import { Animated, LayoutAnimation, Platform } from 'react-native';
import { useOrientation } from './useOrientation';

interface OrientationTransitionConfig {
  duration?: number;
  enableLayoutAnimation?: boolean;
  onTransitionStart?: (isPortrait: boolean) => void;
  onTransitionEnd?: (isPortrait: boolean) => void;
}

export const useOrientationTransition = (config: OrientationTransitionConfig = {}) => {
  const {
    duration = 300,
    enableLayoutAnimation = true,
    onTransitionStart,
    onTransitionEnd,
  } = config;

  const { isPortrait } = useOrientation();
  const previousOrientation = useRef(isPortrait);
  const transitionProgress = useRef(new Animated.Value(isPortrait ? 0 : 1)).current;

  useEffect(() => {
    // Check if orientation actually changed
    if (previousOrientation.current === isPortrait) {
      return;
    }

    // Trigger callbacks
    onTransitionStart?.(isPortrait);

    // Configure layout animation for smooth transitions
    if (enableLayoutAnimation && Platform.OS !== 'android') {
      LayoutAnimation.configureNext({
        duration,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
    }

    // Animate transition progress
    Animated.timing(transitionProgress, {
      toValue: isPortrait ? 0 : 1,
      duration,
      useNativeDriver: true,
    }).start(() => {
      onTransitionEnd?.(isPortrait);
    });

    // Update previous orientation
    previousOrientation.current = isPortrait;
  }, [isPortrait, duration, enableLayoutAnimation, onTransitionStart, onTransitionEnd, transitionProgress]);

  return {
    isPortrait,
    transitionProgress,
    // Helper interpolations
    portraitValue: (outputRange: [number, number]) =>
      transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange,
      }),
    landscapeValue: (outputRange: [number, number]) =>
      transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: outputRange.reverse() as [number, number],
      }),
  };
};