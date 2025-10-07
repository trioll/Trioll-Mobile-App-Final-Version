
/**
 * Trioll API Service Layer
 * Integrates with existing AWS infrastructure and Cognito authentication
 */

import { Config } from '../../config/environments';
import { safeAuthService } from '../auth/safeAuthService';
import { getLogger } from '../../utils/logger';
import { GamesResponse, GameDetailsResponse, UserProfile, UserProfileUpdate, UserStats, LikeResponse, PlaySessionResponse, RatingResponse, FriendsResponse, FriendRequestsResponse, FriendRequest, FriendActivityResponse, AnalyticsEventData, CategoriesResponse, SearchResponse, RequestOptions,  } from './types';
import { CircuitBreaker } from './retryMechanism';
import { ApiError, ApiErrorCode } from './errorHandler';
import { offlineQueue } from './offlineQueue';
import { localStorageService } from '../localStorageService';

const logger = getLogger('TriollAPI');

// Guest mode credentials storage
let guestCredentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
  identityId: string;
} | null = null;

class TriollAPI {
  private apiBase: string;
  private loggedAnalyticsErrors = new Set<string>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private isGuestMode = false;

  constructor() {
    // Fix for Android emulator: replace localhost with proper IP
    let apiUrl = Config.API_BASE_URL;
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && apiUrl.includes('localhost')) {
      apiUrl = apiUrl.replace('localhost', '10.0.2.2');
    }
    this.apiBase = apiUrl;
  }

  async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Get or create circuit breaker for this endpoint
    const endpointKey = `${options.method || 'GET'}_${endpoint}`;
    let circuitBreaker = this.circuitBreakers.get(endpointKey);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker();
      this.circuitBreakers.set(endpointKey, circuitBreaker);
    }

    // Execute request with circuit breaker and retry logic
    return circuitBreaker.execute(
      async () => {
        // Try to get authenticated user token
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Trioll-Mobile/1.0',
          ...options.headers,
        };

        // Check if we're in guest mode
        logger.info(`API Request - Guest Mode: ${this.isGuestMode}, Has Guest Credentials: ${!!guestCredentials}`);
        
        if (this.isGuestMode && guestCredentials) {
          headers['X-Guest-Mode'] = 'true';
          headers['X-Identity-Id'] = guestCredentials.identityId;
          logger.info(`Sending guest headers with identity: ${guestCredentials.identityId}`);
        } else {
          try {
            // Try to get Amplify identity for guest users
            const { amplifyAuthService } = await import('../auth/amplifyAuthService');
            const authState = amplifyAuthService.getCurrentState();
            
            if (authState.isGuest && authState.identityId) {
              // We're a guest user with Amplify credentials
              headers['X-Guest-Mode'] = 'true';
              headers['X-Identity-Id'] = authState.identityId;
              logger.info(`Using Amplify guest identity: ${authState.identityId}`);
            } else {
              // Use existing auth service to get token
              const token = await safeAuthService.getIdToken();
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }
            }
          } catch (_authError) {
            logger.warn('Failed to get auth credentials:', _authError);
            // Fallback: Use basic guest headers even without Amplify
            headers['X-Guest-Mode'] = 'true';
            headers['X-Identity-Id'] = `fallback_${Date.now()}`;
            logger.info('Using fallback guest mode');
          }
        }

        const url = `${this.apiBase}${endpoint}`;
        
        logger.info(`Making request to: ${url}`, {
          method: options.method || 'GET',
          headers: Object.keys(headers).reduce((acc, key) => {
            if (key.toLowerCase() !== 'authorization') {
              acc[key] = headers[key];
            }
            return acc;
          }, {} as any)
        });

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (!response.ok) {
          // Try to get error message from response body
          let errorMessage = `HTTP ${response.status}`;
          let errorBody = null;
          try {
            const text = await response.text();
            // Use logger.warn instead of logger.error to avoid console error tracking
            logger.warn(`[TriollAPI] Error response body: ${text}`);
            try {
              errorBody = JSON.parse(text);
              errorMessage = errorBody.message || errorBody.error || errorMessage;
            } catch {
              errorMessage = text || errorMessage;
            }
          } catch {
            // If response body is not readable, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          const error = new Error(errorMessage);
          (error as any).status = response.status;
          (error as any).response = response;
          (error as any).body = errorBody;
          throw error;
        }

        const responseText = await response.text();
        logger.info(`Response received (${response.status}): ${responseText.substring(0, 200)}`);
        
        try {
          return JSON.parse(responseText);
        } catch (e) {
          logger.error('Failed to parse response as JSON:', responseText);
          throw new Error('Invalid JSON response');
        }
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
  }

  // Games API
  async getGames(limit = 20, category?: string): Promise<GamesResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (category) params.append('category', category);

    const response = await this.makeRequest<GamesResponse>(`/games?${params}`);
    return response;
  }

  async getFeaturedGames(limit = 10): Promise<GamesResponse> {
    // Using the main games endpoint since there's no specific featured endpoint
    const response = await this.makeRequest<GamesResponse>(`/games?limit=${limit}`);
    // Filter featured games from response
    if (response.games) {
      response.games = response.games.filter(game => game.featured);
    }
    return response;
  }

  async getGamesByCategory(categoryId: string, limit = 20): Promise<GamesResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      category: categoryId,
    });
    return this.makeRequest<GamesResponse>(`/games?${params}`);
  }

  async getGameDetails(gameId: string): Promise<GameDetailsResponse> {
    return this.makeRequest<GameDetailsResponse>(`/games/${gameId}`);
  }

  async searchGames(query: string, limit = 20): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    return this.makeRequest<SearchResponse>(`/games/search?${params}`);
  }

  // User interactions - these match the existing API endpoints
  async likeGame(gameId: string): Promise<LikeResponse> {
    // Always try the API - the backend now supports guest users
    const userId = await safeAuthService.getCurrentUserId();

    const endpoint = `/games/${gameId}/likes`;
    const body = JSON.stringify({ userId, gameId });
    
    logger.info(`Attempting to like game: ${gameId} as user: ${userId}`);

    try {
      const response = await this.makeRequest<any>(endpoint, {
        method: 'POST',
        body,
      });
      
      logger.info(`Like response received:`, response);
      
      // Transform response to match expected format
      // The Lambda returns likeCount instead of totalLikes
      if (response && typeof response.likeCount !== 'undefined') {
        return {
          success: true,
          gameId: response.gameId || gameId,
          userId: response.userId || userId,
          totalLikes: response.likeCount,
          isLiked: response.userLiked !== false,
        };
      }
      
      // If response already has correct format, return as is
      return response as LikeResponse;
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      // Queue for offline processing if network error
      if (error instanceof ApiError && error.code === ApiErrorCode.NETWORK_ERROR) {
        await offlineQueue.enqueue({
          endpoint: `${this.apiBase}${endpoint}`,
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          priority: 'normal',
          metadata: { type: 'like', gameId, userId },
        });

        // Return optimistic response
        return {
          success: true,
          gameId,
          userId,
          totalLikes: 0,
          isLiked: true,
        };
      }
      throw error;
    }
  }

  async unlikeGame(gameId: string): Promise<LikeResponse> {
    // Always try the API - the backend now supports guest users
    const userId = await safeAuthService.getCurrentUserId();
    return this.makeRequest<LikeResponse>(`/games/${gameId}/likes`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, gameId }),
    });
  }

  async bookmarkGame(gameId: string): Promise<any> {
    // Check if in guest mode
    if (this.isGuestMode) {
      const result = await localStorageService.addGuestBookmark(gameId);
      return {
        success: result.success,
        gameId,
        userId: 'guest',
        bookmarked: true,
        bookmarkCount: 0
      };
    }

    const userId = await safeAuthService.getCurrentUserId();
    
    // Using the new bookmarks endpoint
    return this.makeRequest<any>(`/games/${gameId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({ userId, gameId }),
    });
  }

  async unbookmarkGame(gameId: string): Promise<any> {
    // Check if in guest mode
    if (this.isGuestMode) {
      const result = await localStorageService.removeGuestBookmark(gameId);
      return {
        success: result.success,
        gameId,
        userId: 'guest',
        bookmarked: false,
        bookmarkCount: 0
      };
    }

    const userId = await safeAuthService.getCurrentUserId();
    
    // Using the new bookmarks endpoint
    return this.makeRequest<any>(`/games/${gameId}/bookmarks`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, gameId }),
    });
  }

  async playGame(gameId: string, sessionId?: string, duration?: number): Promise<PlaySessionResponse> {
    // Check if in guest mode
    if (this.isGuestMode) {
      const result = await localStorageService.trackGuestPlay(gameId, duration || 0);
      return {
        success: result.success,
        sessionId: sessionId || 'guest-session-' + Date.now(),
        totalPlays: result.totalPlays || 0
      };
    }

    const userId = await safeAuthService.getCurrentUserId();
    return this.makeRequest<PlaySessionResponse>(`/games/${gameId}/plays`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        gameId,
        sessionId: sessionId || 'session-' + Date.now(),
        duration: duration || 0,
      }),
    });
  }

  async rateGame(gameId: string, rating: number): Promise<RatingResponse> {
    // Check if in guest mode
    if (this.isGuestMode) {
      const result = await localStorageService.addGuestRating(gameId, rating);
      return {
        success: result.success,
        gameId,
        averageRating: result.averageRating || rating,
        totalRatings: result.totalRatings || 1,
        userRating: rating
      };
    }

    const userId = await safeAuthService.getCurrentUserId();
    return this.makeRequest<RatingResponse>(`/games/${gameId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ userId, gameId, rating }),
    });
  }

  // User profile endpoints
  async getUserProfile(userId?: string): Promise<UserProfile> {
    // If no userId provided, get current user ID
    if (!userId) {
      const currentUserId = await safeAuthService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('No user ID available');
      }
      userId = currentUserId;
    }
    
    const endpoint = `/users/${userId}`;
    return this.makeRequest<UserProfile>(endpoint);
  }

  async updateUserProfile(data: UserProfileUpdate): Promise<UserProfile> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<UserProfile>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserStats(userId?: string): Promise<UserStats> {
    const id = userId || (await safeAuthService.getCurrentUserId());
    if (!id) throw new Error('User ID required');

    return this.makeRequest<UserStats>(`/users/${id}/stats`);
  }

  // Categories
  async getCategories(): Promise<CategoriesResponse> {
    return this.makeRequest<CategoriesResponse>('/categories');
  }

  // Analytics tracking
  async trackEvent(eventType: string, data: AnalyticsEventData): Promise<void> {
    // Skip analytics in development to avoid 403 errors
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      logger.debug(`Analytics: ${eventType}`, data);
      return;
    }

    try {
      await this.makeRequest('/analytics/events', {
        method: 'POST',
        body: JSON.stringify({
          eventType,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
    const errorMessage = error instanceof Error ? error.message : String(error);
      // Only log analytics errors once per event type
      if (!this.loggedAnalyticsErrors.has(eventType)) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Analytics tracking failed for ${eventType}, continuing:`, errorMessage);
        this.loggedAnalyticsErrors.add(eventType);
      }
    }
  }

  // Comments API endpoints
  async getGameComments(gameId: string): Promise<{ gameId: string; comments: any[]; count: number }> {
    return this.makeRequest<{ gameId: string; comments: any[]; count: number }>(`/games/${gameId}/comments`);
  }

  async addGameComment(gameId: string, comment: string): Promise<{
    gameId: string;
    commentId: string;
    userId: string;
    comment: string;
    timestamp: string;
    likes: number;
  }> {
    const userId = await safeAuthService.getCurrentUserId();

    return this.makeRequest<{
      gameId: string;
      commentId: string;
      userId: string;
      comment: string;
      timestamp: string;
      likes: number;
    }>(`/games/${gameId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ commentText: comment, userId }),
    });
  }

  async deleteGameComment(gameId: string, commentId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/games/${gameId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Friends API endpoints
  async getFriends(userId?: string): Promise<FriendsResponse> {
    const id = userId || (await safeAuthService.getCurrentUserId());
    if (!id) throw new Error('User ID required');

    return this.makeRequest<FriendsResponse>(`/users/${id}/friends`);
  }

  async getFriendRequests(): Promise<FriendRequestsResponse> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<FriendRequestsResponse>(`/users/${userId}/friend-requests`);
  }

  async sendFriendRequest(targetUserId: string, message?: string): Promise<FriendRequest> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<FriendRequest>('/friend-requests', {
      method: 'POST',
      body: JSON.stringify({
        fromUserId: userId,
        toUserId: targetUserId,
        message,
      }),
    });
  }

  async acceptFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/friend-requests/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async rejectFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/friend-requests/${requestId}/reject`, {
      method: 'POST',
    });
  }

  async removeFriend(friendUserId: string): Promise<{ success: boolean }> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<{ success: boolean }>(`/users/${userId}/friends/${friendUserId}`, {
      method: 'DELETE',
    });
  }

  async blockUser(targetUserId: string): Promise<{ success: boolean }> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<{ success: boolean }>('/users/block', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        blockedUserId: targetUserId,
      }),
    });
  }

  async unblockUser(targetUserId: string): Promise<{ success: boolean }> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<{ success: boolean }>('/users/unblock', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        unblockedUserId: targetUserId,
      }),
    });
  }

  async getFriendActivity(limit = 50): Promise<FriendActivityResponse> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<FriendActivityResponse>(
      `/users/${userId}/friends/activity?limit=${limit}`
    );
  }

  async searchFriends(query: string): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: '20',
    });

    return this.makeRequest<SearchResponse>(`/users/search?${params}`);
  }

  async getSuggestedFriends(limit = 10): Promise<FriendsResponse> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    return this.makeRequest<FriendsResponse>(`/users/${userId}/suggested-friends?limit=${limit}`);
  }

  // Purchase intent tracking
  async trackPurchaseIntent(gameId: string, response: 'yes' | 'no' | 'ask-later', sessionId?: string): Promise<{ success: boolean; timestamp: string }> {
    const userId = await safeAuthService.getCurrentUserId();
    if (!userId) {
      logger.error('Cannot track purchase intent without user ID');
      throw new Error('User ID required for purchase intent tracking');
    }

    return this.makeRequest<{ success: boolean; timestamp: string }>(`/games/${gameId}/purchase-intent`, {
      method: 'POST',
      body: JSON.stringify({
        response,
        sessionId: sessionId || `session-${Date.now()}`,
      }),
    });
  }

  // Guest mode configuration
  setGuestMode(isGuest: boolean) {
    this.isGuestMode = isGuest;
    if (!isGuest) {
      guestCredentials = null;
    }
  }

  isInGuestMode(): boolean {
    return this.isGuestMode;
  }
}

// Export singleton instance
const triollAPI = new TriollAPI();

// Export function to configure API for guest mode
export const configureAPIForGuest = (credentials: {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  expiration?: Date;
  identityId: string;
}) => {
  // For guest mode, we primarily need the identityId
  guestCredentials = {
    accessKeyId: credentials.accessKeyId || '',
    secretAccessKey: credentials.secretAccessKey || '',
    sessionToken: credentials.sessionToken,
    expiration: credentials.expiration,
    identityId: credentials.identityId,
  };
  triollAPI.setGuestMode(true);
  logger.info('API configured for guest mode', { identityId: credentials.identityId });
};

// Export function to check if in guest mode
export const isGuestMode = () => triollAPI.isInGuestMode();

export default triollAPI;
