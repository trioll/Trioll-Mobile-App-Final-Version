/**
 * Response Adapter
 * Converts between existing ApiResponse format and StandardApiResponse
 * Maintains backward compatibility while fixing TypeScript errors
 */

import { 
  ApiResponse, 
  StandardApiResponse, 
  StandardErrorResponse, 
  StandardSuccessResponse,
  ApiError 
} from '@/types/api.types';
import { ApiErrorCode } from '@/services/api/errorHandler';

/**
 * Adapts existing ApiResponse to StandardApiResponse format
 * Maintains backward compatibility while fixing TypeScript errors
 */
export function adaptApiResponse<T>(
  response: ApiResponse<T>,
  statusCode: number = 200
): StandardApiResponse<T> {
  // Handle error responses
  if (!response.success) {
    // Build from existing error field if it's a string
    if (typeof response.error === 'string') {
      return {
        success: false,
        message: response.error,
        statusCode: response.statusCode || statusCode,
        error: {
          code: ApiErrorCode.UNKNOWN_ERROR,
          details: { originalError: response.error }
        }
      };
    }
    
    // Build from error object if available
    if (response.error && typeof response.error === 'object') {
      const error = response.error as ApiError;
      return {
        success: false,
        message: error.message || response.message || 'An error occurred',
        statusCode: error.statusCode || response.statusCode || statusCode,
        error: {
          code: error.code || ApiErrorCode.UNKNOWN_ERROR,
          details: error.details
        }
      };
    }

    // Default error response
    return {
      success: false,
      message: response.message || 'An error occurred',
      statusCode: response.statusCode || statusCode
    };
  }

  // Handle success responses
  return {
    success: true,
    data: response.data as T,
    statusCode: response.statusCode || statusCode,
    message: response.message
  };
}

/**
 * Creates a standardized error response from an ApiError
 */
export function createErrorResponseFromApiError(
  error: ApiError
): StandardErrorResponse {
  return {
    success: false,
    message: error.message,
    statusCode: error.statusCode || 500,
    error: {
      code: error.code,
      details: error.details
    }
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  code: string = ApiErrorCode.UNKNOWN_ERROR,
  details?: Record<string, any>
): StandardErrorResponse {
  return {
    success: false,
    message,
    statusCode,
    error: {
      code,
      details
    }
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    statusCode,
    message
  };
}

/**
 * Converts StandardApiResponse back to ApiResponse for backward compatibility
 */
export function toApiResponse<T>(
  response: StandardApiResponse<T>
): ApiResponse<T> {
  if (!response.success) {
    return {
      success: false,
      error: response.message,
      message: response.message,
      statusCode: response.statusCode
    };
  }

  return {
    success: true,
    data: response.data,
    message: response.message,
    statusCode: response.statusCode
  };
}

/**
 * Wraps an async function to automatically convert its response to StandardApiResponse
 */
export function withStandardResponse<T extends (...args: any[]) => Promise<ApiResponse<any>>>(
  fn: T
): (...args: Parameters<T>) => Promise<StandardApiResponse<any>> {
  return async (...args: Parameters<T>) => {
    try {
      const response = await fn(...args);
      return adaptApiResponse(response);
    } catch (error) {
      if (error instanceof ApiError) {
        return createErrorResponseFromApiError(error);
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500,
        ApiErrorCode.UNKNOWN_ERROR
      );
    }
  };
}