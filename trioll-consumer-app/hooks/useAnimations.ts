import { useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { SPRING_CONFIGS, DURATIONS, SCALE_VALUES } from '../constants/animations';

/**
 * Consolidated animation hooks to reduce code duplication across components
 */

// ============= Press Animation Hook =============
interface UsePressAnimationOptions {
  initialScale?: number;
  pressScale?: number;
  springConfig?: (typeof SPRING_CONFIGS)[keyof typeof SPRING_CONFIGS];
  haptics?: () => void;
}

export const usePressAnimation = (options: UsePressAnimationOptions = {}) => {
  const {
    initialScale = 1,
    pressScale = SCALE_VALUES.PRESSED,
    springConfig = SPRING_CONFIGS.QUICK,
    haptics,
  } = options;

  const scale = useRef(new Animated.Value(initialScale)).current;

  const handlePressIn = useCallback(() => {
    haptics?.();
    Animated.spring(scale, {
      toValue: pressScale,
      ...springConfig,
      useNativeDriver: true,
    }).start();
  }, [scale, pressScale, springConfig, haptics]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: initialScale,
      ...SPRING_CONFIGS.BOUNCY,
      useNativeDriver: true,
    }).start();
  }, [scale, initialScale]);

  return {
    scale,
    handlePressIn,
    handlePressOut,
  };
};

// ============= Pulse Animation Hook =============
interface UsePulseAnimationOptions {
  minValue?: number;
  maxValue?: number;
  duration?: number;
  autoStart?: boolean;
}

export const usePulseAnimation = (options: UsePulseAnimationOptions = {}) => {
  const { minValue = 1, maxValue = 1.1, duration = 2000, autoStart = true } = options;

  const pulseValue = useRef(new Animated.Value(minValue)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: maxValue,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: minValue,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    animationRef.current.start();
  }, [pulseValue, minValue, maxValue, duration]);

  const stopPulse = useCallback(() => {
    animationRef.current?.stop();
    pulseValue.setValue(minValue);
  }, [pulseValue, minValue]);

  useEffect(() => {
    if (autoStart) {
      startPulse();
    }
    return () => {
      animationRef.current?.stop();
    };
  }, [autoStart, startPulse]);

  return {
    pulseValue,
    startPulse,
    stopPulse,
  };
};

// ============= Slide Animation Hook =============
interface UseSlideAnimationOptions {
  initialValue?: number;
  fromValue?: number;
  toValue?: number;
  duration?: number;
}

export const useSlideAnimation = (options: UseSlideAnimationOptions = {}) => {
  const { initialValue = 0, fromValue = 100, toValue = 0, duration = DURATIONS.NORMAL } = options;

  const translateY = useRef(new Animated.Value(initialValue)).current;

  const slideIn = useCallback(() => {
    translateY.setValue(fromValue);
    return Animated.timing(translateY, {
      toValue,
      duration,
      useNativeDriver: true,
    });
  }, [translateY, fromValue, toValue, duration]);

  const slideOut = useCallback(() => {
    return Animated.timing(translateY, {
      toValue: fromValue,
      duration,
      useNativeDriver: true,
    });
  }, [translateY, fromValue, duration]);

  const slideTo = useCallback(
    (value: number, customDuration?: number) => {
      return Animated.timing(translateY, {
        toValue: value,
        duration: customDuration || duration,
        useNativeDriver: true,
      });
    },
    [translateY, duration]
  );

  return {
    translateY,
    slideIn,
    slideOut,
    slideTo,
  };
};

// ============= Combined Scale & Glow Animation Hook =============
interface UseScaleGlowAnimationOptions {
  initialScale?: number;
  initialGlow?: number;
  maxScale?: number;
  glowDuration?: number;
}

