/**
 * User Helper Utilities
 * Provides consistent methods for working with User objects and guest status
 */

import { User } from '../types/api.types';
import { generateGuestAvatar, generateUserAvatar, getAvatarUrl } from './avatarGenerator';

/**
 * Check if a user is a guest based on multiple indicators
 */
export function isGuestUser(user: User | null | undefined): boolean {
  if (!user) return true; // No user means guest
  
  return !!(
    user.isGuest ||
    user.id?.startsWith('guest_') ||
    user.guestId ||
    !user.email
  );
}

/**
 * Check if a user has been converted from guest
 */
export function isConvertedUser(user: User): boolean {
  return !!(user.convertedFromGuest && user.originalGuestId);
}

/**
 * Get display name for a user (handles guests properly)
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'Guest';
  
  if (isGuestUser(user)) {
    return user.username || `Guest_${user.id?.substr(-6) || 'User'}`;
  }
  
  return user.username || user.email?.split('@')[0] || 'User';
}

/**
 * Check if user can access a feature (some features may be limited for guests)
 */
export function canAccessFeature(user: User | null | undefined, feature: string): boolean {
  // Define features that require authentication
  const authRequiredFeatures = [
    'friends',
    'cloud-save',
    'achievements-unlock', // Viewing is ok, unlocking requires auth
    'profile-customization',
    'developer-portal'
  ];
  
  if (authRequiredFeatures.includes(feature)) {
    return !isGuestUser(user);
  }
  
  // All other features are available to guests
  return true;
}

/**
 * Get user avatar with guest fallback
 */
export function getUserAvatar(user: User | null | undefined): string {
  if (!user) {
    return generateGuestAvatar('guest_anonymous');
  }
  
  // Generate avatar based on user type
  if (isGuestUser(user)) {
    return getAvatarUrl(user.avatarUrl, user.guestId || user.id, getUserDisplayName(user));
  }
  
  return getAvatarUrl(user.avatarUrl, user.id, getUserDisplayName(user));
}

/**
 * Format user statistics for display
 */
export function formatUserStats(user: User | null | undefined) {
  if (!user) {
    return {
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      achievementsUnlocked: 0,
      playTime: '0h'
    };
  }
  
  const stats = user.stats || {};
  const playTimeHours = Math.floor((stats.totalPlayTime || 0) / 3600);
  
  return {
    level: user.level || 1,
    xp: user.xp || 0,
    gamesPlayed: user.gamesPlayed || stats.gamesPlayed || 0,
    achievementsUnlocked: stats.achievementsUnlocked || 0,
    playTime: `${playTimeHours}h`
  };
}

/**
 * Check if user data should be synced (for guest to user conversion)
 */
export function shouldSyncGuestData(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // If user was converted from guest and hasn't synced yet
  return !!(user.convertedFromGuest && !user.lastSyncedAt);
}

/**
 * Get welcome message based on user type
 */
export function getWelcomeMessage(user: User | null | undefined): string {
  if (!user || isGuestUser(user)) {
    return 'Welcome! You\'re playing as a guest.';
  }
  
  if (isConvertedUser(user)) {
    return `Welcome back, ${getUserDisplayName(user)}! Your progress has been saved.`;
  }
  
  return `Welcome back, ${getUserDisplayName(user)}!`;
}

/**
 * Prepare user data for API calls (removes guest-only fields for non-guests)
 */
export function prepareUserForAPI(user: User): Partial<User> {
  const { 
    guestId, 
    guestCreatedAt, 
    originalGuestId,
    ...userData 
  } = user;
  
  // Only include guest fields if user is actually a guest
  if (isGuestUser(user)) {
    return user;
  }
  
  return userData;
}