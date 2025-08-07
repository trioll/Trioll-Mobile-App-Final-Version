/**
 * Trioll API Service with Standardized Responses
 * Example implementation showing how to integrate StandardApiResponse
 * while maintaining backward compatibility
 */

import { Config } from '../../config/environments';
import { safeAuthService } from '../auth/safeAuthService';
import { getLogger } from '../../utils/logger';
import { 
  GamesResponse, 
  GameDetailsResponse, 
  LikeResponse, 
  PlaySessionResponse, 
  RatingResponse,
  RequestOptions 
} from './types';
import { CircuitBreaker } from './retryMechanism';
import { ApiError, ApiErrorCode, handleApiError } from './errorHandler';
import { offlineQueue } from './offlineQueue';
import { localStorageService } from '../localStorageService';
import { 
  StandardApiResponse, 
  StandardSuccessResponse,
  StandardErrorResponse,
  Game 
} from '../../types/api.types';
import { 
  createSuccessResponse, 
  createErrorResponse,
  createErrorResponseFromApiError 
} from '../../api/adapters/responseAdapter';

const logger = getLogger('TriollAPIStandard');

class TriollAPIStandard {
  private apiBase: string;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private isGuestMode = false;

  constructor() {
    let apiUrl = Config.API_BASE_URL;
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && apiUrl.includes('localhost')) {
      apiUrl = apiUrl.replace('localhost', '10.0.2.2');
    }
    this.apiBase = apiUrl;
  }

  /**
   * Enhanced makeRequest that returns StandardApiResponse
   */
  async makeRequest<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<StandardApiResponse<T>> {
    const endpointKey = `${options.method || 'GET'}_${endpoint}`;
    let circuitBreaker = this.circuitBreakers.get(endpointKey);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker();
      this.circuitBreakers.set(endpointKey, circuitBreaker);
    }

    try {
      const result = await circuitBreaker.execute(
        async () => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Trioll-Mobile/1.0',
            ...options.headers,
          };

          // Add authentication
          if (this.isGuestMode) {
            headers['X-Guest-Mode'] = 'true';
          } else {
            try {
              const token = await safeAuthService.getIdToken();
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }
            } catch (_authError) {
              // Continue as guest
            }
          }

          const url = `${this.apiBase}${endpoint}`;
          const response = await fetch(url, {
            ...options,
            headers,
          });

          // Parse response body
          const responseData = await response.json();

          // Convert to standard format
          if (!response.ok) {
            // Extract error information from response
            return createErrorResponse(
              responseData.message || responseData.error || 'Request failed',
              response.status,
              responseData.code || ApiErrorCode.UNKNOWN_ERROR,
              responseData.details
            );
          }

          // Success response
          return createSuccessResponse<T>(
            responseData as T,
            response.status
          );
        },
        endpoint,
        {
          maxRetries: options.retries || 3,
          timeout: options.timeout || 30000,
          onRetry: (attempt, error) => {
            logger.info(`Retrying ${endpoint} (attempt ${attempt}):`, error.message);
          },
        }
      );

      return result;
    } catch (error) {
      // Handle errors with standardized format
      const apiError = handleApiError(error, endpoint);
      return createErrorResponseFromApiError(apiError);
    }
  }

  /**
   * Games API with standardized responses
   */
  async getGames(limit = 20, category?: string): Promise<StandardApiResponse<Game[]>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.append('category', category);

    const response = await this.makeRequest<GamesResponse>(`/games?${params}`);
    
    // Transform to return just the games array
    if (response.success) {
      return createSuccessResponse(
        response.data.games || [],
        response.statusCode,
        response.message
      );
    }
    
    return response as StandardErrorResponse;
  }

  async getFeaturedGames(limit = 10): Promise<StandardApiResponse<Game[]>> {
    const response = await this.makeRequest<GamesResponse>(`/games?limit=${limit}`);
    
    if (response.success) {
      const featuredGames = response.data.games?.filter(game => game.featured) || [];
      return createSuccessResponse(
        featuredGames,
        response.statusCode,
        'Featured games retrieved successfully'
      );
    }
    
    return response as StandardErrorResponse;
  }

  async getGameDetails(gameId: string): Promise<StandardApiResponse<Game>> {
    const response = await this.makeRequest<GameDetailsResponse>(`/games/${gameId}`);
    
    if (response.success) {
      return createSuccessResponse(
        response.data as Game,
        response.statusCode
      );
    }
    
    return response as StandardErrorResponse;
  }

  async searchGames(query: string, limit = 20): Promise<StandardApiResponse<Game[]>> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    
    const response = await this.makeRequest<GamesResponse>(`/games/search?${params}`);
    
    if (response.success) {
      return createSuccessResponse(
        response.data.games || [],
        response.statusCode,
        `Found ${response.data.games?.length || 0} games`
      );
    }
    
    return response as StandardErrorResponse;
  }

  /**
   * Like a game with standardized response
   */
  async likeGame(gameId: string): Promise<StandardApiResponse<LikeResponse>> {
    // Handle guest mode
    if (this.isGuestMode) {
      const result = await localStorageService.addGuestLike(gameId);
      
      if (result.success) {
        return createSuccessResponse<LikeResponse>({
          success: true,
          gameId,
          userId: 'guest',
          totalLikes: result.totalLikes || 0,
          isLiked: true
        }, 200, 'Game liked locally');
      }
      
      return createErrorResponse(
        'Failed to like game',
        400,
        ApiErrorCode.UNKNOWN_ERROR
      );
    }

    return this.makeRequest<LikeResponse>(`/games/${gameId}/likes`, {
      method: 'POST',
    });
  }

  /**
   * Unlike a game with standardized response
   */
  async unlikeGame(gameId: string): Promise<StandardApiResponse<LikeResponse>> {
    if (this.isGuestMode) {
      const result = await localStorageService.removeGuestLike(gameId);
      
      if (result.success) {
        return createSuccessResponse<LikeResponse>({
          success: true,
          gameId,
          userId: 'guest',
          totalLikes: result.totalLikes || 0,
          isLiked: false
        }, 200, 'Game unliked locally');
      }
      
      return createErrorResponse(
        'Failed to unlike game',
        400,
        ApiErrorCode.UNKNOWN_ERROR
      );
    }

    return this.makeRequest<LikeResponse>(`/games/${gameId}/likes`, {
      method: 'DELETE',
    });
  }

  /**
   * Track game play with standardized response
   */
  async trackPlay(gameId: string, duration: number): Promise<StandardApiResponse<PlaySessionResponse>> {
    if (this.isGuestMode) {
      // Queue for later sync
      await offlineQueue.addRequest({
        endpoint: `/games/${gameId}/plays`,
        method: 'POST',
        data: { duration },
        priority: 'normal',
      });

      return createSuccessResponse<PlaySessionResponse>({
        success: true,
        sessionId: `guest_session_${Date.now()}`,
        gameId,
        userId: 'guest',
        duration,
        timestamp: new Date().toISOString()
      }, 200, 'Play tracked offline');
    }

    return this.makeRequest<PlaySessionResponse>(`/games/${gameId}/plays`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  /**
   * Rate a game with standardized response
   */
  async rateGame(gameId: string, rating: number): Promise<StandardApiResponse<RatingResponse>> {
    if (rating < 1 || rating > 5) {
      return createErrorResponse(
        'Rating must be between 1 and 5',
        400,
        ApiErrorCode.VALIDATION_ERROR
      );
    }

    if (this.isGuestMode) {
      const result = await localStorageService.setGuestRating(gameId, rating);
      
      if (result.success) {
        return createSuccessResponse<RatingResponse>({
          success: true,
          gameId,
          userId: 'guest',
          rating,
          averageRating: result.averageRating || rating,
          totalRatings: result.totalRatings || 1
        }, 200, 'Rating saved locally');
      }
      
      return createErrorResponse(
        'Failed to save rating',
        400,
        ApiErrorCode.UNKNOWN_ERROR
      );
    }

    return this.makeRequest<RatingResponse>(`/games/${gameId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  /**
   * Set guest mode
   */
  setGuestMode(isGuest: boolean) {
    this.isGuestMode = isGuest;
    logger.info(`API mode set to: ${isGuest ? 'guest' : 'authenticated'}`);
  }
}

// Export singleton instance
export const triollAPIStandard = new TriollAPIStandard();