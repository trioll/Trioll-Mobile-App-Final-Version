import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { responsivePadding } from '../../../utils/responsive';

type PaddingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  padding?: PaddingSize;
  paddingHorizontal?: PaddingSize;
  paddingVertical?: PaddingSize;
  style?: ViewStyle;
}

/**
 * ResponsiveContainer - Wrapper that provides responsive padding based on device size
 * 
 * @example
 * ```tsx
 * <ResponsiveContainer padding="lg">
 *   <Text>Content with responsive padding</Text>
 * </ResponsiveContainer>
 * ```
 * 
 * @example
 * ```tsx
 * <ResponsiveContainer paddingHorizontal="md" paddingVertical="xl">
 *   <Text>Content with different horizontal/vertical padding</Text>
 * </ResponsiveContainer>
 * ```
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  padding,
  paddingHorizontal,
  paddingVertical,
  style,
}) => {
  const containerStyle: ViewStyle = {
    ...(padding && {
      padding: responsivePadding[padding],
    }),
    ...(paddingHorizontal && {
      paddingHorizontal: responsivePadding[paddingHorizontal],
    }),
    ...(paddingVertical && {
      paddingVertical: responsivePadding[paddingVertical],
    }),
  };

  return <View style={[containerStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  // No static styles needed - all dynamic
});
