
import { useState, useEffect, useRef } from 'react';
import triollAPI from '../services/api/TriollAPI';
import { Config } from '../config/environments';
import { generateUserAvatar } from '../utils/avatarGenerator';
import { getGuestProfile } from '../../utils/guestStorage';
import { safeAuthService } from '../services/auth/safeAuthService';
import { getUserStats } from '../../utils/userStatsStorage';
import { getLogger } from '../utils/logger';

const logger = getLogger('useUserProfile');

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  level: number;
  isOnline: boolean;
  isPro: boolean;
}

interface ProfileStats {
  trialsPlayed: number;
  hoursPlayed: number;
  gamesCompleted: number;
  achievementsUnlocked: number;
  winStreak: number;
  avgCompletionRate: number;
  likesGiven: number;
  ratingsGiven: number;
  gamesShared: number;
  totalTimeSpentMinutes: number;
  currentStreak: number;
  gamesPlayed: number;
}

interface UserProfileResponse {
  user: {
    id?: string;
    userId?: string;
    username: string;
    displayName?: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    level?: number;
    isPro?: boolean;
  };
  stats?: ProfileStats;
  xp?: {
    current: number;
    required: number;
    nextRewards: string[];
  };
  gamingDNA?: {
    genres: Array<{ name: string; percentage: number; color: string }>;
    peakHours: Array<{ hour: string; activity: number }>;
    playStyle: string[];
    insights: string[];
  };
  recentActivity?: unknown[];
  achievements?: unknown[];
  gamesLibrary?: {
    recent: number;
    favorites: number;
    inProgress: number;
    completed: number;
  };
}

export interface ProfileData {
  user: UserProfile;
  stats: ProfileStats;
  xp: {
    current: number;
    required: number;
    nextRewards: string[];
  };
  gamingDNA?: {
    genres: Array<{ name: string; percentage: number; color: string }>;
    peakHours: Array<{ hour: string; activity: number }>;
    playStyle: string[];
    insights: string[];
  };
  recentActivity?: unknown[];
  achievements?: unknown[];
  gamesLibrary?: {
    recent: number;
    favorites: number;
    inProgress: number;
    completed: number;
  };
}

// Default dummy data for fallback
const defaultProfileData: ProfileData = {
  user: {
    id: 'user123',
    username: 'TriollPlayer',
    displayName: 'Elite Gamer',
    avatar: generateUserAvatar('user123', 'Elite Gamer'),
    coverImage: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-profile-cover.png',
    bio: 'Speedrunner | Achievement Hunter | RPG Enthusiast',
    level: 42,
    isOnline: true,
    isPro: true,
  },
  stats: {
    trialsPlayed: 342,
    hoursPlayed: 156.5,
    gamesCompleted: 28,
    achievementsUnlocked: 186,
    winStreak: 12,
    avgCompletionRate: 78,
    likesGiven: 137,
    ratingsGiven: 68,
    gamesShared: 23,
    totalTimeSpentMinutes: 9390,
    currentStreak: 12,
    gamesPlayed: 342,
  },
  xp: {
    current: 8420,
    required: 10000,
    nextRewards: ['Epic Badge', 'Title: Master Gamer', '500 Coins'],
  },
  gamingDNA: {
    genres: [
      { name: 'Action', percentage: 35, color: '#FF0066' },
      { name: 'RPG', percentage: 25, color: '#0088FF' },
      { name: 'Strategy', percentage: 20, color: '#8866FF' },
      { name: 'Racing', percentage: 12, color: '#FFAA00' },
      { name: 'Puzzle', percentage: 8, color: '#00FFFF' },
    ],
    peakHours: [
      { hour: '6 AM', activity: 5 },
      { hour: '12 PM', activity: 20 },
      { hour: '6 PM', activity: 45 },
      { hour: '9 PM', activity: 80 },
      { hour: '12 AM', activity: 30 },
    ],
    playStyle: ['Completionist', 'Social', 'Competitive'],
    insights: [
      'You play 40% more on weekends',
      'Your favorite genre is Action',
      'Peak gaming time is 9-11 PM',
    ],
  },
  gamesLibrary: {
    recent: 48,
    favorites: 18,
    inProgress: 23,
    completed: 42,
  },
};

