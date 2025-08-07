import type { User } from '../../types/api.types';
import { generateUserAvatar, generateGuestAvatar, getDefaultAvatar } from '../../utils/avatarGenerator';
/**
 * User Data Adapter
 * Transforms user data between DynamoDB format and frontend format
 */

export interface DynamoDBUser {
  userId: string;
  username?: string;
  name?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  avatar?: string;
  bio?: string;
  level?: number;
  xp?: number;
  gamesPlayed?: number;
  achievements?: string[];
  friends?: string[];
  createdAt?: string;
  updatedAt?: string;
  preferences?: any;
  stats?: any;
  privacy?: {
    profileVisibility?: 'public' | 'friends' | 'private';
    showOnlineStatus?: boolean;
    showGameActivity?: boolean;
  };
  
  // Guest user fields from backend
  isGuest?: boolean;
  guestId?: string;
  guestCreatedAt?: string;
  type?: 'guest' | 'authenticated';
  
  // Conversion tracking from backend
  convertedFromGuest?: boolean;
  originalGuestId?: string;
}

export interface DynamoDBUserStats {
  userId: string;
  totalGamesPlayed: number;
  totalPlayTime: number;
  favoriteCategory: string;
  gamesCompleted: number;
  achievementsUnlocked: number;
  totalLikes: number;
  totalRatings: number;
  averageRating: number;
  totalComments: number;
  winRate?: number;
  highScores?: Record<string, number>;
  categoryPlayTime?: Record<string, number>;
  weeklyPlayTime?: number[];
  monthlyActive?: boolean;
  streak?: number;
  lastUpdated: string;
}

export class UserAdapter {
  /**
   * Transform DynamoDB user to frontend format
   */
  static fromDynamoDB(dbUser: DynamoDBUser): User {
    // Determine if user is guest based on multiple indicators
    const isGuestUser = dbUser.isGuest || 
                       dbUser.type === 'guest' ||
                       dbUser.userId?.startsWith('guest_') ||
                       !dbUser.email;
    
    return {
      id: dbUser.userId,
      username: dbUser.username || dbUser.email?.split('@')[0] || 'user',
      email: dbUser.email || '',
      avatarUrl: dbUser.avatarUrl || dbUser.avatar || (isGuestUser ? generateGuestAvatar(dbUser.userId) : generateUserAvatar(dbUser.userId, dbUser.username || dbUser.displayName)),
      bio: dbUser.bio,
      level: dbUser.level,
      xp: dbUser.xp,
      gamesPlayed: dbUser.gamesPlayed,
      achievements: dbUser.achievements || [],
      friends: dbUser.friends || [],
      createdAt: dbUser.createdAt || new Date().toISOString(),
      updatedAt: dbUser.updatedAt,
      preferences: dbUser.preferences,
      stats: dbUser.stats,

      // Guest user properties
      isGuest: isGuestUser,
      guestId: isGuestUser ? (dbUser.guestId || dbUser.userId) : undefined,
      guestCreatedAt: isGuestUser ? dbUser.guestCreatedAt : undefined,
      
      // Conversion tracking
      convertedFromGuest: dbUser.convertedFromGuest || false,
      originalGuestId: dbUser.originalGuestId,
    };
  }

