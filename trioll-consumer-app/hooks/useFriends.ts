
import { useState, useEffect, useCallback } from 'react';
import triollAPI from '../src/services/api/TriollAPI';
import { getLogger } from '../src/utils/logger';
import { ApiError } from '../src/services/api/errorHandler';

const logger = getLogger('useFriends');

// Define proper types
interface Friend {
  id: string;
  username: string;
  realName: string;
  avatar: string;
  isOnline: boolean;
  lastActive: string;
  currentlyPlaying?: {
    gameId: string;
    gameName: string;
    gameCover: string;
  };
  mutualFriends: number;
  gamesInCommon: number;
}

interface FriendRequest {
  id: string;
  user: Friend;
  type: 'incoming' | 'sent';
  message?: string;
  timestamp: string;
  mutualFriends: string[];
}

interface Activity {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  type: 'playing' | 'achievement';
  gameId: string;
  gameName: string;
  gameCover: string;
  achievement?: string;
  timestamp: string;
}

type Suggestion = Friend;

// Helper to check if error is an ApiError
const isApiError = (error: unknown): error is ApiError => {
  return (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    'code' in error
  );
};


interface UseFriendsResult {
  friends: Friend[];
  friendRequests: FriendRequest[];
  activities: Activity[];
  suggestions: Suggestion[];
  loading: boolean;
  isUsingApiData: boolean;
  error: string | null;

  // Actions
  sendFriendRequest: (userId: string, message?: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  searchFriends: (query: string) => Promise<Friend[]>;
  refreshData: () => Promise<void>;
}

export const useFriends = (): UseFriendsResult => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingApiData, setIsUsingApiData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to load from API
      const [friendsData, requestsData, activityData, suggestionsData] = await Promise.all([
        triollAPI.getFriends(),
        triollAPI.getFriendRequests(),
        triollAPI.getFriendActivity(),
        triollAPI.getSuggestedFriends(),
      ]);

      if (friendsData && Array.isArray(friendsData)) {
        // Extract data from API responses
        const friendsResponse = friendsData as unknown;
        const requestsResponse = requestsData as unknown;
        const activityResponse = activityData as unknown;
        const suggestionsResponse = suggestionsData as unknown;

        setFriends(friendsResponse?.friends || []);
        setFriendRequests(requestsResponse?.requests || []);
        setActivities(activityResponse?.activities || []);
        setSuggestions(suggestionsResponse?.friends || []);
        setIsUsingApiData(true);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (err) {
      // Fallback to mock data
      logger.info('Friends API failed, using mock data', { error: err });
      setFriends([]);
      setFriendRequests([]);
      setActivities([]);
      setSuggestions([]);
      setIsUsingApiData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sendFriendRequest = async (userId: string, message?: string) => {
    try {
      await triollAPI.sendFriendRequest(userId, message);
      // Refresh data to show updated state
      await loadData();
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Friend request requires authentication');
      } else {
        logger.error('Failed to send friend request:', err);
      }
      throw err;
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      await triollAPI.acceptFriendRequest(requestId);

      // Optimistic update: move request to friends list
      const request = friendRequests.find(r => r.id === requestId);
      if (request) {
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        setFriends(prev => [...prev, request.user]);
      }

      // Refresh from API
      loadData();
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Accept friend request requires authentication');
      } else {
        logger.error('Failed to accept friend request:', err);
      }
      // Revert optimistic update
      loadData();
      throw err;
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await triollAPI.rejectFriendRequest(requestId);

      // Optimistic update
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));

      // Refresh from API
      loadData();
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Reject friend request requires authentication');
      } else {
        logger.error('Failed to reject friend request:', err);
      }
      // Revert optimistic update
      loadData();
      throw err;
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await triollAPI.removeFriend(friendId);

      // Optimistic update
      setFriends(prev => prev.filter(f => f.id !== friendId));

      // Refresh from API
      loadData();
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Remove friend requires authentication');
      } else {
        logger.error('Failed to remove friend:', err);
      }
      // Revert optimistic update
      loadData();
      throw err;
    }
  };

  const blockUser = async (userId: string) => {
    try {
      await triollAPI.blockUser(userId);

      // Remove from friends and requests
      setFriends(prev => prev.filter(f => f.id !== userId));
      setFriendRequests(prev => prev.filter(r => r.user.id !== userId));

      // Refresh from API
      loadData();
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Block user requires authentication');
      } else {
        logger.error('Failed to block user:', err);
      }
      // Revert optimistic update
      loadData();
      throw err;
    }
  };

  const searchFriends = async (query: string): Promise<Friend[]> => {
    try {
      const results = await triollAPI.searchFriends(query);
      // Extract results from search response
      const searchResponse = results as unknown;
      return searchResponse?.results || [];
    } catch (err: unknown) {
      if (isApiError(err) && (err.code === 'AUTH_ERROR' || err.statusCode === 403 || err.statusCode === 401)) {
        logger.info('Search friends requires authentication');
      } else {
        logger.error('Failed to search friends:', err);
      }

      // Fallback to local search
      const lowerQuery = query.toLowerCase();
      return friends.filter(
        f =>
          f.username.toLowerCase().includes(lowerQuery) ||
          f.realName.toLowerCase().includes(lowerQuery)
      );
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  return {
    friends,
    friendRequests,
    activities,
    suggestions,
    loading,
    isUsingApiData,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    searchFriends,
    refreshData,
  };
};