export const useScaleGlowAnimation = (options: UseScaleGlowAnimationOptions = {}) => {
  const {
    initialScale = 1,
    initialGlow = 0,
    maxScale = SCALE_VALUES.BOUNCE_LARGE,
    glowDuration = 300,
  } = options;

  const scale = useRef(new Animated.Value(initialScale)).current;
  const glow = useRef(new Animated.Value(initialGlow)).current;

  const animatePress = useCallback(
    (pressed: boolean) => {
      if (pressed) {
        return Animated.parallel([
          Animated.sequence([
            Animated.spring(scale, {
              toValue: maxScale,
              ...SPRING_CONFIGS.BOUNCY,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: initialScale,
              ...SPRING_CONFIGS.NORMAL,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(glow, {
            toValue: 1,
            duration: glowDuration,
            useNativeDriver: true,
          }),
        ]);
      } else {
        return Animated.parallel([
          Animated.spring(scale, {
            toValue: SCALE_VALUES.PRESSED,
            ...SPRING_CONFIGS.BOUNCY,
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
    [scale, glow, initialScale, maxScale, glowDuration]
  );

  const reset = useCallback(() => {
    scale.setValue(initialScale);
    glow.setValue(initialGlow);
  }, [scale, glow, initialScale, initialGlow]);

  return {
    scale,
    glow,
    animatePress,
    reset,
  };
};

// ============= Stagger Animation Hook =============
interface UseStaggerAnimationOptions {
  count: number;
  initialValue?: number;
  staggerDelay?: number;
}

export const useStaggerAnimation = (options: UseStaggerAnimationOptions) => {
  const { count, initialValue = 0, staggerDelay = 50 } = options;

  const animations = useRef(
    Array(count)
      .fill(0)
      .map(() => new Animated.Value(initialValue))
  ).current;

  const animateIn = useCallback(
    (toValue: number = 1, duration: number = DURATIONS.NORMAL) => {
      const staggeredAnimations = animations.map((anim, index) =>
        Animated.timing(anim, {
          toValue,
          duration,
          delay: index * staggerDelay,
          useNativeDriver: true,
        })
      );
      return Animated.parallel(staggeredAnimations);
    },
    [animations, staggerDelay]
  );

  const animateOut = useCallback(
    (toValue: number = 0, duration: number = DURATIONS.NORMAL) => {
      const staggeredAnimations = animations.map((anim, index) =>
        Animated.timing(anim, {
          toValue,
          duration,
          delay: index * staggerDelay,
          useNativeDriver: true,
        })
      );
      return Animated.parallel(staggeredAnimations);
    },
    [animations, staggerDelay]
  );

  const reset = useCallback(() => {
    animations.forEach(anim => anim.setValue(initialValue));
  }, [animations, initialValue]);

  return {
    animations,
    animateIn,
    animateOut,
    reset,
  };
};

// ============= Parallax Animation Hook =============
interface UseParallaxAnimationOptions {
  inputRange?: number[];
  outputRange?: number[];
}

export const useParallaxAnimation = (
  scrollY: Animated.Value,
  options: UseParallaxAnimationOptions = {}
) => {
  const { inputRange = [0, 200], outputRange = [0, -50] } = options;

  const parallaxTranslateY = scrollY.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });

  const parallaxOpacity = scrollY.interpolate({
    inputRange,
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const parallaxScale = scrollY.interpolate({
    inputRange,
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return {
    parallaxTranslateY,
    parallaxOpacity,
    parallaxScale,
  };
};

// ============= Swipe Animation Hook =============
interface UseSwipeAnimationOptions {
  threshold?: number;
  maxTranslation?: number;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
}

export const useSwipeAnimation = (options: UseSwipeAnimationOptions = {}) => {
  const { threshold = 50, maxTranslation = 200, onSwipeComplete } = options;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const toValue = direction === 'left' ? -maxTranslation : maxTranslation;

      Animated.parallel([
        Animated.timing(translateX, {
          toValue,
          duration: DURATIONS.SWIPE_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: DURATIONS.SWIPE_OUT,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onSwipeComplete?.(direction);
      });
    },
    [translateX, opacity, maxTranslation, onSwipeComplete]
  );

  const snapBack = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        ...SPRING_CONFIGS.SNAP_BACK,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATIONS.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, opacity]);

  const reset = useCallback(() => {
    translateX.setValue(0);
    opacity.setValue(1);
  }, [translateX, opacity]);

  return {
    translateX,
    opacity,
    animateSwipe,
    snapBack,
    reset,
    threshold,
  };
};

// ============= Loading Skeleton Animation Hook =============
export const useSkeletonAnimation = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmer]);

  const shimmerTranslateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.5, 0.3],
  });

  return {
    shimmer,
    shimmerTranslateX,
    shimmerOpacity,
  };
};