  /**
   * Transform frontend user to DynamoDB format
   */
  static toDynamoDB(user: User): DynamoDBUser {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      level: user.level,
      xp: user.xp,
      gamesPlayed: user.gamesPlayed,
      achievements: user.achievements,
      friends: user.friends,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString(),
      preferences: user.preferences,
      stats: user.stats,
      
      // Guest user properties
      isGuest: user.isGuest,
      guestId: user.guestId,
      guestCreatedAt: user.guestCreatedAt,
      type: user.isGuest ? 'guest' : 'authenticated',
      
      // Conversion tracking
      convertedFromGuest: user.convertedFromGuest,
      originalGuestId: user.originalGuestId,
    };
  }

  /**
   * Merge user stats with user data
   */
  static mergeStats(user: User, stats?: DynamoDBUserStats): User {
    if (!stats) return user;

    return {
      ...user,
      // gamesPlayed: stats.totalGamesPlayed || user.gamesPlayed, // TODO: Add to User type
      totalPlayTime: stats.totalPlayTime || user.totalPlayTime,
      favoriteCategory: stats.favoriteCategory,
      gamesCompleted: stats.gamesCompleted,
      achievementsUnlocked: stats.achievementsUnlocked,
      stats: {
        totalLikes: stats.totalLikes || 0,
        totalRatings: stats.totalRatings || 0,
        averageRating: stats.averageRating || 0,
        totalComments: stats.totalComments || 0,
        winRate: stats.winRate,
        highScores: stats.highScores || {},
        categoryPlayTime: stats.categoryPlayTime || {},
        weeklyPlayTime: stats.weeklyPlayTime || [],
        monthlyActive: stats.monthlyActive || false,
        streak: stats.streak || 0,
      },
    };
  }

  /**
   * Create guest user object
   */
  static createGuestUser(guestId?: string): User {
    const id = guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    return {
      id,
      username: `Guest_${id.substr(-6)}`,
      email: '',
      avatarUrl: generateGuestAvatar(id),
      bio: 'Playing as guest',
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      achievements: [],
      friends: [],
      createdAt: now,
      updatedAt: now,
      
      // Guest-specific properties
      isGuest: true,
      guestId: id,
      guestCreatedAt: now,
      
      // No conversion tracking for new guests
      convertedFromGuest: false,
      originalGuestId: undefined,
      
      // Default preferences for guests
      preferences: {
        favoriteGenres: [],
        notificationsEnabled: false,
        privateProfile: true,
        language: 'en',
        theme: 'dark'
      },
      
      stats: {
        totalPlayTime: 0,
        gamesPlayed: 0,
        achievementsUnlocked: 0,
        friendsCount: 0,
        level: 1,
        xp: 0
      }
    };
  }

  /**
   * Validate and sanitize user data
   */
  static validate(user: Partial<User>): string[] {
    const errors: string[] = [];

    if (user.username && !/^[a-zA-Z0-9_-]{3,20}$/.test(user.username)) {
      errors.push(
        'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens'
      );
    }

    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push('Invalid email format');
    }

    if (user.bio && user.bio.length > 500) {
      errors.push('Bio must be 500 characters or less');
    }

    if (user.level !== undefined && user.level < 1) {
      errors.push('Level must be at least 1');
    }

    if (user.xp !== undefined && user.xp < 0) {
      errors.push('XP cannot be negative');
    }

    return errors;
  }

  /**
   * Apply field mapping rules for legacy data
   */
  static applyLegacyMapping(data: unknown): DynamoDBUser {
    return {
      userId: data.id || data.userId || data._id,
      username: data.username || data.email?.split('@')[0] || 'user',
      email: data.email || data.emailAddress,
      name: data.name || data.displayName || data.fullName,
      avatarUrl: data.avatarUrl || data.avatar || data.profilePicture || data.photo,
      // bio: data.bio || data.biography || data.about || data.description, // TODO: Add to User type
      // level: parseInt(data.level || data.playerLevel || data.rank || 1), // TODO: Add to User type
      // xp: parseInt(data.xp || data.experience || data.points || 0), // TODO: Add to User type
      totalGamesPlayed: parseInt(data.totalGamesPlayed || data.gamesPlayed || data.gameCount || 0),
      totalPlayTime: parseInt(data.totalPlayTime || data.playTime || data.hoursPlayed || 0),
      achievements: data.achievements || data.badges || data.trophies || [],
      friends: data.friends || data.friendList || data.connections || [],
      following: data.following || data.follows || [],
      followers: data.followers || data.followedBy || [],
      createdAt: data.createdAt || data.created || data.joinedAt || data.registeredAt,
      updatedAt: data.updatedAt || data.updated || data.modifiedAt,
      lastActiveAt: data.lastActiveAt || data.lastActive || data.lastSeen || data.lastLogin,
      isGuest: data.isGuest || data.guest || false,
      isPremium: data.isPremium || data.premium || data.pro || false,
      isDeveloper: data.isDeveloper || data.developer || false,
      isVerified: data.isVerified || data.verified || false,
      emailVerified: data.emailVerified || data.emailConfirmed || false,
      preferences: data.preferences || data.prefs || {},
      settings: data.settings || data.config || {},
    };
  }

  /**
   * Calculate user level from XP
   */
  static calculateLevel(xp: number): number {
    // Simple level calculation: 100 XP per level with increasing requirements
    let level = 1;
    let requiredXP = 0;

    while (xp >= requiredXP) {
      level++;
      requiredXP += level * 100;
    }

    return level - 1;
  }

  /**
   * Calculate XP needed for next level
   */
  static calculateXPForNextLevel(currentLevel: number): number {
    return (currentLevel + 1) * 100;
  }


  /**
   * Anonymize user data for privacy
   */
  static anonymize(user: User): Partial<User> {
    return {
      id: user.id,
      username: `User_${user.id.substr(-6)}`,
      avatarUrl: getDefaultAvatar(),
      // level: user.level, // TODO: Add to User type
      // gamesPlayed: user.gamesPlayed, // TODO: Add to User type
      isGuest: user.isGuest,
      isPremium: user.isPremium,
      isDeveloper: user.isDeveloper,
      isVerified: user.isVerified,
    };
  }
}
