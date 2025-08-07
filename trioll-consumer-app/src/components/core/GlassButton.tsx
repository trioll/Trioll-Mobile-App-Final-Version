import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ViewStyle, 
  TextStyle, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacityProps 
} from 'react-native';
import { DS } from '../../styles/TriollDesignSystem';

interface GlassButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  glowEffect?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'medium',
  glowEffect = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: DS.colors.accent,
          borderColor: 'transparent',
          borderWidth: 0,
          ...(glowEffect && {
            ...DS.effects.neonGlow,
            shadowOpacity: 0.4,
          }),
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: DS.colors.borderLight,
          borderWidth: 1,
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: DS.colors.borderLight,
          borderWidth: 1,
          ...(!disabled && DS.effects.shadowSubtle),
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          height: DS.layout.buttonHeight.small,
          paddingHorizontal: DS.spacing.lg,
          minWidth: DS.layout.buttonHeight.small * 2,
        };
      case 'large':
        return {
          height: DS.layout.buttonHeight.large,
          paddingHorizontal: DS.spacing.xxl,
          minWidth: DS.layout.buttonHeight.large * 3,
        };
      case 'medium':
      default:
        return {
          height: DS.layout.buttonHeight.medium,
          paddingHorizontal: DS.spacing.xl,
          minWidth: DS.layout.buttonHeight.medium * 2.5,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      small: {
        fontSize: 14,
        letterSpacing: 0.5,
      },
      medium: {
        fontSize: 16,
        letterSpacing: 0.75,
      },
      large: {
        fontSize: 18,
        letterSpacing: 1,
      },
    };

    const baseStyle = {
      ...sizeStyles[size],
      fontWeight: '600' as const,
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: DS.colors.background,
          fontWeight: '700' as const,
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: DS.colors.textSecondary,
        };
      case 'secondary':
      default:
        return {
          ...baseStyle,
          color: DS.colors.textPrimary,
        };
    }
  };

  const buttonStyle = [
    styles.base,
    getVariantStyle(),
    getSizeStyle(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const finalTextStyle = [
    getTextStyle(),
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      activeOpacity={variant === 'primary' ? 0.8 : 0.6}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? DS.colors.background : DS.colors.textPrimary} 
        />
      ) : (
        <Text style={finalTextStyle}>
          {typeof children === 'string' ? children : children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: DS.effects.borderRadiusPill,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: DS.colors.textDisabled,
  },
});