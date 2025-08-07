import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';
import { useHaptics } from '../../hooks/useHaptics';

interface AsyncErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  retryDelay?: number;
  maxRetries?: number;
  onRetry?: () => Promise<void>;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  retryDelay = 1000,
  maxRetries = 3,
  onRetry,
  loadingComponent,
  emptyComponent,
  ...props
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const haptics = useHaptics();

  const handleRetry = async (resetError: () => void) => {
    haptics.impact('light');

    if (retryCount >= maxRetries) {
      haptics.error();
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));

    try {
      if (onRetry) {
        await onRetry();
      }
      resetError();
      setLastError(null);
      setRetryCount(0);
    } catch (error) {
      setLastError(error as Error);
    } finally {
      setIsRetrying(false);
    }
  };

  const renderAsyncFallback = (error: Error, resetError: () => void) => {
    // Check if it's a network error
    const isNetworkError =
      (error as any).message.toLowerCase().includes('network') ||
      (error as any).message.toLowerCase().includes('fetch') ||
      (error as any).message.toLowerCase().includes('timeout');

    // Check if it's an empty state error
    const isEmptyError =
      (error as any).message.toLowerCase().includes('not found') ||
      (error as any).message.toLowerCase().includes('empty');

    if (isEmptyError && emptyComponent) {
      return emptyComponent;
    }

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isNetworkError ? 'cloud-offline-outline' : 'warning-outline' as any}
              size={48}
              color="#FF6B6B"
            />
          </View>

          <Text style={styles.title}>
            {isNetworkError ? 'Connection Problem' : 'Loading Error'}
          </Text>

          <Text style={styles.message}>
            {isNetworkError
              ? 'Please check your internet connection and try again.'
              : 'We encountered an error while loading this content.'}
          </Text>

          {__DEV__ && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>{error.toString()}</Text>
            </View>
          )}

          {isRetrying ? (
            <View style={styles.retryingContainer}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.retryingText}>
                Retrying... (Attempt {retryCount} of {maxRetries})
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleRetry(resetError)}
                style={[styles.retryButton, retryCount >= maxRetries && styles.retryButtonDisabled]}
                disabled={retryCount >= maxRetries}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>
                  {retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again'}
                </Text>
              </TouchableOpacity>

              {retryCount > 0 && (
                <Text style={styles.retryInfo}>{maxRetries - retryCount} retries remaining</Text>
              )}
            </View>
          )}

          {isNetworkError && (
            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
              <Text style={styles.tipItem}>• Check your Wi-Fi or mobile data</Text>
              <Text style={styles.tipItem}>• Try moving to a better signal area</Text>
              <Text style={styles.tipItem}>• Restart the app if the problem persists</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Reset retry count when error clears
  useEffect(() => {
    if (!lastError) {
      setRetryCount(0);
    }
  }, [lastError]);

  if (isRetrying && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <ErrorBoundary {...props} fallback={renderAsyncFallback} onError={error => setLastError(error as any)}>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: 'monospace',
  },
  actions: {
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.6,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  retryInfo: {
    fontSize: 14,
    color: '#666666',
  },
  retryingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryingText: {
    fontSize: 14,
    color: '#999999',
  },
  tips: {
    marginTop: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
});
