import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';
import { useHaptics } from '../../hooks/useHaptics';

interface ScreenErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  screenName: string;
  fallbackRoute?: string;
  showHomeButton?: boolean;
  customActions?: Array<{
    label: string;
    onPress: () => void;
    icon?: string;
  }>;
}

export const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({
  children,
  screenName,
  fallbackRoute,
  showHomeButton = true,
  customActions = [],
  ...props
}) => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  const handleGoHome = () => {
    haptics.impact('light');
    navigation.navigate('Feed' as never as never);
  };

  const handleGoBack = () => {
    haptics.impact('light');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      handleGoHome();
    }
  };

  const handleFallbackRoute = () => {
    haptics.impact('light');
    if (fallbackRoute) {
      navigation.navigate(fallbackRoute as never as never);
    }
  };

  const renderScreenFallback = (error: Error, resetError: () => void) => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        </View>

        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.screenName}>{screenName}</Text>

        <Text style={styles.message}>
          We encountered an error while loading this screen. You can try again or navigate
          elsewhere.
        </Text>

        {__DEV__ && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorMessage}>{error.toString()}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => {
              haptics.impact('light');
              resetError();
            }}
            style={styles.primaryButton}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          {navigation.canGoBack() && (
            <TouchableOpacity onPress={handleGoBack} style={styles.secondaryButton}>
              <Ionicons name="arrow-back" size={20} color="#999999" />
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}

          {fallbackRoute && (
            <TouchableOpacity onPress={handleFallbackRoute} style={styles.secondaryButton}>
              <Ionicons name="navigate" size={20} color="#999999" />
              <Text style={styles.secondaryButtonText}>Go to {fallbackRoute}</Text>
            </TouchableOpacity>
          )}

          {showHomeButton && (
            <TouchableOpacity onPress={handleGoHome} style={styles.secondaryButton}>
              <Ionicons name="home" size={20} color="#999999" />
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          )}

          {customActions.map((action, index) => (
            <TouchableOpacity key={index} onPress={action.onPress} style={styles.secondaryButton}>
              {action.icon && <Ionicons name={action.icon as any} size={20} color="#999999" />}
              <Text style={styles.secondaryButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.errorCode}>
          Error Code: {screenName}-{Date.now().toString(36)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <ErrorBoundary {...props} level="screen" context={screenName} fallback={renderScreenFallback}>
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  screenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'monospace',
  },
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  errorCode: {
    fontSize: 12,
    color: '#666666',
    marginTop: 24,
    fontFamily: 'monospace',
  },
});
