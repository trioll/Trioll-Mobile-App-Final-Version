// TRIOLL DESIGN SYSTEM - Glassmorphic UI
// This is the single source of truth for all styling in the app

export const TriollDesignSystem = {
  // Core Colors
  colors: {
    // Backgrounds
    background: '#0f1419', // Deep blue-black
    surface: 'rgba(255, 255, 255, 0.03)', // Glass surface
    surfaceElevated: 'rgba(255, 255, 255, 0.05)', // Elevated glass
    border: 'rgba(255, 255, 255, 0.05)', // Subtle borders
    borderLight: 'rgba(255, 255, 255, 0.08)', // Lighter borders for focus
    
    // Text hierarchy
    textPrimary: 'rgba(255, 255, 255, 0.9)',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    textDisabled: 'rgba(255, 255, 255, 0.3)',
    
    // Primary palette (monochromatic blue)
    primary: '#93c5fd', // Soft blue
    primaryLight: '#c4b5fd',
    primaryDark: '#a5b4fc',
    primaryMuted: 'rgba(147, 197, 253, 0.5)',
    
    // Single accent (cyan for CTAs only)
    accent: '#00e5ff', // Neon cyan - ONLY for primary CTAs
    accentGlow: 'rgba(0, 229, 255, 0.3)',
    accentMuted: 'rgba(0, 229, 255, 0.15)',
    
    // Semantic colors
    success: 'rgba(0, 255, 136, 0.8)',
    successMuted: 'rgba(0, 255, 136, 0.2)',
    warning: 'rgba(255, 107, 107, 0.8)',
    warningMuted: 'rgba(255, 107, 107, 0.2)',
    error: 'rgba(255, 59, 48, 0.8)',
    errorMuted: 'rgba(255, 59, 48, 0.2)',
    
    // Category colors (subtle monochromatic variations)
    categories: {
      action: 'rgba(147, 197, 253, 0.9)',
      puzzle: 'rgba(147, 197, 253, 0.85)',
      strategy: 'rgba(147, 197, 253, 0.8)',
      racing: 'rgba(147, 197, 253, 0.75)',
      sports: 'rgba(147, 197, 253, 0.7)',
      casual: 'rgba(147, 197, 253, 0.65)',
      rpg: 'rgba(147, 197, 253, 0.6)',
      simulation: 'rgba(147, 197, 253, 0.55)',
      adventure: 'rgba(147, 197, 253, 0.5)',
    }
  },
  
  // Spacing (8pt grid) - More generous for readability
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Typography
  typography: {
    h1: { 
      fontSize: 24, 
      fontWeight: '300' as const, 
      letterSpacing: -0.02,
      lineHeight: 32,
    },
    h2: { 
      fontSize: 19, 
      fontWeight: '400' as const, 
      letterSpacing: -0.01,
      lineHeight: 26,
    },
    h3: { 
      fontSize: 16, 
      fontWeight: '500' as const, 
      letterSpacing: -0.01,
      lineHeight: 22,
    },
    body: { 
      fontSize: 14, 
      fontWeight: '400' as const, 
      letterSpacing: -0.01,
      lineHeight: 20,
    },
    small: { 
      fontSize: 12, 
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    caption: { 
      fontSize: 11, 
      fontWeight: '400' as const, 
      textTransform: 'uppercase' as const, 
      letterSpacing: 0.05,
      lineHeight: 14,
    },
  },
  
  // Effects
  effects: {
    // Border radius - Flat GPT-style minimal design
    borderRadius: 3,
    borderRadiusSmall: 2,
    borderRadiusMedium: 3,
    borderRadiusLarge: 4,
    borderRadiusPill: 4,
    borderRadiusCircle: 999,
    
    // Glass effects - More subtle and refined
    glassSurface: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(24px) saturate(160%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    
    glassSurfaceElevated: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(32px) saturate(180%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    
    // Shadows - Softer and more minimal
    shadowElevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    
    shadowMedium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    
    shadowSubtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    
    // Neon glow - More subtle for elegance
    neonGlow: {
      shadowColor: '#00e5ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 4,
    },
    
    // Inner shadow for depth
    innerShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    }
  },
  
  // Animations
  animations: {
    duration: {
      instant: 0,
      fast: 150,
      normal: 250,
      slow: 350,
      verySlow: 500,
    },
    easing: {
      // These will be used with react-native-reanimated
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
    }
  },
  
  // Layout
  layout: {
    screenPadding: 16,
    cardPadding: 16,
    buttonHeight: {
      small: 36,
      medium: 44,
      large: 52,
    },
    inputHeight: 44,
    iconSize: {
      small: 16,
      medium: 20,
      large: 24,
    },
    borderWidth: 1,
  }
};

// Helper functions
export const glassSurface = (opacity: number = 0.03) => ({
  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(40px) saturate(180%)',
  borderWidth: 0.5,
  borderColor: 'rgba(255, 255, 255, 0.05)',
});

export const glassButton = (variant: 'primary' | 'secondary' = 'secondary') => {
  const isPrimary = variant === 'primary';
  return {
    ...TriollDesignSystem.effects.glassSurface,
    height: TriollDesignSystem.layout.buttonHeight.medium,
    paddingHorizontal: TriollDesignSystem.spacing.lg,
    borderRadius: TriollDesignSystem.effects.borderRadiusSmall,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...(isPrimary && {
      backgroundColor: TriollDesignSystem.colors.accent,
      borderColor: 'rgba(0, 229, 255, 0.3)',
      ...TriollDesignSystem.effects.neonGlow,
    }),
  };
};

export const glassInput = () => ({
  ...TriollDesignSystem.effects.glassSurface,
  height: TriollDesignSystem.layout.inputHeight,
  paddingHorizontal: TriollDesignSystem.spacing.sm,
  borderRadius: TriollDesignSystem.effects.borderRadiusSmall,
  color: TriollDesignSystem.colors.textPrimary,
  fontSize: TriollDesignSystem.typography.body.fontSize,
});

// Type exports for TypeScript
export type ColorKeys = keyof typeof TriollDesignSystem.colors;
export type SpacingKeys = keyof typeof TriollDesignSystem.spacing;
export type TypographyKeys = keyof typeof TriollDesignSystem.typography;

// Short alias for convenience
export const DS = TriollDesignSystem;