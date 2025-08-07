import type { Game, User } from './../src/types/api.types';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { Comment } from '../types/index';
import {
  GuestProfile,
  GuestTrialHistory,
  GuestRating,
  GuestWarningState,
  PendingMergeData,
  GUEST_LIMITATIONS,
  calculateDaysRemaining,
  getWarningLevel,
  shouldShowWarning,
} from '../types/guest';
import { getOrCreateGuestProfile, updateGuestProfile, addTrialToHistory, getTrialHistory, toggleBookmark as toggleGuestBookmark, addRating, getRatings, prepareMergeData } from '../utils/guestStorage';
import { incrementUserStat, updateUserPlayTime } from '../utils/userStatsStorage';
import { safeAPI } from '../src/services/api/SafeTriollAPI';
import { dummyGames } from '../data/dummyGames';
import { amplifyAuthService } from '../src/services/auth/amplifyAuthService';
import { safeAuthService } from '../src/services/auth/safeAuthService';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('AppContext');
interface AppContextType {
  // User state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isGuest: boolean;

  // Guest state
  guestProfile: GuestProfile | null;
  guestWarning: GuestWarningState;
  guestTrialHistory: GuestTrialHistory[];
  guestRatings: GuestRating[];
  pendingMergeData: PendingMergeData | null;

  // Guest actions
  initializeGuest: () => Promise<void>;
  updateGuestPreferences: (preferences: Partial<GuestProfile['preferences']>) => Promise<void>;
  recordTrialPlay: (gameId: string, duration: number, completed: boolean) => Promise<void>;
  rateGameAsGuest: (gameId: string, rating: number) => Promise<void>;
  prepareGuestDataForMerge: () => Promise<PendingMergeData>;
  dismissWarning: () => void;
  showRegisterModal: () => void;

  // Games state
  games: Game[];
  setGames: (games: Game[]) => void;

  // Interactions state
  likes: Set<string>;
  bookmarks: Set<string>;
  comments: { [gameId: string]: Comment[] };

  // Interaction actions
  toggleLike: (gameId: string) => void;
  toggleBookmark: (gameId: string) => Promise<void>;
  addComment: (gameId: string, text: string) => void;

  // Trial state
  currentTrialGameId: string | null;
  setCurrentTrialGameId: (gameId: string | null) => void;

  // Feed state
  currentGameIndex: number;
  setCurrentGameIndex: (index: number) => void;

  // Modal states
  showRegisterBenefitsModal: boolean;
  setShowRegisterBenefitsModal: (show: boolean) => void;

