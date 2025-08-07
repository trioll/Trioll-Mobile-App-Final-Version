import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getLogger } from '../../src/utils/logger';
import { analyticsService } from '../../src/services/analytics/analyticsService';
import { crashReportingService } from '../../src/services/monitoring/crashReportingService';
import { errorMonitoringService } from '../../src/services/monitoring/errorMonitoringService';
import * as Updates from 'expo-updates';

const logger = getLogger('ErrorBoundary');

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDevInfo?: boolean;
  level?: 'global' | 'screen' | 'component';
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

const ERROR_RESET_THRESHOLD = 3; // Max errors before forcing app restart
const ERROR_TIME_WINDOW = 60000; // 1 minute

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component', context = 'Unknown' } = this.props;
    const { errorCount, lastErrorTime } = this.state;

    // Log error
    logger.error('Error caught by ErrorBoundary', {
      error: (error as any).message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      context,
    });

    // Track error analytics
    analyticsService.trackError(error, {
      level,
      context,
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
    });

    // Report to crash monitoring
    crashReportingService.reportError(error, {
      level,
      context,
      componentStack: errorInfo.componentStack,
      fatal: level === 'global',
    });

    // Monitor error patterns
    errorMonitoringService.trackError({
      error,
      context,
      level,
      timestamp: Date.now(),
    });

    // Check if too many errors in short time
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;

    if (timeSinceLastError < ERROR_TIME_WINDOW && errorCount >= ERROR_RESET_THRESHOLD) {
      // Too many errors, suggest app restart
      Alert.alert(
        'App Stability Issue',
        'The app is experiencing repeated errors. Would you like to restart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restart',
            onPress: () => {
              if ((Updates.reloadAsync !== undefined)) {
                Updates.reloadAsync();
              }
            },
          },
        ]
      );
    }

    // Update state
    this.setState(prevState => ({
      errorInfo,
      errorCount: timeSinceLastError < ERROR_TIME_WINDOW ? prevState.errorCount + 1 : 1,
      lastErrorTime: now,
    }));

    // Call custom error handler
    onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  renderDefaultFallback = () => {
    const { error, errorInfo } = this.state;
    const { showDevInfo = __DEV__, level = 'component' } = this.props;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
          </View>

          <Text style={styles.title}>
            {level === 'global' ? 'Something went wrong' : 'Oops! An error occurred'}
          </Text>

          <Text style={styles.message}>
            {level === 'global'
              ? "We're having trouble loading the app. Please try again."
              : "This part of the app isn't working right now."}
          </Text>

          {showDevInfo && error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorMessage}>{error.toString()}</Text>

              {error.stack && (
                <ScrollView style={styles.stackContainer}>
                  <Text style={styles.stackTrace}>{error.stack}</Text>
                </ScrollView>
              )}

              {errorInfo?.componentStack && (
                <View style={styles.componentStackContainer}>
                  <Text style={styles.errorTitle}>Component Stack:</Text>
                  <Text style={styles.componentStack}>{errorInfo.componentStack}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={this.resetError} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {level === 'global' && (
              <TouchableOpacity
                onPress={() => {
                  if ((Updates.reloadAsync !== undefined)) {
                    Updates.reloadAsync();
                  }
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Restart App</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.helpText}>If this problem persists, please contact support</Text>
        </ScrollView>
      </SafeAreaView>
    );
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        return fallback(this.state.error!, this.resetError);
      }

      return this.renderDefaultFallback();
    }

    return this.props.children;
  }
}

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
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  stackContainer: {
    maxHeight: 200,
    marginTop: 8,
  },
  stackTrace: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'monospace',
  },
  componentStackContainer: {
    marginTop: 16,
  },
  componentStack: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'monospace',
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});
