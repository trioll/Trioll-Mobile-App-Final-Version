
/**
 * Guest Mode Configuration
 * Ensures the app always starts with guest mode enabled
 */

export const guestModeConfig = {
  // Always start as guest by default
  DEFAULT_TO_GUEST: true,

  // Allow guest users full app functionality
  GUEST_HAS_FULL_ACCESS: true,

  // Don't show any limitations for guests
  SHOW_GUEST_LIMITATIONS: false,

  // Guest user ID prefix
  GUEST_ID_PREFIX: 'guest_',

  // Guest session duration (30 days)
  GUEST_SESSION_DAYS: 30,

  // Features available to guests
  GUEST_FEATURES: {
    canPlayGames: true,
    canLikeGames: true,
    canBookmarkGames: true,
    canRateGames: true,
    canViewLeaderboards: true,
    canViewAchievements: true,
    canSaveProgress: true,
    canUseAllFeatures: true,
  },

  // Messages
  MESSAGES: {
    welcomeGuest: 'Welcome! Enjoy all features as a guest.',
    registerBenefit: 'Register to sync your progress across devices.',
  },
};
