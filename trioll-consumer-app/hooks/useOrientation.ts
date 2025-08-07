import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type Orientation = 'portrait' | 'landscape';

export interface OrientationData {
  orientation: Orientation;
  width: number;
  height: number;
  isPortrait: boolean;
}

export const useOrientation = (): OrientationData => {
  const [orientationData, setOrientationData] = useState<OrientationData>(() => {
    const { width, height } = Dimensions.get('window');
    const isPortrait = height >= width;
    return {
      orientation: isPortrait ? 'portrait' : 'landscape',
      width,
      height,
      isPortrait,
    };
  });

  useEffect(() => {
    const updateOrientation = ({ window }: { window: ScaledSize }) => {
      const { width, height } = window;
      const isPortrait = height >= width;
      setOrientationData({
        orientation: isPortrait ? 'portrait' : 'landscape',
        width,
        height,
        isPortrait,
      });
    };

    const subscription = Dimensions.addEventListener('change', updateOrientation);

    return () => {
      subscription?.remove();
    };
  }, []);

  return orientationData;
};