  // User preferences
  userPreferences?: {
    favoriteGenres?: string[];
    notifications?: { [key: string]: boolean };
    theme?: 'dark' | 'light';
  };
  setUserPreferences: (prefs: {
    favoriteGenres?: string[];
    notifications?: { [key: string]: boolean };
    theme?: 'dark' | 'light';
  }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize as guest by default
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Guest state
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [guestWarning, setGuestWarning] = useState<GuestWarningState>({
    showBanner: false,
    showModal: false,
    daysRemaining: 30,
    warningLevel: 'low',
  });
  const [guestTrialHistory, setGuestTrialHistory] = useState<GuestTrialHistory[]>([]);
  const [guestRatings, setGuestRatings] = useState<GuestRating[]>([]);
  const [pendingMergeData, setPendingMergeData] = useState<PendingMergeData | null>(null);
  const [showRegisterBenefitsModal, setShowRegisterBenefitsModal] = useState(false);

  // Games will be loaded from dummy data which contains all S3 bucket games
  const [games, setGames] = useState<Game[]>([]);

  // Interaction states
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<{ [gameId: string]: Comment[] }>({});

  // Trial and feed states
  const [currentTrialGameId, setCurrentTrialGameId] = useState<string | null>(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // User preferences
  const [userPreferences, setUserPreferences] = useState<{
    favoriteGenres?: string[];
    notifications?: { [key: string]: boolean };
    theme?: 'dark' | 'light';
  }>({});

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Try to initialize Amplify auth
        const authState = await amplifyAuthService.initialize();
        
        if (authState.isGuest) {
          // Initialize as guest
          await initializeGuest();
          
          // Store Amplify identity ID in guest profile
          if (guestProfile && authState.identityId) {
            const updatedProfile = {
              ...guestProfile,
              identityId: authState.identityId
            };
            await updateGuestProfile(updatedProfile);
            setGuestProfile(updatedProfile);
          }
        } else {
          // User is authenticated
          setIsGuest(false);
          setCurrentUser({
            id: authState.identityId || '',
            username: authState.user?.username || '',
            email: authState.user?.username || '', // Amplify uses username as email
            isGuest: false
          });
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
        // Fall back to guest mode
        await initializeGuest();
      }
    };
    init();
  }, []);

  // Check guest warning status periodically
  useEffect(() => {
    if (!guestProfile) return;

    const checkWarning = () => {
      try {
        const daysRemaining = calculateDaysRemaining(guestProfile.expiresAt);
        const warningLevel = getWarningLevel(daysRemaining);
        const showWarning = shouldShowWarning(daysRemaining);

        setGuestWarning({
          showBanner: showWarning && daysRemaining > 0,
          showModal: daysRemaining <= 0,
          daysRemaining,
          warningLevel,
        });
      } catch (error) {
        logger.error('Error checking guest warning:', error);
      }
    };

    checkWarning();
    const interval = setInterval(checkWarning, 1000 * 60 * 60); // Check every hour

    return () => clearInterval(interval);
  }, [guestProfile]);

  // Guest initialization
  const initializeGuest = async () => {
    try {
      const profile = await getOrCreateGuestProfile();
      setGuestProfile(profile);
      setIsGuest(true);

      // Load guest data
      const history = await getTrialHistory();
      setGuestTrialHistory(history);

      const ratings = await getRatings();
      setGuestRatings(ratings);

      // Set bookmarks from profile (handle legacy profiles without stats)
      if (profile.stats?.gamesBookmarked) {
        setBookmarks(new Set(profile.stats.gamesBookmarked));
      } else {
        // Initialize empty bookmarks for legacy profiles
        setBookmarks(new Set());
      }
    } catch (error) {
      logger.error('Error initializing guest:', error);
    }
  };

  // Update guest preferences
  const updateGuestPreferences = async (preferences: Partial<GuestProfile['preferences']>) => {
    if (!guestProfile) return;

    const updated = {
      ...guestProfile,
      preferences: { ...guestProfile.preferences, ...preferences },
    };

    await updateGuestProfile(updated);
    setGuestProfile(updated);
  };

  // Record trial play
  const recordTrialPlay = async (gameId: string, duration: number, completed: boolean) => {
    // Record trial for guest users in history
    if (isGuest) {
      const trial: GuestTrialHistory = {
        gameId,
        startedAt: new Date().toISOString(),
        duration,
        completed,
      };

      await addTrialToHistory(trial);

      // Update local state
      const newHistory = [trial, ...guestTrialHistory];
      if (newHistory.length > GUEST_LIMITATIONS.maxTrialHistory) {
        newHistory.pop();
      }
      setGuestTrialHistory(newHistory);
    }

    // Update RPG stats for all users (both guest and registered)
    try {
      const userId = await safeAuthService.getCurrentUserId();
      await incrementUserStat(userId, 'trialsPlayed', 1); // Speed stat
      await incrementUserStat(userId, 'gamesPlayed', 1); // Also for Speed stat
      
      // Update play time in minutes (Accuracy stat)
      const minutes = Math.floor(duration / 60);
      if (minutes > 0) {
        await updateUserPlayTime(userId, minutes);
      }
    } catch (error) {
      logger.error('Failed to update trial play stats:', error);
    }
  };

  // Rate game (works for both guest and registered users)
  const rateGameAsGuest = async (gameId: string, rating: number) => {
    // Store rating locally for guest users
    if (isGuest) {
      const guestRating: GuestRating = {
        gameId,
        rating,
        createdAt: new Date().toISOString(),
      };

      await addRating(guestRating);

      // Update local state
      const newRatings = guestRatings.filter(r => r.gameId !== gameId);
      newRatings.push(guestRating);
      setGuestRatings(newRatings);
    }
    
    // Update RPG stats for all users (Intelligence stat)
    try {
      const userId = await safeAuthService.getCurrentUserId();
      await incrementUserStat(userId, 'ratingsGiven', 1);
    } catch (error) {
      logger.error('Failed to update rating stats:', error);
    }
  };

  // Prepare data for merge
  const prepareGuestDataForMerge = async () => {
    const mergeData = await prepareMergeData();
    setPendingMergeData(mergeData);
    return mergeData;
  };

  // Dismiss warning
  const dismissWarning = () => {
    setGuestWarning(prev => ({ ...prev, showBanner: false }));
  };

  // Show register modal
  const showRegisterModal = () => {
    setShowRegisterBenefitsModal(true);
  };

  // Interaction actions
  const toggleLike = useCallback(
    async (gameId: string) => {
      const wasLiked = likes.has(gameId);

      // Update local state immediately for responsive UI
      setLikes(prev => {
        const newLikes = new Set(prev);
        if (newLikes.has(gameId)) {
          newLikes.delete(gameId);
        } else {
          newLikes.add(gameId);
        }
        return newLikes;
      });

      // Update local stats if liking (not unliking) - works for both guest and registered users
      if (!wasLiked) {
        try {
          const userId = await safeAuthService.getCurrentUserId();
          await incrementUserStat(userId, 'likesGiven', 1);
        } catch (error) {
          logger.error('Failed to update local like stats:', error);
        }
      }

      // Update the game's like count
      setGames(prevGames => {
        const updatedGames = prevGames.map(game => 
          game.id === gameId 
            ? { 
                ...game, 
                likeCount: (game.likeCount || 0) + (wasLiked ? -1 : 1)
              }
            : game
        );
        // Log the update for debugging
        const updatedGame = updatedGames.find(g => g.id === gameId);
        if (updatedGame) {
          logger.info('Like count updated', { 
            gameId, 
            newCount: updatedGame.likeCount,
            wasLiked
          });
        }
        return updatedGames;
      });

      // Send to backend
      try {
        const response = !wasLiked 
          ? await safeAPI.likeGame(gameId)
          : await safeAPI.unlikeGame(gameId);

        // Update with actual count from backend if available
        if (response && typeof response.totalLikes === 'number') {
          setGames(prevGames => 
            prevGames.map(game => 
              game.id === gameId 
                ? { ...game, likeCount: response.totalLikes }
                : game
            )
          );
        }
      } catch (error) {
        logger.debug('Like API error but keeping optimistic update:', error);
        // For now, keep the optimistic update since backend is having issues
        // In production, you might want to show a toast notification
        // that the like will be synced when connection is restored
        
        // Commented out reverting logic to keep the UI responsive
        /*
        // If backend fails, revert local state
        setLikes(prev => {
          const newLikes = new Set(prev);
          if (wasLiked) {
            newLikes.add(gameId);
          } else {
            newLikes.delete(gameId);
          }
          return newLikes;
        });
        
        // Revert the like count
        setGames(prevGames => 
          prevGames.map(game => 
            game.id === gameId 
              ? { 
                  ...game, 
                  likeCount: (game.likeCount || 0) + (wasLiked ? 1 : -1)
                }
              : game
          )
        );
        */
      }
    },
    [likes]
  );

  const toggleBookmark = useCallback(
    async (gameId: string) => {
      if (isGuest) {
        // Update guest bookmarks
        const isBookmarked = await toggleGuestBookmark(gameId);
        setBookmarks(prev => {
          const newBookmarks = new Set(prev);
          if (isBookmarked) {
            newBookmarks.add(gameId);
          } else {
            newBookmarks.delete(gameId);
          }
          return newBookmarks;
        });
      } else {
        // Regular user bookmark logic
        const wasBookmarked = bookmarks.has(gameId);

        // Update local state immediately
        setBookmarks(prev => {
          const newBookmarks = new Set(prev);
          if (newBookmarks.has(gameId)) {
            newBookmarks.delete(gameId);
          } else {
            newBookmarks.add(gameId);
          }
          return newBookmarks;
        });

        // Send to backend
        try {
          if (!wasBookmarked) {
            await safeAPI.bookmarkGame(gameId);
          } else {
            // Note: Backend doesn't have unbookmark yet, so we're using the same endpoint
            // This might need adjustment based on backend implementation
            await safeAPI.bookmarkGame(gameId);
          }
        } catch (error) {
          // If backend fails, revert local state
          setBookmarks(prev => {
            const newBookmarks = new Set(prev);
            if (wasBookmarked) {
              newBookmarks.add(gameId);
            } else {
              newBookmarks.delete(gameId);
            }
            return newBookmarks;
          });
        }
      }
    },
    [isGuest, bookmarks]
  );

  const addComment = useCallback(
    (gameId: string, text: string) => {
      // Comments are disabled for guests
      if (isGuest) {
        showRegisterModal();
        return;
      }

      if (!currentUser) return;

      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        gameId,
        userId: currentUser.id,
        username: currentUser.username,
        text,
        createdAt: new Date().toISOString(),
      };

      setComments(prev => ({
        ...prev,
        [gameId]: [...(prev[gameId] || []), newComment],
      }));
    },
    [currentUser, isGuest]
  );

  const value: AppContextType = {
    // User state
    currentUser,
    setCurrentUser: (user: User | null) => {
      setCurrentUser(user);
      setIsGuest(!user);
    },
    isGuest,

    // Guest state
    guestProfile,
    guestWarning,
    guestTrialHistory,
    guestRatings,
    pendingMergeData,

    // Guest actions
    initializeGuest,
    updateGuestPreferences,
    recordTrialPlay,
    rateGameAsGuest,
    prepareGuestDataForMerge,
    dismissWarning,
    showRegisterModal,

    // Games state
    games,
    setGames,

    // Interactions
    likes,
    bookmarks,
    comments,
    toggleLike,
    toggleBookmark,
    addComment,

    // Trial state
    currentTrialGameId,
    setCurrentTrialGameId,

    // Feed state
    currentGameIndex,
    setCurrentGameIndex,

    // Modal states
    showRegisterBenefitsModal,
    setShowRegisterBenefitsModal,

    // User preferences
    userPreferences,
    setUserPreferences,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
