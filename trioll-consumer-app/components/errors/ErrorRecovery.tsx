import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../hooks/useHaptics';

export type ErrorType =
  | 'network'
  | 'permission'
  | 'notFound'
  | 'serverError'
  | 'timeout'
  | 'unauthorized'
  | 'generic';

interface ErrorRecoveryProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  dismissLabel?: string;
  showIcon?: boolean;
  compact?: boolean;
  customActions?: Array<{
    label: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

const ERROR_CONFIGS: Record<
  ErrorType,
  {
    icon: string;
    title: string;
    message: string;
    color: string;
  }
> = {
  network: {
    icon: 'cloud-offline-outline',
    title: 'No Connection',
    message: 'Please check your internet connection and try again.',
    color: '#FF6B6B',
  },
  permission: {
    icon: 'lock-closed-outline',
    title: 'Permission Required',
    message: 'Please grant the necessary permissions to continue.',
    color: '#FFAA00',
  },
  notFound: {
    icon: 'search-outline',
    title: 'Not Found',
    message: "The content you're looking for couldn't be found.",
    color: '#6366f1',
  },
  serverError: {
    icon: 'server-outline',
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    color: '#FF6B6B',
  },
  timeout: {
    icon: 'time-outline',
    title: 'Request Timeout',
    message: 'The request took too long. Please try again.',
    color: '#FFAA00',
  },
  unauthorized: {
    icon: 'person-outline',
    title: 'Authentication Required',
    message: 'Please sign in to access this content.',
    color: '#6366f1',
  },
  generic: {
    icon: 'alert-circle-outline',
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    color: '#FF6B6B',
  },
};

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  type = 'generic',
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss',
  showIcon = true,
  compact = false,
  customActions = [],
}) => {
  const haptics = useHaptics();
  const config = ERROR_CONFIGS[type];

  const handleRetry = () => {
    haptics.impact('light');
    onRetry?.();
  };

  const handleDismiss = () => {
    haptics.impact('light');
    onDismiss?.();
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactContent}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
          <Text style={styles.compactText}>{title || config.title}</Text>
        </View>
        {onRetry && (
          <TouchableOpacity onPress={handleRetry} style={styles.compactButton}>
            <Text style={styles.compactButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showIcon && (
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon as any} size={48} color={config.color} />
        </View>
      )}

      <Text style={styles.title}>{title || config.title}</Text>
      <Text style={styles.message}>{message || config.message}</Text>

      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity onPress={handleRetry} style={styles.primaryButton}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{dismissLabel}</Text>
          </TouchableOpacity>
        )}

        {customActions.map((action, index) => {
          const buttonStyle =
            action.style === 'primary'
              ? styles.primaryButton
              : action.style === 'danger'
                ? styles.dangerButton
                : styles.secondaryButton;

          const textStyle =
            action.style === 'primary'
              ? styles.primaryButtonText
              : action.style === 'danger'
                ? styles.dangerButtonText
                : styles.secondaryButtonText;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => {
                haptics.impact('light');
                action.onPress();
              }}
              style={buttonStyle}
            >
              <Text style={textStyle}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  actions: {
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  compactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
