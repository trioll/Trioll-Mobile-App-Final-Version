/**
 * Retry mechanism for API requests
 */

import { getLogger } from '../../utils/logger';
import { ApiError, handleApiError, isRetryableError, calculateRetryDelay } from './errorHandler';

const logger = getLogger('RetryMechanism');

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
  abortSignal?: AbortSignal;
  onRetry?: (attempt: number, error: ApiError) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'abortSignal' | 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  timeout: 30000,
};

/**
 * Execute a request with retry logic
 */
export async function withRetry<T>(
  request: () => Promise<T>,
  endpoint: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: ApiError | null = null;

  for (const attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Check if request was aborted
      if (options.abortSignal?.aborted) {
        throw new Error('Request aborted');
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Request timed out'));
        }, config.timeout);

        // Clear timeout if aborted
        options.abortSignal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Request aborted'));
        });
      });

      // Execute request with timeout
      const result = await Promise.race([request(), timeoutPromise]);

      // Success - return result
      return result;
    } catch (error) {
      // Handle the error
      lastError = handleApiError(error, endpoint);

      // Log the attempt at appropriate level
      const isAuthError = lastError.code === 'AUTH_ERROR';
      if (isAuthError) {
        logger.info(`Authentication required for ${endpoint}`);
      } else {
        logger.warn(`Request failed (attempt ${attempt}/${config.maxRetries}):`, {
          endpoint,
          error: lastError.message,
          code: lastError.code,
        });
      }

      // Check if we should retry
      if (attempt < config.maxRetries && isRetryableError(lastError)) {
        const delay = calculateRetryDelay(attempt, config.baseDelay);

        // Call retry callback if provided
        options.onRetry?.(attempt, lastError);

        logger.info(`Retrying in ${delay}ms...`);

        // Wait before retrying
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);

          // Cancel retry if aborted
          options.abortSignal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve(undefined);
          });
        });
      } else {
        // No more retries or non-retryable error
        break;
      }
    }
  }

  // All retries exhausted or non-retryable error
  throw lastError || new ApiError('UNKNOWN_ERROR', 'Request failed after all retry attempts');
}

/**
 * Create a retry wrapper for a function
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  endpoint: string,
  defaultOptions: RetryOptions = {}
) {
  return async (...args: TArgs): Promise<TResult> => {
    return withRetry(() => fn(...args), endpoint, defaultOptions);
  };
}

/**
 * Batch retry for multiple requests
 */
export async function batchRetry<T>(
  requests: Array<{ request: () => Promise<T>; endpoint: string }>,
  options: RetryOptions = {}
): Promise<Array<{ success: true; data: T } | { success: false; error: ApiError }>> {
  const results = await Promise.allSettled(
    requests.map(({ request, endpoint }) => withRetry(request, endpoint, options))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true as const, data: result.value };
    } else {
      const error = handleApiError(result.reason, requests[index].endpoint);
      return { success: false as const, error };
    }
  });
}

/**
 * Circuit breaker pattern for API endpoints
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly halfOpenRequests: number = 3
  ) {}

  async execute<T>(
    request: () => Promise<T>,
    endpoint: string,
    options: RetryOptions = {}
  ): Promise<T> {
    // Check circuit state
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new ApiError(
          'CIRCUIT_OPEN',
          'Service temporarily unavailable. Circuit breaker is open.',
          503
        );
      }
    }

    try {
      const result = await withRetry(request, endpoint, {
        ...options,
        maxRetries: this.state === 'half-open' ? 1 : options.maxRetries,
      });

      // Success - reset failures if in half-open state
      if (this.state === 'half-open') {
        this.failures++;
        if (this.failures >= this.halfOpenRequests) {
          this.state = 'closed';
          this.failures = 0;
        }
      } else if (this.state === 'closed') {
        this.failures = 0;
      }

      return result;
    } catch (error) {
      // Failure - increment counter
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.error(
          `Circuit breaker opened for ${endpoint} after ${this.failures} failures`
        );
      }

      throw error;
    }
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
