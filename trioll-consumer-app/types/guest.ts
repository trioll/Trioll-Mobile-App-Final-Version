
// Guest user types and interfaces

export interface GuestProfile {
  guestId: string;
  username: string; // Guest username (e.g., Guest123456)
  createdAt: string;
  expiresAt: string; // 30 days from creation
  stats: GuestStats;
  preferences: GuestPreferences;
}

export interface GuestStats {
  trialsPlayed: number;
  totalPlayTime: number; // in seconds
  gamesBookmarked: string[];
  lastActiveAt: string;
  // RPG stats
  likesGiven?: number;
  totalTimeSpentMinutes?: number;
  hoursPlayed?: number;
  ratingsGiven?: number;
  currentStreak?: number;
  winStreak?: number;
  gamesPlayed?: number;
  gamesShared?: number;
  gamesCompleted?: number;
}

export interface GuestPreferences {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
}

export interface GuestTrialHistory {
  gameId: string;
  startedAt: string;
  duration: number; // in seconds
  completed: boolean;
}

export interface GuestRating {
  gameId: string;
  rating: number; // 1-5
  createdAt: string;
}

export interface PendingMergeData {
  guestId: string;
  trialHistory: GuestTrialHistory[];
  bookmarkedGames: string[];
  ratings: GuestRating[];
  preferences: GuestPreferences;
  stats: GuestStats;
}

export interface GuestLimitations {
  maxTrialHistory: number; // Unlimited
  canAddFriends: false;
  canEarnAchievements: false;
  canUseCloudSave: false;
  canAccessFullHistory: false;
}

export const GUEST_LIMITATIONS: GuestLimitations = {
  maxTrialHistory: 999999, // Effectively unlimited
  canAddFriends: false,
  canEarnAchievements: false,
  canUseCloudSave: false,
  canAccessFullHistory: false,
};

export const GUEST_EXPIRY_DAYS = 30;
export const GUEST_WARNING_DAYS = [25, 28, 29, 30];

export interface GuestWarningState {
  showBanner: boolean;
  showModal: boolean;
  daysRemaining: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Helper functions for guest data
export const calculateDaysRemaining = (expiresAt: string): number => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getWarningLevel = (daysRemaining: number): GuestWarningState['warningLevel'] => {
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 5) return 'medium';
  return 'low';
};

export const shouldShowWarning = (daysRemaining: number): boolean => {
  return GUEST_WARNING_DAYS.includes(GUEST_EXPIRY_DAYS - daysRemaining);
};
