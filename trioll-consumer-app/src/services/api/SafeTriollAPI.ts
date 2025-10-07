
 
/**
 * Safe Trioll API wrapper with fallback support
 * Gracefully handles API failures without crashing the app
 */

import triollAPIInstance from './TriollAPI';
import { dummyGames } from '../../../data/dummyGames';
import { OFFLINE_EVOLUTION_RUNNER } from '../../utils/offlineGameAssets';
import { UserProfileUpdate } from './types';

class SafeTriollAPI {
  private api = triollAPIInstance;
  private isConnected = true;

  async checkConnection(): Promise<boolean> {
    try {
      // Try a simple API call to check connectivity
      // Note: AbortSignal.timeout might not be available in React Native
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        await this.api.makeRequest('/health', {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        this.isConnected = true;
        return true;
      } catch {
        clearTimeout(timeoutId);
        throw new Error("API connection failed");
      }
    } catch {
      // API connection check failed, will use fallback data
      this.isConnected = false;
      return false;
    }
  }

  async getGames(limit = 20, category?: string) {
    try {
      if (!this.isConnected) {
        // Return Evolution Runner when not connected
        return { games: this.getEvolutionRunnerOnly(), isUsingFallback: true };
      }

      const response = await this.api.getGames(limit, category);
      this.isConnected = true; // Mark as connected on success


      // Return ALL games without filtering
      return {
        ...response,
        games: response.games,
      };
    } catch {
      // Failed to fetch games from API
      this.isConnected = false;
      // Return Evolution Runner for testing
      return {
        games: this.getEvolutionRunnerOnly(),
        isUsingFallback: true,
      };
    }
  }

  private getEvolutionRunnerOnly() {
    // If connected, try to use online URLs, otherwise use offline version
    if (this.isConnected) {
      return [
        {
          id: 'evolution-runner-001',
          title: 'Evolution Runner',
          tagline: 'Evolve through the ages',
          description: 'Run through evolution in this fast-paced racing game!',
          thumbnailUrl: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/thumbnail.png',
          coverUrl: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/thumbnail.png',
          genre: 'Racing',
          rating: 4.6,
          ratingCount: 250,
          developerName: 'Frederick',
          publisherName: 'Trioll Games',
          releaseDate: '2025-01-03',
          trialDuration: 5,
          price: 0,
          downloads: 10000,
          downloadSize: '100 MB',
          tags: ['Casual', 'Racing', 'New'],
          likeCount: 0,
          playCount: 10000,
          trialType: 'webview' as const,
          trialUrl: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/index.html',
          gameUrl: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/Evolution-Runner/index.html',
        },
      ];
    } else {
      // Return offline version when not connected
      return [OFFLINE_EVOLUTION_RUNNER];
    }
  }

  async getFeaturedGames(limit = 10) : Promise<void> {
    try {
      if (!this.isConnected) {
        return { games: [], isUsingFallback: false };
      }

      const response = await this.api.getFeaturedGames(limit);
      this.isConnected = true;

      // Return ALL featured games without filtering
      return {
        ...response,
        games: response.games,
      };
    } catch {
      // Failed to fetch featured games from API
      this.isConnected = false;
      return { games: [], isUsingFallback: false };
    }
  }

  async searchGames(query: string, limit = 20) {
    try {
      if (!this.isConnected) {
        return { games: [], isUsingFallback: false };
      }

      const response = await this.api.searchGames(query, limit);
      this.isConnected = true;

      // Return ALL search results without filtering
      return {
        ...response,
        games: response.games,
      };
    } catch {
      // Failed to search games from API
      this.isConnected = false;
      // If searching for evolution, return Evolution Runner
      if (query.toLowerCase().includes('evolution') || query.toLowerCase().includes('runner')) {
        return { games: this.getEvolutionRunnerOnly(), isUsingFallback: false };
      }
      return { games: [], isUsingFallback: false };
    }
  }

  async getGameDetails(gameId: string) {
    try {
      if (!this.isConnected) {
        // Return Evolution Runner if it's requested
        const validGameIds = ['evolution-runner-001', 'Evolution-Runner'];
        if (validGameIds.includes(gameId)) {
          return { game: this.getEvolutionRunnerOnly()[0], isUsingFallback: false };
        }
        return { game: null, isUsingFallback: false };
      }

      const response = await this.api.getGameDetails(gameId);
      this.isConnected = true;

      // Return the game without filtering
      return response;
    } catch {
      // Failed to fetch game details from API
      this.isConnected = false;

      // Return Evolution Runner if it's requested
      const validGameIds = ['evolution-runner-001', 'Evolution-Runner'];
      if (validGameIds.includes(gameId)) {
        return { game: this.getEvolutionRunnerOnly()[0], isUsingFallback: false };
      }
      return { game: null, isUsingFallback: false };
    }
  }

  // Interaction methods - store locally if API fails
  async likeGame(gameId: string) {
    try {
      if (!this.isConnected) {
        // API not connected, storing like locally
        return { success: true, stored: 'local' };
      }
      return await this.api.likeGame(gameId);
    } catch {
      // Failed to like game via API
      // Failed to like game via API, storing locally
      return { success: true, stored: 'local' };
    }
  }

  async unlikeGame(gameId: string) {
    try {
      if (!this.isConnected) {
        // API not connected, storing unlike locally
        return { success: true, stored: 'local' };
      }
      return await this.api.unlikeGame(gameId);
    } catch {
      // Failed to unlike game via API, storing locally
      return { success: true, stored: 'local' };
    }
  }

  async bookmarkGame(gameId: string) {
    try {
      if (!this.isConnected) {
        // API not connected, storing bookmark locally
        return { success: true, stored: 'local' };
      }
      return await this.api.bookmarkGame(gameId);
    } catch {
      // Failed to bookmark game via API, storing locally
      return { success: true, stored: 'local' };
    }
  }

  async unbookmarkGame(gameId: string) {
    try {
      if (!this.isConnected) {
        // API not connected, removing bookmark locally
        return { success: true, stored: 'local' };
      }
      return await this.api.unbookmarkGame(gameId);
    } catch {
      // Failed to unbookmark game via API, removing locally
      return { success: true, stored: 'local' };
    }
  }

  async rateGame(gameId: string, rating: number) {
    try {
      if (!this.isConnected) {
        // API not connected, storing rating locally
        return { success: true, stored: 'local', rating };
      }
      return await this.api.rateGame(gameId, rating);
    } catch {
      // Failed to rate game via API, storing locally
      return { success: true, stored: 'local', rating };
    }
  }

  async playGame(gameId: string, sessionId?: string, duration?: number) {
    try {
      if (!this.isConnected) {
        // API not connected, storing play data locally
        return { success: true, stored: 'local' };
      }
      return await this.api.playGame(gameId, sessionId, duration);
    } catch {
      // Failed to record play via API, storing locally
      return { success: true, stored: 'local' };
    }
  }

  // Friends API methods
  async getFriends(userId?: string) {
    try {
      if (!this.isConnected) {
        return [];
      }
      return await this.api.getFriends(userId);
    } catch {
      this.isConnected = false;
      return [];
    }
  }

  async getFriendRequests() : Promise<void> {
    try {
      if (!this.isConnected) {
        return [];
      }
      return await this.api.getFriendRequests();
    } catch {
      this.isConnected = false;
      return [];
    }
  }

  async sendFriendRequest(targetUserId: string, message?: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.sendFriendRequest(targetUserId, message);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async acceptFriendRequest(requestId: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.acceptFriendRequest(requestId);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async rejectFriendRequest(requestId: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.rejectFriendRequest(requestId);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async removeFriend(friendUserId: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.removeFriend(friendUserId);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async blockUser(targetUserId: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.blockUser(targetUserId);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async unblockUser(targetUserId: string) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local' };
      }
      return await this.api.unblockUser(targetUserId);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local' };
    }
  }

  async getFriendActivity(limit?: number) {
    try {
      if (!this.isConnected) {
        return [];
      }
      return await this.api.getFriendActivity(limit);
    } catch {
      this.isConnected = false;
      return [];
    }
  }

  async searchFriends(query: string) {
    try {
      if (!this.isConnected) {
        return [];
      }
      return await this.api.searchFriends(query);
    } catch {
      this.isConnected = false;
      return [];
    }
  }

  async getSuggestedFriends(limit?: number) {
    try {
      if (!this.isConnected) {
        return [];
      }
      return await this.api.getSuggestedFriends(limit);
    } catch {
      this.isConnected = false;
      return [];
    }
  }

  async getUserProfile(userId?: string) {
    try {
      if (!this.isConnected) {
        return { success: false };
      }
      return await this.api.getUserProfile(userId);
    } catch {
      this.isConnected = false;
      return { success: false };
    }
  }

  async updateUserProfile(data: UserProfileUpdate) {
    try {
      if (!this.isConnected) {
        return { success: true, stored: 'local', data };
      }
      return await this.api.updateUserProfile(data);
    } catch {
      this.isConnected = false;
      return { success: true, stored: 'local', data };
    }
  }

  // Fallback methods
  private async getFallbackGames(limit: number, category?: string) {
    let games = dummyGames;
    if (category) {
      games = games.filter(g => g.genre.toLowerCase() === category.toLowerCase());
    }
    games = games.slice(0, limit);
    return { games, isUsingFallback: true };
  }

  private async getFallbackFeaturedGames(limit: number) {
    const games = dummyGames.filter(g => g.featured).slice(0, limit);
    return { games, isUsingFallback: true };
  }

  private async getFallbackSearchResults(query: string, limit: number) {
    const games = dummyGames
      .filter(
        g =>
          g.title.toLowerCase().includes(query.toLowerCase()) ||
          g.genre.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
    return { games, isUsingFallback: true };
  }

  private async getFallbackGameDetails(gameId: string) {
    const game = dummyGames.find(g => g.id === gameId);
    return { game: game || dummyGames[0], isUsingFallback: true };
  }

  // Check if using fallback data
  isUsingFallback(): boolean {
    return !this.isConnected;
  }
}

// Export singleton instance
export const safeAPI = new SafeTriollAPI();

// Also export the class for testing
export default SafeTriollAPI;
