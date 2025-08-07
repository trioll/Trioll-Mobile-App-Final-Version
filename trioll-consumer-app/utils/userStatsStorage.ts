/**
 * User stats storage utilities for managing stats for both guest and registered users
 * This provides a unified interface for tracking user interactions locally
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('userStatsStorage');

const USER_STATS_KEY_PREFIX = '@user_stats_';

interface UserStats {
  userId: string;
  likesGiven: number;
  ratingsGiven: number;
  gamesShared: number;
  trialsPlayed: number;
  gamesPlayed: number;
  totalTimeSpentMinutes: number;
  hoursPlayed: number;
  currentStreak: number;
  winStreak: number;
  gamesCompleted: number;
  lastUpdated: string;
}

/**
 * Get the storage key for a user's stats
 */
const getStatsKey = (userId: string): string => {
  return `${USER_STATS_KEY_PREFIX}${userId}`;
};

/**
 * Get stats for a specific user
 */
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const key = getStatsKey(userId);
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    
    return JSON.parse(data) as UserStats;
  } catch (error) {
    logger.error('Failed to get user stats:', error);
    return null;
  }
};

/**
 * Get or create stats for a user
 */
export const getOrCreateUserStats = async (userId: string): Promise<UserStats> => {
  const existing = await getUserStats(userId);
  if (existing) return existing;

  const newStats: UserStats = {
    userId,
    likesGiven: 0,
    ratingsGiven: 0,
    gamesShared: 0,
    trialsPlayed: 0,
    gamesPlayed: 0,
    totalTimeSpentMinutes: 0,
    hoursPlayed: 0,
    currentStreak: 0,
    winStreak: 0,
    gamesCompleted: 0,
    lastUpdated: new Date().toISOString(),
  };

  await saveUserStats(newStats);
  return newStats;
};

/**
 * Save user stats
 */
export const saveUserStats = async (stats: UserStats): Promise<void> => {
  try {
    const key = getStatsKey(stats.userId);
    stats.lastUpdated = new Date().toISOString();
    await AsyncStorage.setItem(key, JSON.stringify(stats));
  } catch (error) {
    logger.error('Failed to save user stats:', error);
  }
};

/**
 * Increment a specific stat
 */
export const incrementUserStat = async (
  userId: string,
  statName: keyof Omit<UserStats, 'userId' | 'lastUpdated'>,
  increment: number = 1
): Promise<void> => {
  const stats = await getOrCreateUserStats(userId);
  const currentValue = (stats[statName] as number) || 0;
  
  await saveUserStats({
    ...stats,
    [statName]: currentValue + increment,
  });
};

/**
 * Update play time and calculate hours
 */
export const updateUserPlayTime = async (userId: string, minutes: number): Promise<void> => {
  const stats = await getOrCreateUserStats(userId);
  const totalMinutes = stats.totalTimeSpentMinutes + minutes;
  const hours = Math.floor(totalMinutes / 60);
  
  await saveUserStats({
    ...stats,
    totalTimeSpentMinutes: totalMinutes,
    hoursPlayed: hours,
  });
};

/**
 * Update user streak
 */
export const updateUserStreak = async (userId: string, newStreak: number): Promise<void> => {
  const stats = await getOrCreateUserStats(userId);
  
  await saveUserStats({
    ...stats,
    currentStreak: newStreak,
    winStreak: Math.max(stats.winStreak, newStreak),
  });
};

/**
 * Clear stats for a user (used when logging out)
 */
export const clearUserStats = async (userId: string): Promise<void> => {
  try {
    const key = getStatsKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.error('Failed to clear user stats:', error);
  }
};

/**
 * Migrate guest stats to a registered user
 */
export const migrateGuestStats = async (guestId: string, userId: string): Promise<void> => {
  try {
    const guestStats = await getUserStats(guestId);
    if (guestStats) {
      const userStats = await getOrCreateUserStats(userId);
      
      // Merge stats (add guest stats to existing user stats)
      await saveUserStats({
        ...userStats,
        likesGiven: userStats.likesGiven + guestStats.likesGiven,
        ratingsGiven: userStats.ratingsGiven + guestStats.ratingsGiven,
        gamesShared: userStats.gamesShared + guestStats.gamesShared,
        trialsPlayed: userStats.trialsPlayed + guestStats.trialsPlayed,
        gamesPlayed: userStats.gamesPlayed + guestStats.gamesPlayed,
        totalTimeSpentMinutes: userStats.totalTimeSpentMinutes + guestStats.totalTimeSpentMinutes,
        hoursPlayed: Math.floor((userStats.totalTimeSpentMinutes + guestStats.totalTimeSpentMinutes) / 60),
        currentStreak: Math.max(userStats.currentStreak, guestStats.currentStreak),
        winStreak: Math.max(userStats.winStreak, guestStats.winStreak),
        gamesCompleted: userStats.gamesCompleted + guestStats.gamesCompleted,
      });
      
      // Clear guest stats after migration
      await clearUserStats(guestId);
    }
  } catch (error) {
    logger.error('Failed to migrate guest stats:', error);
  }
};