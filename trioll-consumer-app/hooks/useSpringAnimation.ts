import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { SPRING_CONFIG, SCALE_VALUES, DURATIONS } from '../constants/animations';

interface SpringAnimationOptions {
  initialValue?: number;
  toValue?: number;
  config?: (typeof SPRING_CONFIG)[keyof typeof SPRING_CONFIG];
  onComplete?: () => void;
}

interface ScaleBounceOptions {
  scale?: number;
  bounceScale?: number;
  config?: (typeof SPRING_CONFIG)[keyof typeof SPRING_CONFIG];
  onComplete?: () => void;
}

export const useSpringAnimation = (initialValue: number = 1) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  const animateTo = useCallback(
    (toValue: number, options?: SpringAnimationOptions) => {
      const config = options?.config || SPRING_CONFIG.NORMAL;

      const animation = Animated.spring(animatedValue, {
        toValue,
        ...config,
        useNativeDriver: true,
      });
      animation.start(options?.onComplete);
      return animation;
    },
    [animatedValue]
  );

  const scaleBounce = useCallback(
    (options?: ScaleBounceOptions) => {
      const {
        scale = SCALE_VALUES.BOUNCE,
        bounceScale = 1,
        config = SPRING_CONFIG.BOUNCY,
        onComplete,
      } = options || {};

      const animation = Animated.sequence([
        Animated.spring(animatedValue, {
          toValue: scale,
          ...config,
          useNativeDriver: true,
        }),
        Animated.spring(animatedValue, {
          toValue: bounceScale,
          ...SPRING_CONFIG.NORMAL,
          useNativeDriver: true,
        }),
      ]);
      animation.start(onComplete);
      return animation;
    },
    [animatedValue]
  );

  const reset = useCallback(() => {
    animatedValue.setValue(initialValue);
  }, [animatedValue, initialValue]);

  const scaleDown = useCallback(() => {
    const animation = Animated.spring(animatedValue, {
      toValue: SCALE_VALUES.PRESSED,
      ...SPRING_CONFIG.QUICK,
      useNativeDriver: true,
    });
    animation.start();
    return animation;
  }, [animatedValue]);

  const scaleUp = useCallback(() => {
    const animation = Animated.spring(animatedValue, {
      toValue: 1,
      ...SPRING_CONFIG.BOUNCY,
      useNativeDriver: true,
    });
    animation.start();
    return animation;
  }, [animatedValue]);

  return {
    animatedValue,
    animateTo,
    scaleBounce,
    reset,
    scaleDown,
    scaleUp,
  };
};

// Hook for managing multiple animated values (like in LikeButton)
export const useMultipleAnimations = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animatePress = useCallback(
    (liked: boolean) => {
      if (liked) {
        // Like animation
        return Animated.parallel([
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
        ]);
      } else {
        // Unlike animation
        return Animated.parallel([
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
        ]);
      }
    },
    [scale, glow]
  );

  const reset = useCallback(() => {
    scale.setValue(1);
    opacity.setValue(0);
    glow.setValue(0);
    translateY.setValue(0);
  }, [scale, opacity, glow, translateY]);

  return {
    scale,
    opacity,
    glow,
    translateY,
    animatePress,
    reset,
  };
};

// Hook for fade animations
export const useFadeAnimation = (initialOpacity: number = 0) => {
  const opacity = useRef(new Animated.Value(initialOpacity)).current;

  const fadeIn = useCallback(
    (duration: number = DURATIONS.NORMAL) => {
      return Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (duration: number = DURATIONS.NORMAL) => {
      return Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      });
    },
    [opacity]
  );

  const fadeTo = useCallback(
    (toValue: number, duration: number = DURATIONS.NORMAL) => {
      return Animated.timing(opacity, {
        toValue,
        duration,
        useNativeDriver: true,
      });
    },
    [opacity]
  );

  return {
    opacity,
    fadeIn,
    fadeOut,
    fadeTo,
  };
};
