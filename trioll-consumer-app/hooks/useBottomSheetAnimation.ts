import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface UseBottomSheetAnimationParams {
  minY: number;
  maxY: number;
  onPositionChange?: (progress: number) => void;
}

export const useBottomSheetAnimation = ({
  minY,
  maxY,
  onPositionChange,
}: UseBottomSheetAnimationParams) => {
  const translateY = useRef(new Animated.Value(maxY)).current;

  const animateToPosition = useCallback(
    (toValue: number, config?: Partial<Animated.SpringAnimationConfig>) => {
      return new Promise<void>((resolve) => {
        Animated.spring(translateY, {
          toValue,
          tension: 200,
          friction: 30,
          useNativeDriver: true,
          ...config,
        }).start(() => {
          const progress = (maxY - toValue) / (maxY - minY);
          onPositionChange?.(progress);
          resolve();
        });
      });
    },
    [translateY, minY, maxY, onPositionChange]
  );

  const interpolate = useCallback(
    (outputRange: number[]) => {
      return translateY.interpolate({
        inputRange: [minY, maxY],
        outputRange,
        extrapolate: 'clamp',
      });
    },
    [translateY, minY, maxY]
  );

  return {
    translateY,
    animateToPosition,
    interpolate,
  };
};