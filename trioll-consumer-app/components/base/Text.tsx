import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

// Simple theme constants
const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

const fontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

interface CustomTextProps extends RNTextProps {
  size?: keyof typeof fontSize;
  weight?: keyof typeof fontWeight;
  color?: string;
  center?: boolean;
  variant?: 'body' | 'caption';
  style?: TextStyle | TextStyle[];
}

export const Text: React.FC<CustomTextProps> = ({
  style,
  size = 'base',
  weight = 'normal',
  color = '#000000',
  center,
  variant = 'body',
  ...props
}) => {
  const computedStyle: TextStyle = {
    fontSize: fontSize[size],
    fontWeight: fontWeight[weight],
    color: color,
    ...(center && { textAlign: 'center' }),
    ...(variant === 'caption' && {
      fontSize: fontSize.sm,
      color: color || '#666666',
    }),
  };

  return <RNText style={[computedStyle, style]} {...props} />;
};
