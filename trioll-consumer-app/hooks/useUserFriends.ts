
import { useState, useEffect } from 'react';
import { safeAPI } from '../src/services/api/SafeTriollAPI';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('useUserFriends');

interface Friend {
  id: string;
  username: string;
  realName: string;
  avatar: string;
  isOnline: boolean;
  lastActive: string;
  mutualFriends?: number;
  gamesInCommon?: number;
}

interface UseUserFriendsResult {
  friends: Friend[];
  totalFriends: number;
  loading: boolean;
}

export const useUserFriends = (userId?: string): UseUserFriendsResult => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      if (!userId) {
        setFriends([]);
        setTotalFriends(0);
        setLoading(false);
        return;
      }

      try {
        const friendsData = await safeAPI.getFriends(userId);
        if (Array.isArray(friendsData)) {
          setFriends(friendsData.slice(0, 6)); // Show first 6 friends
          setTotalFriends(friendsData.length);
        } else {
          setFriends([]);
          setTotalFriends(0);
        }
      } catch (error) {
        logger.error('Failed to load friends:', error);
        setFriends([]);
        setTotalFriends(0);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [userId]);

  return { friends, totalFriends, loading };
};
