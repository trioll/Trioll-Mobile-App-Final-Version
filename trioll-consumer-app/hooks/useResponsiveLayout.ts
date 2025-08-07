import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ResponsiveLayout {
  isPortrait: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  isLargePhone: boolean;
  isCompact: boolean;
  width: number;
  height: number;
  // Layout configurations
  columns: number;
  containerPadding: number;
  sectionSpacing: number;
  cardPadding: number;
  statsColumns: number;
  // Feature flags
  showCompactStats: boolean;
  showInlineLevel: boolean;
  useHorizontalFriends: boolean;
  collapseSections: boolean;
}

export const useResponsiveLayout = (): ResponsiveLayout => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isPortrait = height > width;
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isLargePhone = width >= 414;
  const isCompact = !isTablet && isLandscape;

  // Calculate responsive values
  const columns = isTablet ? 3 : isLandscape ? 2 : 1;
  const containerPadding = isTablet ? 32 : isCompact ? 16 : 20;
  const sectionSpacing = isTablet ? 24 : isCompact ? 8 : 12;
  const cardPadding = isTablet ? 20 : isCompact ? 12 : 16;
  const statsColumns = isTablet ? 3 : 2;

  // Feature flags based on layout
  const showCompactStats = !isTablet || isCompact;
  const showInlineLevel = !isTablet;
  const useHorizontalFriends = !isTablet || isLandscape;
  const collapseSections = isPortrait && !isTablet;

  return {
    isPortrait,
    isLandscape,
    isTablet,
    isLargePhone,
    isCompact,
    width,
    height,
    columns,
    containerPadding,
    sectionSpacing,
    cardPadding,
    statsColumns,
    showCompactStats,
    showInlineLevel,
    useHorizontalFriends,
    collapseSections,
  };
};

// Breakpoint constants
export const BREAKPOINTS = {
  phone: 375,
  phoneLarge: 414,
  tablet: 768,
  desktop: 1024,
} as const;

// Responsive spacing helper
export const getResponsiveSpacing = (layout: ResponsiveLayout) => ({
  xs: layout.isCompact ? 4 : 8,
  sm: layout.isCompact ? 8 : 12,
  md: layout.isCompact ? 12 : 16,
  lg: layout.isCompact ? 16 : 24,
  xl: layout.isCompact ? 20 : 32,
  xxl: layout.isCompact ? 24 : 48,
});