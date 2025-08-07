
/**
 * Error handling utilities for API services
 */

import { getLogger } from '../../utils/logger';

const logger = getLogger('ErrorHandler');

// Error types
export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handler function
export function handleApiError(error: unknown, endpoint: string): ApiError {
  // Log at appropriate level based on error type
  const is403or401 = error instanceof Response && (error.status === 403 || error.status === 401);
  
  if (is403or401) {
    logger.info(`Authentication required for ${endpoint}:`, error);
  } else {
    logger.error(`API error on ${endpoint}:`, error);
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new ApiError(
      ApiErrorCode.NETWORK_ERROR,
      'Network connection failed. Please check your internet connection.',
      0
    );
  }

  // Handle timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(ApiErrorCode.TIMEOUT_ERROR, 'Request timed out. Please try again.', 0);
  }

  // Handle HTTP response errors
  if (error instanceof Response) {
    const statusCode = error.status;
    let code: ApiErrorCode;
    let message: string;

    switch (statusCode) {
      case 401:
        code = ApiErrorCode.AUTH_ERROR;
        message = 'Authentication failed. Please log in again.';
        break;
      case 403:
        code = ApiErrorCode.AUTH_ERROR;
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        code = ApiErrorCode.NOT_FOUND;
        message = 'The requested resource was not found.';
        break;
      case 422:
      case 400:
        code = ApiErrorCode.VALIDATION_ERROR;
        message = 'Invalid request data. Please check your input.';
        break;
      case 429:
        code = ApiErrorCode.RATE_LIMIT;
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = ApiErrorCode.SERVER_ERROR;
        message = 'Server error. Please try again later.';
        break;
      default:
        code = ApiErrorCode.UNKNOWN_ERROR;
        message = `Request failed with status ${statusCode}`;
    }

    return new ApiError(code, message, statusCode);
  }

  // Handle API errors with custom format
  if (error instanceof Error) {
    return new ApiError(
      ApiErrorCode.UNKNOWN_ERROR,
      error.message || 'An unexpected error occurred',
      undefined,
      { originalError: error.name }
    );
  }

  // Handle unknown errors
  return new ApiError(ApiErrorCode.UNKNOWN_ERROR, 'An unexpected error occurred', undefined, {
    error: String(error as any),
  });
}

// Determine if error is retryable
export function isRetryableError(error: ApiError): boolean {
  return [
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.TIMEOUT_ERROR,
    ApiErrorCode.RATE_LIMIT,
    ApiErrorCode.SERVER_ERROR,
  ].includes(error.code);
}

// Calculate retry delay with exponential backoff
export function calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
  const maxDelay = 30000; // 30 seconds
  const jitter = Math.random() * 200; // 0-200ms jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, maxDelay);
  return delay;
}

// User-friendly error messages
export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.code) {
    case ApiErrorCode.NETWORK_ERROR:
      return 'No internet connection. Please check your network and try again.';
    case ApiErrorCode.TIMEOUT_ERROR:
      return 'The request took too long. Please try again.';
    case ApiErrorCode.AUTH_ERROR:
      return 'Please log in to continue.';
    case ApiErrorCode.VALIDATION_ERROR:
      return 'Please check your input and try again.';
    case ApiErrorCode.NOT_FOUND:
      return 'The requested content could not be found.';
    case ApiErrorCode.RATE_LIMIT:
      return "You're making requests too quickly. Please wait a moment.";
    case ApiErrorCode.SERVER_ERROR:
      return 'Something went wrong on our end. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Error recovery suggestions
export function getRecoverySuggestions(error: ApiError): string[] {
  const suggestions: string[] = [];

  switch (error.code) {
    case ApiErrorCode.NETWORK_ERROR:
      suggestions.push('Check your internet connection');
      suggestions.push('Try switching between WiFi and mobile data');
      suggestions.push('Restart the app');
      break;
    case ApiErrorCode.TIMEOUT_ERROR:
      suggestions.push('Check your internet speed');
      suggestions.push('Try again in a few moments');
      break;
    case ApiErrorCode.AUTH_ERROR:
      suggestions.push('Log out and log in again');
      suggestions.push('Check if your session has expired');
      break;
    case ApiErrorCode.RATE_LIMIT:
      suggestions.push('Wait a few minutes before trying again');
      suggestions.push('Reduce the frequency of your requests');
      break;
    case ApiErrorCode.SERVER_ERROR:
      suggestions.push('Wait a few minutes and try again');
      suggestions.push('Check our status page for updates');
      break;
  }

  return suggestions;
}
