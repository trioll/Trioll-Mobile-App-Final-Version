// Animation timing constants
export const ANIMATION_TIMING = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  VERY_SLOW: 400,
  EXTRA_SLOW: 600,
} as const;

// Spring animation presets
export const SPRING_CONFIG = {
  BOUNCY: {
    tension: 180,
    friction: 12,
    velocity: 2,
  },
  NORMAL: {
    tension: 170,
    friction: 14,
  },
  TIGHT: {
    tension: 200,
    friction: 20,
  },
  SOFT: {
    tension: 100,
    friction: 10,
  },
  QUICK: {
    tension: 250,
    friction: 15,
  },
  PANEL: {
    tension: 150,
    friction: 18,
  },
  SWIPE: {
    tension: 140,
    friction: 14,
  },
  SNAP_BACK: {
    tension: 280,
    friction: 25,
  },
};

// Keep legacy SPRING_CONFIG for backward compatibility
export const SPRING_CONFIGS = SPRING_CONFIG;

// Original SPRING_CONFIG for components that use the old structure
export const LEGACY_SPRING_CONFIG = {
  // Bouncy spring for likes, ratings, etc.
  BOUNCY: {
    tension: 200,
    friction: 5,
    velocity: 10,
  },
  // Normal spring for UI elements
  NORMAL: {
    tension: 80,
    friction: 6,
    velocity: 1,
  },
  // Tight spring for precise animations
  TIGHT: {
    tension: 300,
    friction: 10,
    velocity: 0,
  },
  // Soft spring for gentle animations
  SOFT: {
    tension: 40,
    friction: 10,
    velocity: 0,
  },
  // Quick spring for responsive interactions
  QUICK: {
    tension: 400,
    friction: 6,
    velocity: 3,
  },
  // Panel/sheet animations
  PANEL: {
    tension: 45,
    friction: 8,
    velocity: 3,
  },
  // Swipe/gesture animations
  SWIPE: {
    tension: 60,
    friction: 11,
    velocity: -2,
  },
  // Snap back animations
  SNAP_BACK: {
    tension: 40,
    friction: 5,
    velocity: 0,
  },
} as const;

// Common animation durations
export const DURATIONS = {
  SWIPE_OUT: 200,
  FADE: 200,
  SCALE: 300,
  BLUR: 150,
  DELAY_SHORT: 50,
  DELAY_MEDIUM: 100,
  DELAY_LONG: 200,
  FAST: 150,
  NORMAL: 200,
  SLOW: 400,
  RELAXED: 500,
} as const;

// Common scale values
export const SCALE_VALUES = {
  PRESSED: 0.9,
  HOVER: 1.05,
  BOUNCE: 1.2,
  BOUNCE_LARGE: 1.3,
  CARD_NEXT: 0.95,
  CARD_BEHIND: 0.98,
} as const;

// Common opacity values
export const OPACITY_VALUES = {
  HIDDEN: 0,
  FADED: 0.3,
  HALF: 0.5,
  LIGHT: 0.7,
  VISIBLE: 1,
  CARD_NEXT: 0.7,
  GLOW: 0.8,
} as const;

// Haptic feedback delays
export const HAPTIC_TIMING = {
  IMMEDIATE: 1,
  SHORT: 5,
  MEDIUM: 10,
  DOUBLE: [1, 10, 50, 10] as const,
} as const;
