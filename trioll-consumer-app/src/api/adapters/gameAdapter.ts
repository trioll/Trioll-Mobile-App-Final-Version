import type { Game } from '../../types/api.types';
/**
 * Game Data Adapter
 * Transforms game data between DynamoDB format and frontend format
 */

export interface DynamoDBGame {
  gameId: string;
  name?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  genre?: string;
  category?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  thumbnailUrl?: string;
  thumbnailImage?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  coverImage?: string;
  trailerUrl?: string;
  rating?: number;
  ratingCount?: number;
  ratingsCount?: number;
  playCount?: number;
  playedCount?: number;
  likeCount?: number;
  likesCount?: number;
  featured?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DynamoDBUserInteraction {
  userId: string;
  gameId: string;
  liked?: boolean;
  bookmarked?: boolean;
  rating?: number;
  comment?: string;
  playCount?: number;
  totalPlayTime?: number;
  lastPlayedAt?: string;
  achievements?: string[];
  highScore?: number;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

export class GameAdapter {
  /**
   * Transform DynamoDB game to frontend format
   */
  static fromDynamoDB(dbGame: DynamoDBGame): Game {
    return {
      id: dbGame.gameId || dbGame.id,
      title: dbGame.title || dbGame.name || 'Untitled Game',
      description: dbGame.description || '',
      developer: (dbGame as any).developerName || dbGame.developer || 'Unknown Developer',
      image: dbGame.thumbnailUrl || dbGame.thumbnailImage || dbGame.imageUrl || 'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-game-thumbnail.png',
      coverImageUrl:
        dbGame.coverImageUrl ||
        dbGame.coverImage ||
        dbGame.thumbnailUrl ||
        'https://trioll-prod-games-us-east-1.s3.amazonaws.com/default-game-cover.png',
      genre: dbGame.genre || 'Uncategorized',
      tags: dbGame.tags || [],
      rating: dbGame.rating || 0,
      ratingCount: dbGame.ratingCount || 0,
      likes: dbGame.likes || 0,
      plays: dbGame.plays || 0,
      featured: dbGame.featured || false,
      trending: dbGame.trending || false,
      createdAt: dbGame.createdAt || new Date().toISOString(),
      updatedAt: dbGame.updatedAt || new Date().toISOString(),

      // Game-specific fields
      gameUrl: dbGame.gameUrl || dbGame.demoUrl || '',
      minPlayers: dbGame.minPlayers || 1,
      maxPlayers: dbGame.maxPlayers || 1,
      duration: dbGame.duration || 'Unknown',
      difficulty: dbGame.difficulty || 'Medium',
      ageRating: (dbGame.ageRating || 'E') as 'everyone' | 'teen' | 'mature',
      // size: dbGame.size || 'Unknown', // TODO: Add to Game type if needed
      // version: dbGame.version || '1.0.0', // TODO: Add to Game type if needed

      // User interaction fields (populated separately)
      // isLiked: false, // TODO: Add to Game type if needed
      userRating: 0,
      lastPlayedAt: dbGame.lastPlayedAt,

      // Additional fields
      // achievements: dbGame.achievements || [], // TODO: Add to Game type if needed
      // leaderboards: dbGame.leaderboards || [], // TODO: Add to Game type if needed
      // isFree: dbGame.isFree !== false, // TODO: Add to Game type if needed
      price: dbGame.price || 0,
      // currency: dbGame.currency || 'USD', // TODO: Add to Game type if needed
    };
  }

  /**
   * Transform frontend game to DynamoDB format
   */
  static toDynamoDB(game: Game): DynamoDBGame {
    return {
      gameId: game.id,
      title: game.title,
      description: game.description,
      developerName: game.developer,
      thumbnailUrl: game.thumbnailUrl,
      coverImageUrl: game.coverImageUrl,
      genre: game.genre,
      tags: game.tags,
      rating: game.rating,
      ratingCount: game.ratingCount,
      likes: game.likeCount,
      plays: game.playCount,
      featured: game.featured,
      trending: game.isTrending,
      createdAt: game.releaseDate,
      updatedAt: game.lastUpdated || new Date().toISOString(),
      gameUrl: game.gameUrl,
      minPlayers: '1',
      maxPlayers: '1',
      duration: game.trialDuration,
      difficulty: 'medium',
      ageRating: game.ageRating as 'everyone' | 'teen' | 'mature',
      // size: game.size, // TODO: Add to Game type if needed
      // version: game.version, // TODO: Add to Game type if needed
      // achievements: game.achievements, // TODO: Add to Game type if needed
      // leaderboards: game.leaderboards, // TODO: Add to Game type if needed
      // isFree: game.isFree, // TODO: Add to Game type if needed
      price: game.price,
      // currency: game.currency, // TODO: Add to Game type if needed
    };
  }

  /**
   * Transform array of DynamoDB games
   */
  static fromDynamoDBArray(dbGames: DynamoDBGame[]): Game[] {
    return dbGames.map(game => GameAdapter.fromDynamoDB(game));
  }

  /**
   * Merge user interaction data with game
   */
  static mergeUserInteraction(game: Game, interaction?: DynamoDBUserInteraction): Game {
    if (!interaction) return game;

    return {
      ...game,
      // isLiked: interaction.liked || false, // TODO: Add to Game type if needed
      // isBookmarked: interaction.bookmarked || false, // TODO: Add to Game type
      userRating: interaction.rating || 0,
      lastPlayedAt: interaction.lastPlayedAt,
      playCount: interaction.playCount,
      totalPlayTime: interaction.totalPlayTime,
      highScore: interaction.highScore,
      progress: interaction.progress,
      userAchievements: interaction.achievements,
    };
  }

  /**
   * Validate and sanitize game data
   */
  static validate(game: Partial<Game>): string[] {
    const errors: string[] = [];

    if (!game.title || game.title.trim().length === 0) {
      errors.push('Game name is required');
    }

    if (game.rating !== undefined && (game.rating < 0 || game.rating > 5)) {
      errors.push('Rating must be between 0 and 5');
    }

    if (1 !== undefined && 1 < 1) {
      errors.push('Minimum players must be at least 1');
    }

    if (1 !== undefined && 1 !== undefined && 1 < 1) {
      errors.push('Maximum players must be greater than or equal to minimum players');
    }

    if (game.price !== undefined && game.price < 0) {
      errors.push('Price cannot be negative');
    }

    return errors;
  }

  /**
   * Apply field mapping rules for legacy data
   */
  static applyLegacyMapping(data: unknown): DynamoDBGame {
    // Handle different field naming conventions
    return {
      gameId: data.gameId || data.id || data._id,
      title: data.title || data.name || data.gameName,
      description: data.description || data.desc || data.summary,
      developerName: (data as any).developerName || data.developer || data.studio || data.publisher,
      thumbnailUrl: data.thumbnailUrl || data.thumbnail || data.image || data.imageUrl,
      coverImageUrl: data.coverImageUrl || data.coverImage || data.banner || data.headerImage,
      genre: data.genre || data.genre || data.type,
      tags: data.tags || data.keywords || [],
      rating: parseFloat(data.rating || data.averageRating || data.score || 0),
      ratingCount: parseInt(data.ratingCount || data.totalRatings || data.reviewCount || 0),
      likes: parseInt(data.likes || data.likeCount || data.favorites || 0),
      plays: parseInt(data.plays || data.playCount || (data as any).downloads || 0),
      featured: data.featured || data.featured || false,
      trending: data.trending || data.isTrending || false,
      createdAt: data.createdAt || data.created || data.addedAt,
      updatedAt: data.updatedAt || data.updated || data.modifiedAt,
      gameUrl: data.gameUrl || data.url || data.playUrl,
      demoUrl: data.demoUrl || data.trialUrl || data.demoLink,
      minPlayers: String(parseInt(data.minPlayers || data.minimumPlayers || 1) || 1),
      maxPlayers: String(parseInt(data.maxPlayers || data.maximumPlayers || 1) || 1),
      duration: data.duration || data.playTime || data.estimatedTime,
      difficulty: data.difficulty || data.level || 'Medium',
      ageRating: (data.ageRating || data.rating || data.esrb || 'E') as
        | 'everyone'
        | 'teen'
        | 'mature',
      // size: data.size || data.fileSize || data.downloadSize, // TODO: Add to Game type if needed
      // version: data.version || data.versionNumber || '1.0.0', // TODO: Add to Game type if needed
      // isFree: data.isFree !== undefined ? data.isFree : data.price === 0 || data.price === undefined, // TODO: Add to Game type if needed
      price: parseFloat(data.price || data.cost || 0),
      // currency: data.currency || 'USD', // TODO: Add to Game type if needed
    };
  }

  /**
   * Build search-friendly representation
   */
  static toSearchFormat(game: Game): Record<string, any> {
    return {
      id: game.id,
      title: game.title.toLowerCase(),
      description: game.description?.toLowerCase() || '',
      developer: game.developer.toLowerCase(),
      genre: game.genre.toLowerCase(),
      tags: game.tags.map(tag => tag.toLowerCase()),
      searchText:
        `${game.title} ${game.developer} ${game.genre} ${game.tags.join(' ')}`.toLowerCase(),
    };
  }
}
