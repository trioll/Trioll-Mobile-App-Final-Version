import React, { useRef, useState } from 'react';
import { View, PanResponder, Animated, StyleSheet, ViewStyle } from 'react-native';

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  step?: number;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: ViewStyle;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  step = 1,
  minimumTrackTintColor = '#6366f1',
  maximumTrackTintColor = '#333',
  thumbTintColor = '#6366f1',
  style,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(value)).current;

  const percentage = (value - minimumValue) / (maximumValue - minimumValue);
  const thumbPosition = percentage * containerWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Handle start of gesture
      },
      onPanResponderMove: (evt, gestureState) => {
        const newPosition = Math.max(0, Math.min(containerWidth, gestureState.moveX));
        const newPercentage = newPosition / containerWidth;
        const rawValue = minimumValue + newPercentage * (maximumValue - minimumValue);
        const steppedValue = Math.round(rawValue / step) * step;
        const clampedValue = Math.max(minimumValue, Math.min(maximumValue, steppedValue));

        animatedValue.setValue(clampedValue);
        onValueChange(clampedValue);
      },
      onPanResponderRelease: () => {
        // Handle end of gesture
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, style]}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <View
          style={[
            styles.minimumTrack,
            {
              width: `${percentage * 100}%`,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            left: thumbPosition - 12,
            backgroundColor: thumbTintColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
  },
  minimumTrack: {
    position: 'absolute',
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
