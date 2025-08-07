
/**
 * Guest storage utilities for managing guest user data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuestProfile, GuestTrialHistory, GuestRating, PendingMergeData } from '../types/guest';

const GUEST_PROFILE_KEY = '@guest_profile';
const GUEST_LIKES_KEY = '@guest_likes';
const GUEST_BOOKMARKS_KEY = '@guest_bookmarks';
const GUEST_TRIALS_KEY = '@guest_trials';
const GUEST_RATINGS_KEY = '@guest_ratings';

// Guest profile management
export const createGuestProfile = async (): Promise<GuestProfile> => {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from creation

  // Generate a 6-digit random number for guest username
  const guestNumber = Math.floor(Math.random() * 900000) + 100000;
  
  const profile: GuestProfile = {
    guestId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: `Guest${guestNumber}`,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    stats: {
      trialsPlayed: 0,
      totalPlayTime: 0,
      gamesBookmarked: [],
      lastActiveAt: now.toISOString(),
      // RPG stats
      likesGiven: 0,
      totalTimeSpentMinutes: 0,
      hoursPlayed: 0,
      ratingsGiven: 0,
      currentStreak: 0,
      winStreak: 0,
      gamesPlayed: 0,
      gamesShared: 0,
      gamesCompleted: 0,
    },
    preferences: {
      theme: 'dark',
      soundEnabled: true,
    },
  };

  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

export const getGuestProfile = async (): Promise<GuestProfile | null> => {
  try {
    const profileData = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
    if (!profileData) return null;

    const profile = JSON.parse(profileData);

    // Migrate legacy profiles that don't have the required structure
    if (!profile.guestId && profile.id) {
      profile.guestId = profile.id;
    }
    
    // Add username to legacy profiles that don't have it
    if (!profile.username) {
      const guestNumber = Math.floor(Math.random() * 900000) + 100000;
      profile.username = `Guest${guestNumber}`;
    }

    if (!profile.stats) {
      profile.stats = {
        trialsPlayed: 0,
        totalPlayTime: 0,
        gamesBookmarked: [],
        lastActiveAt: new Date().toISOString(),
        // RPG stats
        likesGiven: 0,
        totalTimeSpentMinutes: 0,
        hoursPlayed: 0,
        ratingsGiven: 0,
        currentStreak: 0,
        winStreak: 0,
        gamesPlayed: 0,
        gamesShared: 0,
        gamesCompleted: 0,
      };
    } else {
      // Migrate existing profiles to include RPG stats
      profile.stats = {
        likesGiven: 0,
        totalTimeSpentMinutes: Math.floor(profile.stats.totalPlayTime / 60),
        hoursPlayed: Math.floor(profile.stats.totalPlayTime / 3600),
        ratingsGiven: 0,
        currentStreak: 0,
        winStreak: 0,
        gamesPlayed: profile.stats.trialsPlayed,
        gamesShared: 0,
        gamesCompleted: 0,
        ...profile.stats, // Preserve existing values
      };
    }

    if (!profile.preferences) {
      profile.preferences = {
        theme: 'dark',
        soundEnabled: true,
      };
    }

    // Ensure all required fields exist
    if (!profile.createdAt) {
      profile.createdAt = new Date().toISOString();
    }

    if (!profile.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      profile.expiresAt = expiresAt.toISOString();
    }

    // Update last active timestamp in stats
    profile.stats.lastActiveAt = new Date().toISOString();

    await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));

    return profile;
  } catch {
    return null;
  }
};

export const getOrCreateGuestProfile = async (): Promise<GuestProfile> => {
  const existingProfile = await getGuestProfile();
  if (existingProfile) {
    return existingProfile;
  }
  return createGuestProfile();
};

export const updateGuestProfile = async (updates: Partial<GuestProfile>): Promise<GuestProfile> => {
  const profile = await getOrCreateGuestProfile();
  const updatedProfile = {
    ...profile,
    ...updates,
    stats: {
      ...profile.stats,
      ...(updates.stats || {}),
      lastActiveAt: new Date().toISOString(),
    },
  };
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updatedProfile));
  return updatedProfile;
};

// Likes management
export const getLikes = async (): Promise<string[]> => {
  try {
    const likes = await AsyncStorage.getItem(GUEST_LIKES_KEY);
    return likes ? JSON.parse(likes) : [];
  } catch {
    return [];
  }
};

export const toggleLike = async (gameId: string): Promise<boolean> => {
  const likes = await getLikes();
  const index = likes.indexOf(gameId);

  if (index > -1) {
    likes.splice(index, 1);
  } else {
    likes.push(gameId);
    // Update RPG stats - increment likesGiven (Strength)
    await updateRPGStat('likesGiven', 1);
  }

  await AsyncStorage.setItem(GUEST_LIKES_KEY, JSON.stringify(likes));
  return index === -1; // Returns true if liked, false if unliked
};

// RPG Stats Management
export const updateRPGStat = async (statName: keyof GuestProfile['stats'], increment: number = 1): Promise<void> => {
  const profile = await getOrCreateGuestProfile();
  const currentValue = (profile.stats[statName] as number) || 0;
  
  await updateGuestProfile({
    stats: {
      ...profile.stats,
      [statName]: currentValue + increment,
    }
  });
};

export const incrementTrialPlayed = async (): Promise<void> => {
  const profile = await getOrCreateGuestProfile();
  await updateGuestProfile({
    stats: {
      ...profile.stats,
      trialsPlayed: profile.stats.trialsPlayed + 1,
      gamesPlayed: (profile.stats.gamesPlayed || 0) + 1, // Speed stat
    }
  });
};

export const updatePlayTime = async (minutes: number): Promise<void> => {
  const profile = await getOrCreateGuestProfile();
  const totalMinutes = (profile.stats.totalTimeSpentMinutes || 0) + minutes;
  const hours = Math.floor(totalMinutes / 60);
  
  await updateGuestProfile({
    stats: {
      ...profile.stats,
      totalTimeSpentMinutes: totalMinutes,
      hoursPlayed: hours, // Accuracy stat
      totalPlayTime: profile.stats.totalPlayTime + (minutes * 60), // Keep legacy field
    }
  });
};

export const incrementRating = async (): Promise<void> => {
  await updateRPGStat('ratingsGiven', 1); // Intelligence stat
};

export const incrementGameShared = async (): Promise<void> => {
  await updateRPGStat('gamesShared', 1); // Charisma stat
};

export const updateStreak = async (newStreak: number): Promise<void> => {
  const profile = await getOrCreateGuestProfile();
  const currentStreak = profile.stats.currentStreak || 0;
  const winStreak = profile.stats.winStreak || 0;
  
  await updateGuestProfile({
    stats: {
      ...profile.stats,
      currentStreak: newStreak, // Defense stat
      winStreak: Math.max(winStreak, newStreak), // Keep highest streak
    }
  });
};

export const incrementGameCompleted = async (): Promise<void> => {
  await updateRPGStat('gamesCompleted', 1); // Part of Charisma
};

// Bookmarks management
export const getBookmarks = async (): Promise<string[]> => {
  try {
    const bookmarks = await AsyncStorage.getItem(GUEST_BOOKMARKS_KEY);
    return bookmarks ? JSON.parse(bookmarks) : [];
  } catch {
    return [];
  }
};

export const toggleBookmark = async (gameId: string): Promise<boolean> => {
  const bookmarks = await getBookmarks();
  const index = bookmarks.indexOf(gameId);

  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(gameId);
  }

  await AsyncStorage.setItem(GUEST_BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return index === -1; // Returns true if bookmarked, false if unbookmarked
};

// Trial history management
export const addTrialToHistory = async (trial: GuestTrialHistory): Promise<void> => {
  const trials = await getTrialHistory();
  trials.push(trial);
  await AsyncStorage.setItem(GUEST_TRIALS_KEY, JSON.stringify(trials));
};

export const getTrialHistory = async (): Promise<GuestTrialHistory[]> => {
  try {
    const trials = await AsyncStorage.getItem(GUEST_TRIALS_KEY);
    return trials ? JSON.parse(trials) : [];
  } catch {
    return [];
  }
};

// Ratings management
export const addRating = async (rating: GuestRating): Promise<void> => {
  const ratings = await getRatings();
  const existingIndex = ratings.findIndex(r => r.gameId === rating.gameId);

  if (existingIndex > -1) {
    ratings[existingIndex] = rating;
  } else {
    ratings.push(rating);
  }

  await AsyncStorage.setItem(GUEST_RATINGS_KEY, JSON.stringify(ratings));
};

export const getRatings = async (): Promise<GuestRating[]> => {
  try {
    const ratings = await AsyncStorage.getItem(GUEST_RATINGS_KEY);
    return ratings ? JSON.parse(ratings) : [];
  } catch {
    return [];
  }
};

// Merge data preparation
export const prepareMergeData = async (): Promise<PendingMergeData> => {
  const [profile, likes, bookmarks, trials, ratings] = await Promise.all([
    getGuestProfile(),
    getLikes(),
    getBookmarks(),
    getTrialHistory(),
    getRatings(),
  ]);

  if (!profile) {
    throw new Error('No guest profile found');
  }

  return {
    guestId: profile.guestId,
    trialHistory: trials,
    bookmarkedGames: bookmarks,
    ratings,
    preferences: profile.preferences,
    stats: profile.stats,
  };
};

// Cleanup after successful registration
export const cleanupGuestData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(GUEST_PROFILE_KEY),
    AsyncStorage.removeItem(GUEST_LIKES_KEY),
    AsyncStorage.removeItem(GUEST_BOOKMARKS_KEY),
    AsyncStorage.removeItem(GUEST_TRIALS_KEY),
    AsyncStorage.removeItem(GUEST_RATINGS_KEY),
  ]);
};
