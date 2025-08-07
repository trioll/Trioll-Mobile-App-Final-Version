import { Animated } from 'react-native';

export const BOTTOM_SHEET_CONFIG = {
  // Spring animation config for smooth iOS-like feel
  SPRING: {
    tension: 200,
    friction: 30,
    useNativeDriver: true,
  } as Animated.SpringAnimationConfig,
  
  // Gesture thresholds
  SWIPE_THRESHOLD: 2,
  VELOCITY_THRESHOLD: 0.3,
  
  // Visual constants
  HEADER_HEIGHT: 60,
  COLLAPSED_HEIGHT: 55,
  TAB_BORDER_RADIUS: 28,
  HANDLE_WIDTH: 40,
  HANDLE_HEIGHT: 4,
  
  // Animation breakpoints
  TAB_APPEAR_THRESHOLD: 0.3, // 30% expansion
  CONTENT_FADE_START: 0.3,
  CONTENT_FADE_END: 0.7,
  
  // Rubber band effect
  OVERSCROLL_RESISTANCE: 0.3,
};

export const SNAP_POINTS = {
  COLLAPSED: 0,
  HALF: 0.5,
  EXPANDED: 1,
};