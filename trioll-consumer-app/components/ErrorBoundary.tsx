import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Report to crash analytics in production
    if (!__DEV__) {
      this.reportError(error, errorInfo);
    }
  }

  reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // Import crash reporter dynamically
      const { crashReporter } = await import('../src/services/monitoring/crashReporter');
      crashReporter.captureException(error, {
        level: 'error',
        tags: { component: 'ErrorBoundary' },
        extra: {
          componentStack: errorInfo.componentStack,
          errorCount: this.state.errorCount,
        },
      });
    } catch (_reportError) {
      // Failed to report error, but don't crash the error boundary
    }
  };

  handleRestart = async () => {
    try {
      // In development, just reload
      if (__DEV__) {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      } else {
        // In production, use Expo Updates to reload
        await Updates.reloadAsync();
      }
    } catch (_error) {
      // If reload fails, reset the error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>We're sorry, but an unexpected error occurred.</Text>
            </View>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorMessage}>
                  {this.state.error.toString()}
                </Text>

                {this.state.errorInfo && (
                  <ScrollView style={styles.stackTrace} horizontal>
                    <Text style={styles.stackText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                )}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRestart}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Restart App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReset}>
                <Text style={styles.secondaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>

            {this.state.errorCount > 1 && (
              <Text style={styles.errorCountText}>
                This error has occurred {this.state.errorCount} times
              </Text>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorDetails: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  stackTrace: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  stackText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
  },
});
