import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { responsivePadding } from '../../../utils/responsive';

type PaddingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: PaddingSize;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  bounces?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

/**
 * KeyboardAwareScreen - Combines ScrollView + KeyboardAvoidingView pattern
 * Already includes responsive padding
 * 
 * @example
 * ```tsx
 * // For form screens with scrollable content
 * <KeyboardAwareScreen scrollable padding="lg">
 *   <TextInput placeholder="Email" />
 *   <TextInput placeholder="Password" />
 * </KeyboardAwareScreen>
 * ```
 * 
 * @example
 * ```tsx
 * // For non-scrollable screens
 * <KeyboardAwareScreen padding="md">
 *   <View>Content that doesn't need scrolling</View>
 * </KeyboardAwareScreen>
 * ```
 */
export const KeyboardAwareScreen: React.FC<KeyboardAwareScreenProps> = ({
  children,
  scrollable = true,
  padding = 'md',
  style,
  contentContainerStyle,
  bounces = false,
  keyboardShouldPersistTaps = 'handled',
}) => {
  const paddingValue = responsivePadding[padding];

  const containerStyle: ViewStyle = {
    flex: 1,
    ...(scrollable && { flexGrow: 1 }),
  };

  const contentStyle: ViewStyle = {
    padding: paddingValue,
    ...contentContainerStyle,
  };

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={[styles.keyboardView, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[containerStyle, contentStyle]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          bounces={bounces}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, contentStyle, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
});