export const useUserProfile = (userId?: string) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingApiData, setIsUsingApiData] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchProfile = async () => {
    logger.info('fetchProfile called', { userId, loading });
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set a timeout to force loading to false after 5 seconds
    loadingTimeoutRef.current = setTimeout(() => {
      logger.warn('Profile loading timeout - forcing loading to false');
      setLoading(false);
      if (!profileData) {
        setProfileData(defaultProfileData);
        setError('Profile loading timed out');
      }
    }, 5000);
    
    try {
      setLoading(true);
      setError(null);

      // Check if this is the current user
      const currentUserId = await safeAuthService.getCurrentUserId();
      const isCurrentUser = !userId || userId === currentUserId;
      const isGuestUser = currentUserId?.startsWith('guest_');
      
      logger.info('Profile fetch details', { 
        currentUserId, 
        isCurrentUser, 
        isGuestUser,
        profileUserId: userId 
      });

      if (Config.USE_MOCK_API) {
        // Use mock data
        setProfileData(defaultProfileData);
        setIsUsingApiData(false);
      } else if (isGuestUser && isCurrentUser) {
        // For guest users viewing their own profile, skip API and use local data
        logger.info('Guest user profile - using local data only');
        
        const localStats = await getUserStats(currentUserId);
        const guestProfile = await getGuestProfile();
        
        if (localStats || guestProfile) {
          const guestData: ProfileData = {
            user: {
              id: guestProfile?.guestId || currentUserId,
              username: guestProfile?.username || 'Guest Player',
              displayName: guestProfile?.username || 'Guest Player',
              avatar: generateUserAvatar(currentUserId, guestProfile?.username || 'Guest Player'),
              coverImage: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-profile-cover.png',
              bio: 'Playing as guest',
              level: Math.floor((localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) / 10) + 1,
              isOnline: true,
              isPro: false,
            },
            stats: {
              trialsPlayed: localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0,
              hoursPlayed: localStats?.hoursPlayed || guestProfile?.stats?.hoursPlayed || 0,
              gamesCompleted: localStats?.gamesCompleted || guestProfile?.stats?.gamesCompleted || 0,
              achievementsUnlocked: 0,
              winStreak: localStats?.winStreak || guestProfile?.stats?.winStreak || 0,
              avgCompletionRate: 0,
              likesGiven: localStats?.likesGiven || guestProfile?.stats?.likesGiven || 0,
              ratingsGiven: localStats?.ratingsGiven || guestProfile?.stats?.ratingsGiven || 0,
              gamesShared: localStats?.gamesShared || guestProfile?.stats?.gamesShared || 0,
              totalTimeSpentMinutes: localStats?.totalTimeSpentMinutes || guestProfile?.stats?.totalTimeSpentMinutes || 0,
              currentStreak: localStats?.currentStreak || guestProfile?.stats?.currentStreak || 0,
              gamesPlayed: localStats?.gamesPlayed || guestProfile?.stats?.gamesPlayed || 0,
            },
            xp: {
              current: (localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) * 100,
              required: (Math.floor((localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) / 10) + 1) * 1000,
              nextRewards: ['Epic Badge', 'Title: Master Gamer', '500 Coins'],
            },
            gamingDNA: defaultProfileData.gamingDNA,
            recentActivity: [],
            achievements: [],
            gamesLibrary: {
              recent: localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0,
              favorites: guestProfile?.stats?.gamesBookmarked?.length || 0,
              inProgress: 0,
              completed: localStats?.gamesCompleted || guestProfile?.stats?.gamesCompleted || 0,
            },
          };
          
          setProfileData(guestData);
          setIsUsingApiData(false);
          logger.info('Guest profile set successfully');
          return;
        }
        
        // If no local data, use defaults
        setProfileData(defaultProfileData);
        setIsUsingApiData(false);
      } else {
        try {
          // Try to fetch from API for registered users only
          const response = await triollAPI.getUserProfile(userId);

          if (response) {
            // Log the response structure for debugging
            logger.info('Profile API response structure:', { 
              hasId: !!response.id,
              hasUsername: !!response.username,
              hasStats: !!response.stats,
              responseKeys: Object.keys(response).slice(0, 10)
            });

            // The API might return data in different formats
            // Check if it's wrapped in a user object or direct
            const userData = (response as any).user || response;
            
            const mappedData: ProfileData = {
              user: {
                id: userData.id || userData.userId || currentUserId,
                username: userData.username || 'TriollPlayer',
                displayName: userData.displayName || userData.username || 'Elite Gamer',
                avatar: userData.avatar || userData.avatarUrl,
                coverImage: userData.coverImage,
                bio: userData.bio,
                level: userData.level || 1,
                isOnline: true,
                isPro: false,
              },
              stats: (response as any).stats || userData.stats || defaultProfileData.stats,
              xp: (response as any).xp || userData.xp || defaultProfileData.xp,
              gamingDNA: (response as any).gamingDNA || defaultProfileData.gamingDNA,
              recentActivity: (response as any).recentActivity || [],
              achievements: (response as any).achievements || [],
              gamesLibrary: (response as any).gamesLibrary || defaultProfileData.gamesLibrary,
            };

            // If backend doesn't return the new RPG stats fields, try to augment with local data
            if (isCurrentUser && (!mappedData.stats || mappedData.stats.likesGiven === undefined)) {
              const localStats = await getUserStats(currentUserId);
              if (localStats) {
                // Use local stats if backend doesn't have them
                mappedData.stats = {
                  ...mappedData.stats,
                  likesGiven: mappedData.stats?.likesGiven ?? localStats.likesGiven,
                  ratingsGiven: mappedData.stats?.ratingsGiven ?? localStats.ratingsGiven,
                  gamesShared: mappedData.stats?.gamesShared ?? localStats.gamesShared,
                  totalTimeSpentMinutes: mappedData.stats?.totalTimeSpentMinutes ?? localStats.totalTimeSpentMinutes,
                  currentStreak: mappedData.stats?.currentStreak ?? localStats.currentStreak,
                  gamesPlayed: mappedData.stats?.gamesPlayed ?? localStats.gamesPlayed,
                  hoursPlayed: mappedData.stats?.hoursPlayed ?? localStats.hoursPlayed,
                  winStreak: mappedData.stats?.winStreak ?? localStats.winStreak,
                };
                logger.info('Augmented stats with local data:', mappedData.stats);
              }
            }

            setProfileData(mappedData);
            setIsUsingApiData(true);
          } else {
            throw new Error('Invalid profile response');
          }
        } catch (error) {
          logger.error('Failed to fetch profile from API:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            userId,
            currentUserId,
            isCurrentUser
          });
          
          // API failed, check if we can use local data for current user
          if (isCurrentUser) {
            // First try to get stats from unified storage
            const localStats = await getUserStats(currentUserId);
            const guestProfile = await getGuestProfile();
            
            if (localStats || guestProfile) {
              // Use local stats from unified storage or guest profile as fallback
              const guestData: ProfileData = {
                user: {
                  id: guestProfile?.guestId || currentUserId,
                  username: guestProfile?.username || 'TriollPlayer',
                  displayName: guestProfile?.username || 'Elite Gamer',
                  avatar: generateUserAvatar(currentUserId, guestProfile?.username || 'Elite Gamer'),
                  coverImage: 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-profile-cover.png',
                  bio: 'Speedrunner | Achievement Hunter | RPG Enthusiast',
                  level: Math.floor((localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) / 10) + 1, // Level based on trials
                  isOnline: true,
                  isPro: false,
                },
                stats: {
                  trialsPlayed: localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0,
                  hoursPlayed: localStats?.hoursPlayed || guestProfile?.stats?.hoursPlayed || 0,
                  gamesCompleted: localStats?.gamesCompleted || guestProfile?.stats?.gamesCompleted || 0,
                  achievementsUnlocked: 0, // TODO: Track achievements
                  winStreak: localStats?.winStreak || guestProfile?.stats?.winStreak || 0,
                  avgCompletionRate: 0, // TODO: Calculate from trial history
                  likesGiven: localStats?.likesGiven || guestProfile?.stats?.likesGiven || 0,
                  ratingsGiven: localStats?.ratingsGiven || guestProfile?.stats?.ratingsGiven || 0,
                  gamesShared: localStats?.gamesShared || guestProfile?.stats?.gamesShared || 0,
                  totalTimeSpentMinutes: localStats?.totalTimeSpentMinutes || guestProfile?.stats?.totalTimeSpentMinutes || 0,
                  currentStreak: localStats?.currentStreak || guestProfile?.stats?.currentStreak || 0,
                  gamesPlayed: localStats?.gamesPlayed || guestProfile?.stats?.gamesPlayed || 0,
                },
                xp: {
                  current: (localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) * 100, // 100 XP per trial
                  required: (Math.floor((localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0) / 10) + 1) * 1000, // 1000 XP per level
                  nextRewards: ['Epic Badge', 'Title: Master Gamer', '500 Coins'],
                },
                gamingDNA: defaultProfileData.gamingDNA, // TODO: Calculate from trial history
                recentActivity: [],
                achievements: [],
                gamesLibrary: {
                  recent: localStats?.trialsPlayed || guestProfile?.stats?.trialsPlayed || 0,
                  favorites: guestProfile?.stats?.gamesBookmarked?.length || 0,
                  inProgress: 0,
                  completed: localStats?.gamesCompleted || guestProfile?.stats?.gamesCompleted || 0,
                },
              };
              
              setProfileData(guestData);
              setIsUsingApiData(false);
              return;
            }
          }
          
          // Use fallback data
          setProfileData(defaultProfileData);
          setIsUsingApiData(false);
        }
      }
    } catch (error) {
      logger.error('Fatal error in fetchProfile:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      setError('Failed to load profile');
      setProfileData(defaultProfileData);
      setIsUsingApiData(false);
    } finally {
      // Clear the timeout since we're done
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      logger.info('Profile fetch complete, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Cleanup on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [userId]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return { profileData, loading, error, isUsingApiData, refreshProfile };
};
