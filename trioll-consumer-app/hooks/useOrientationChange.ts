import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useOrientation } from './useOrientation';

interface OrientationChangeHandler {
  onPortrait?: () => void;
  onLandscape?: () => void;
  onChange?: (orientation: 'portrait' | 'landscape') => void;
}

export const useOrientationChange = (handlers: OrientationChangeHandler) => {
  const { orientation } = useOrientation();
  const previousOrientation = useRef(orientation);

  useEffect(() => {
    if (previousOrientation.current !== orientation) {
      // Orientation changed
      handlers.onChange?.(orientation);
      
      if (orientation === 'portrait') {
        handlers.onPortrait?.();
      } else {
        handlers.onLandscape?.();
      }
      
      previousOrientation.current = orientation;
    }
  }, [orientation, handlers]);

  return orientation;
};