
import { useState, useCallback, useRef, useEffect } from 'react';
import { getLogger } from '../src/utils/logger';
import { analyticsService } from '../src/services/analytics/analyticsService';

const logger = getLogger('useAsyncError');

export interface AsyncErrorState {
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  errorCount: number;
  lastErrorTime: number | null;
}

export interface UseAsyncErrorOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  retryDelay?: number;
  maxRetries?: number;
  resetOnSuccess?: boolean;
  trackAnalytics?: boolean;
  context?: string;
}

export function useAsyncError(options: UseAsyncErrorOptions = {}) {
  const {
    onError,
    onSuccess,
    retryDelay = 1000,
    maxRetries = 3,
    resetOnSuccess = true,
    trackAnalytics = true,
    context = 'unknown',
  } = options;

  const [state, setState] = useState<AsyncErrorState>({
    isLoading: false,
    error: null,
    isError: false,
    errorCount: 0,
    lastErrorTime: null,
  });

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const setError = useCallback(
    (error: Error) => {
      if (!isMountedRef.current) return;

      logger.error(`Async error in ${context}:`, error);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
        isError: true,
        errorCount: prev.errorCount + 1,
        lastErrorTime: Date.now(),
      }));

      if (trackAnalytics) {
        analyticsService.trackError(error, {
          context,
          errorCount: state.errorCount + 1,
        });
      }

      onError?.(error as any);
    },
    [context, onError, trackAnalytics, state.errorCount]
  );

  const clearError = useCallback(() => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      error: null,
      isError: false,
      errorCount: resetOnSuccess ? 0 : prev.errorCount,
    }));
  }, [resetOnSuccess]);

  const setLoading = useCallback((isLoading: boolean) => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const executeAsync = useCallback(
    async <T>(
      asyncFunction: () => Promise<T>,
      options?: {
        showLoading?: boolean;
        throwOnError?: boolean;
        retries?: number;
      }
    ): Promise<T | undefined> => {
      const { showLoading = true, throwOnError = false, retries = 0 } = options || {};

      if (showLoading) {
        setLoading(true);
      }

      try {
        const result = await asyncFunction();

        if (isMountedRef.current) {
          clearError();
          setLoading(false);
          onSuccess?.();
        }

        return result;
      } catch (error) {
        const err = error as Error;

        if (isMountedRef.current) {
          setError(err);

          // Handle retries
          if (retries > 0 && state.errorCount < maxRetries) {
            logger.info(`Retrying async operation (${state.errorCount + 1}/${maxRetries})`);

            return new Promise(resolve => {
              retryTimeoutRef.current = setTimeout(
                () => {
                  resolve(
                    executeAsync(asyncFunction, {
                      ...options,
                      retries: retries - 1,
                    })
                  );
                },
                retryDelay * (state.errorCount + 1)
              );
            });
          }
        }

        if (throwOnError) {
          throw err;
        }

        return undefined;
      }
    },
    [setLoading, clearError, setError, onSuccess, state.errorCount, maxRetries, retryDelay]
  );

  const retry = useCallback(() => {
    if (state.error && state.errorCount < maxRetries) {
      clearError();
    }
  }, [state.error, state.errorCount, maxRetries, clearError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isError: false,
      errorCount: 0,
      lastErrorTime: null,
    });
  }, []);

  return {
    ...state,
    executeAsync,
    setError,
    clearError,
    setLoading,
    retry,
    reset,
    canRetry: state.errorCount < maxRetries,
    retriesRemaining: Math.max(0, maxRetries - state.errorCount),
  };
}

// Example usage:
/*
const MyComponent = () => {
  const { 
    isLoading, 
    error, 
    executeAsync, 
    retry,
    canRetry,
    retriesRemaining
  } = useAsyncError({
    context: 'fetchUserData',
    maxRetries: 3,
    onError: (error as any) => {
      toast.error('Failed to load user data');
    },
  });

  const loadData = () => {
    executeAsync(async () => {
      const data = await api.fetchUserData();
      setUserData(data);
    }, {
      retries: 3, // Enable auto-retry
    });
  };

  if (error as any) {
    return (
      <ErrorView 
        error={error}
        onRetry={canRetry ? retry : undefined}
        retriesRemaining={retriesRemaining}
      />
    );
  }

  if (isLoading) {
    return <LoadingView />;
  }

  // ... rest of component
};
*/
