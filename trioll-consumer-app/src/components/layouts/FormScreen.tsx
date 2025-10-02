import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScreen } from './KeyboardAwareScreen';
import { responsivePadding } from '../../../utils/responsive';

type PaddingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface FormScreenProps {
  title?: string;
  children: React.ReactNode;
  onBack?: () => void;
  padding?: PaddingSize;
  scrollable?: boolean;
  headerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  showBackButton?: boolean;
}

/**
 * FormScreen - Standard form screen layout
 * Includes: SafeAreaView + optional header with back button + KeyboardAwareScreen
 * 
 * @example
 * ```tsx
 * <FormScreen 
 *   title="Login" 
 *   onBack={() => navigation.goBack()}
 *   padding="lg"
 * >
 *   <TextInput placeholder="Email" />
 *   <TextInput placeholder="Password" />
 *   <Button title="Submit" />
 * </FormScreen>
 * ```
 * 
 * @example
 * ```tsx
 * // Without header
 * <FormScreen padding="md" showBackButton={false}>
 *   <CustomHeader />
 *   <FormContent />
 * </FormScreen>
 * ```
 */
export const FormScreen: React.FC<FormScreenProps> = ({
  title,
  children,
  onBack,
  padding = 'lg',
  scrollable = true,
  headerStyle,
  contentStyle,
  showBackButton = true,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {(title || showBackButton) && (
        <View style={[styles.header, headerStyle]}>
          {showBackButton && onBack && (
            <Pressable onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          {showBackButton && <View style={styles.spacer} />}
        </View>
      )}
      
      <KeyboardAwareScreen
        scrollable={scrollable}
        padding={padding}
        contentContainerStyle={contentStyle}
      >
        {children}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsivePadding.md,
    paddingVertical: responsivePadding.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  spacer: {
    width: 44,
  },
});
