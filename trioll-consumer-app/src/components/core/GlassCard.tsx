import React from 'react';
import { 
  View, 
  ViewStyle, 
  StyleSheet, 
  TouchableOpacity,
  TouchableOpacityProps
} from 'react-native';
import { DS } from '../../styles/TriollDesignSystem';

interface GlassCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'surface' | 'elevated' | 'interactive';
  padding?: 'none' | 'small' | 'medium' | 'large';
  noBorder?: boolean;
  noShadow?: boolean;
  glowOnHover?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'surface',
  padding = 'medium',
  noBorder = false,
  noShadow = false,
  glowOnHover = false,
  style,
  disabled,
  onPress,
  ...props
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderWidth: 1,
          borderColor: DS.colors.borderLight,
          ...(!noShadow && {
            ...DS.effects.shadowElevated,
            shadowOpacity: 0.12,
          }),
        };
      case 'interactive':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderWidth: 1,
          borderColor: DS.colors.border,
          ...(!noShadow && DS.effects.shadowMedium),
          ...(isPressed && {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: DS.colors.borderLight,
            transform: [{ scale: 0.98 }],
          }),
        };
      case 'surface':
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderWidth: 1,
          borderColor: DS.colors.border,
          ...(!noShadow && DS.effects.shadowSubtle),
        };
    }
  };

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: DS.spacing.md };
      case 'large':
        return { padding: DS.spacing.xl };
      case 'medium':
      default:
        return { padding: DS.spacing.lg };
    }
  };

  const cardStyle = [
    styles.base,
    getVariantStyle(),
    getPaddingStyle(),
    noBorder && styles.noBorder,
    glowOnHover && styles.glowReady,
    disabled && styles.disabled,
    style,
  ];

  // If onPress is provided, use TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        {...props}
        style={cardStyle}
        onPress={onPress}
        onPressIn={() => variant === 'interactive' && setIsPressed(true)}
        onPressOut={() => variant === 'interactive' && setIsPressed(false)}
        activeOpacity={variant === 'interactive' ? 1 : 0.8}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Otherwise, use a regular View
  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
    minHeight: DS.spacing.xxxl,
  },
  noBorder: {
    borderWidth: 0,
  },
  glowReady: {
    // This would be enhanced with hover states in web
    // For mobile, we rely on touch states
  },
  disabled: {
    opacity: 0.5,
  },
});