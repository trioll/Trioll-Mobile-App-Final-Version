
import { Alert } from 'react-native';
import { getLogger } from './logger';
import { AnalyticsService } from '../services/analytics/analyticsService';
import { crashReportingService } from '../services/monitoring/crashReportingService';
import { errorMonitoringService } from '../services/monitoring/errorMonitoringService';

const logger = getLogger('ErrorHandling');

export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  data?: Record<string, unknown>;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: ErrorContext,
    public isRecoverable = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network connection failed', context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context?: ErrorContext) {
    super(message, 'AUTH_ERROR', context, false);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public fields?: string[],
    context?: ErrorContext
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', context?: ErrorContext) {
    super(`${resource} not found`, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(permission = 'Permission', context?: ErrorContext) {
    super(`${permission} denied`, 'PERMISSION_DENIED', context);
    this.name = 'PermissionError';
  }
}

// Error handling utilities
export const handleError = (
  error: Error,
  context?: ErrorContext,
  options?: {
    showAlert?: boolean;
    logError?: boolean;
    reportToCrashlytics?: boolean;
    fallbackMessage?: string;
  }
) => {
  const {
    showAlert = true,
    logError = true,
    reportToCrashlytics = !__DEV__,
    fallbackMessage = 'An unexpected error occurred',
  } = options || {};

  // Log the error
  if (logError) {
    logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  // Track in analytics
  AnalyticsService.trackError(error, context);

  // Report to crash reporting
  if (reportToCrashlytics) {
    crashReportingService.reportError(error, {
      context: context?.screen || 'Unknown',
      additionalData: context,
    });
  }

  // Track in error monitoring
  errorMonitoringService.trackError({
    error,
    context: context?.screen || 'Unknown',
    level: 'component',
    timestamp: Date.now(),
  });

  // Show user-friendly alert
  if (showAlert) {
    const userMessage = getUserFriendlyMessage(error, fallbackMessage);
    Alert.alert('Error', userMessage, [{ text: 'OK', style: 'default' }], { cancelable: true });
  }

  return error;
};

// Convert errors to user-friendly messages
export const getUserFriendlyMessage = (error: Error, fallback = 'Something went wrong'): string => {
  if (error instanceof NetworkError) {
    return 'Please check your internet connection and try again.';
  }

  if (error instanceof AuthenticationError) {
    return 'Please sign in to continue.';
  }

  if (error instanceof ValidationError) {
    return error.message || 'Please check your input and try again.';
  }

  if (error instanceof NotFoundError) {
    return error.message || 'The requested content could not be found.';
  }

  if (error instanceof PermissionError) {
    return error.message || "You don't have permission to perform this action.";
  }

  // Check for common error patterns
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Connection error. Please try again.';
  }

  if (errorMessage.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return 'Please sign in to continue.';
  }

  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return "You don't have access to this content.";
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'The requested content could not be found.';
  }

  if (errorMessage.includes('server') || errorMessage.includes('500')) {
    return 'Server error. Please try again later.';
  }

  return __DEV__ ? error.message : fallback;
};

// Async error wrapper
export const withErrorHandling = async <T>(
  asyncFn: () => Promise<T>,
  context?: ErrorContext,
  options?: Parameters<typeof handleError>[2]
): Promise<T | undefined> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error as Error, context, options);
    return undefined;
  }
};

// Error boundary helper
export const logErrorToService = (error: Error, errorInfo: { componentStack: string }) => {
  logger.error('React Error Boundary', {
    error: error.toString(),
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });

  crashReportingService.reportError(error, {
    level: 'component',
    componentStack: errorInfo.componentStack,
    fatal: false,
  });
};

// Network error detection
export const isNetworkError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    error instanceof NetworkError ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection')
  );
};

// Retry logic helper
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);

        onRetry?.(attempt + 1, lastError);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Safe JSON parse
export const safeJsonParse = <T = unknown>(json: string, fallback?: T): T | undefined => {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.warn('JSON parse error', { error: (error as Error).message });
    return fallback;
  }
};

// Safe async storage operations
export const safeStorageOperation = async <T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    logger.error('Storage operation failed', { error: (error as Error).message });
    return fallback;
  }
};
