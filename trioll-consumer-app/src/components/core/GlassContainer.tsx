import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { DS } from '../../styles/TriollDesignSystem';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'surface' | 'elevated' | 'transparent' | 'subtle';
  noBorder?: boolean;
  noShadow?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  style,
  variant = 'surface',
  noBorder = false,
  noShadow = false,
  intensity = 'medium',
}) => {
  const getVariantStyle = (): ViewStyle => {
    const intensityMultiplier = intensity === 'light' ? 0.5 : intensity === 'strong' ? 1.5 : 1;
    
    switch (variant) {
      case 'elevated':
        return {
          ...DS.effects.glassSurfaceElevated,
          backgroundColor: `rgba(255, 255, 255, ${0.04 * intensityMultiplier})`,
          ...(!noShadow && DS.effects.shadowElevated),
        };
      case 'subtle':
        return {
          backgroundColor: `rgba(255, 255, 255, ${0.01 * intensityMultiplier})`,
          borderWidth: 0,
          ...(!noShadow && DS.effects.shadowSubtle),
        };
      case 'transparent':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'surface':
      default:
        return {
          ...DS.effects.glassSurface,
          backgroundColor: `rgba(255, 255, 255, ${0.02 * intensityMultiplier})`,
          ...(!noShadow && DS.effects.shadowSubtle),
        };
    }
  };

  const containerStyle = [
    styles.base,
    getVariantStyle(),
    noBorder && styles.noBorder,
    style,
  ];

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: DS.effects.borderRadius,
    overflow: 'hidden',
    // Add minimum padding for better readability
    minHeight: DS.spacing.xl,
  },
  noBorder: {
    borderWidth: 0,
  },
});