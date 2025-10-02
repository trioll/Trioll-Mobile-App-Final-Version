import { Dimensions, PixelRatio } from 'react-native';

// Get current dimensions
const { width, height } = Dimensions.get('window');

// Responsive padding system based on screen size
export const responsivePadding = {
  // Extra small - 4px on base device
  xs: width < 375 ? 2 : width > 430 ? 6 : 4,
  
  // Small - 8px on base device
  sm: width < 375 ? 6 : width > 430 ? 10 : 8,
  
  // Medium - 16px on base device
  md: width < 375 ? 12 : width > 430 ? 20 : 16,
  
  // Large - 24px on base device
  lg: width < 375 ? 20 : width > 430 ? 28 : 24,
  
  // Extra large - 40px on base device
  xl: width < 375 ? 32 : width > 430 ? 48 : 40,
  
  // Double extra large - 80px on base device
  xxl: width < 375 ? 60 : width > 430 ? 96 : 80,
};

// Responsive spacing for margins and gaps
export const responsiveSpacing = {
  // Tight spacing - 4px
  tight: width < 375 ? 3 : width > 430 ? 5 : 4,
  
  // Normal spacing - 8px
  normal: width < 375 ? 6 : width > 430 ? 10 : 8,
  
  // Relaxed spacing - 12px
  relaxed: width < 375 ? 10 : width > 430 ? 14 : 12,
  
  // Loose spacing - 16px
  loose: width < 375 ? 14 : width > 430 ? 18 : 16,
  
  // Extra loose - 24px
  extraLoose: width < 375 ? 20 : width > 430 ? 28 : 24,
};

// Font sizes that scale with device
export const responsiveFontSize = (size: number): number => {
  const scale = width / 375; // Base on iPhone SE width
  const newSize = size * scale;
  
  // Round to nearest pixel for crisp rendering
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Device size checks
export const isSmallDevice = height < 700;
export const isMediumDevice = height >= 700 && height < 850;
export const isLargeDevice = height >= 850;

// Screen dimension helpers
export const screenWidth = width;
export const screenHeight = height;

// Safe area helpers (approximations - use useSafeAreaInsets for precise values)
export const getStatusBarHeight = () => {
  // iOS notch devices
  if (height >= 812) return 44;
  // Regular iOS
  return 20;
};

export const getBottomInset = () => {
  // iOS devices with home indicator
  if (height >= 812) return 34;
  return 0;
};

// Responsive value calculator
// Usage: responsiveValue(12, 16, 20) returns value based on device size
export const responsiveValue = (
  small: number,
  medium: number,
  large: number
): number => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

// Percentage-based dimensions
export const wp = (percentage: number): number => {
  return (width * percentage) / 100;
};

export const hp = (percentage: number): number => {
  return (height * percentage) / 100;
};

// Min/max constraints
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
