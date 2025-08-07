import type { Game } from './../src/types/api.types';
import { SearchFilters } from '../screens/SearchScreen';
import { createPlaceholderImage } from './imageHelpers';

// Mock game data generator
const generateMockGames = (count: number): Game[] => {
  const genres = [
    'Action',
    'Puzzle',
    'Strategy',
    'Racing',
    'Sports',
    'Casual',
    'RPG',
    'Simulation',
    'Adventure',
  ];

  const genreColors: { [key: string]: string } = {
    Action: 'ff0066',
    Puzzle: '00ffff',
    Strategy: '8866ff',
    Racing: 'ffaa00',
    Sports: '00ff66',
    Casual: 'ff66ff',
    RPG: '0088ff',
    Simulation: 'ffff00',
    Adventure: '00ffaa',
  };
  const titles = [
    'Shadow Strike',
    'Puzzle Quest',
    'Kingdom Wars',
    'Speed Racer',
    'Football Pro',
    'Candy Blast',
    'Dragon Age',
    'City Builder',
    'Island Adventure',
    'Space Odyssey',
    'Zombie Survival',
    'Chess Master',
    'Rally Championship',
    'Basketball Stars',
    'Farm Life',
    'Mystic Dungeons',
    'Airport Tycoon',
    'Treasure Hunt',
    'Battle Arena',
    'Word Master',
  ];

  return Array.prototype.slice.call({ length: count }, (_, i) => {
    const genre = genres[i % genres.length];
    const title =
      titles[i % titles.length] +
      (i > titles.length ? ` ${Math.floor(i / titles.length) + 1}` : '');
    const color = genreColors[genre] || '6366f1';

    return {
      id: `game-${i}`,
      title,
      genre,
      rating: Math.random() * 2 + 3, // 3.0 to 5.0
      coverImage: createPlaceholderImage(title, color),
      description: `An exciting ${genre} game that will keep you entertained for hours.`,
      developer: `Studio ${String.fromCharCode(65 + (i % 26))}`,
      publisherName: `Publisher ${String.fromCharCode(65 + (i % 26))}`,
      thumbnailUrl: createPlaceholderImage(title, color),
      trailerUrl: `https://example.com/video-${i}.mp4`,
      releaseDate: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
      // trialDuration: 3 + (i % 5), // 3 to 7 minutes
      playCount: Math.floor(Math.random() * 10000),
      totalRatings: Math.floor(Math.random() * 5000),
      minAge: 0,
      platforms: ["all"],
      tags: [`tag${i}`, `tag${i + 1}`],
      price: i % 4 === 0 ? 0 : Math.random() * 10 + 0.99,
      trialType: 'webview' as const,
      trialUrl: `https://www.example-games.com/games/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))}/trial`,
    };
  });
};

const mockGames = generateMockGames(100);

// Get games - simple function to return games
export const getGames = async (genre?: string | null, limit?: number) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let results = [...mockGames];

  // Filter by genre if provided
  if (genre) {
    results = results.filter(game => game.genre.toLowerCase() === genre.toLowerCase());
  }

  // Limit results if specified
  if (limit) {
    results = results.slice(0, limit);
  }

  return results;
};

// Search games with filters
export const searchGames = async ({
  query,
  filters,
  sortBy,
  page = 1,
  limit = 20,
}: {
  query: string;
  filters: SearchFilters;
  sortBy: 'relevance' | 'popular' | 'newest' | 'rating' | 'alphabetical';
  page?: number;
  limit?: number;
}): Promise<Game[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let results = [...mockGames];

  // Filter by search query
  if (query) {
    results = results.filter(
      game =>
        game &&
        ((game.title?.toLowerCase() || '').includes(query.toLowerCase()) ||
        (game.genre?.toLowerCase() || '').includes(query.toLowerCase()) ||
        (game.developer?.toLowerCase() || '').includes(query.toLowerCase()))
    );
  }

  // Apply filters
  if (filters.genres.length > 0) {
    results = results.filter(game => game && filters.genres.includes(game.genre));
  }

  if (filters.platforms?.[0] !== 'all') {
    results = results.filter(
      game => game && (game.platforms?.[0] === filters.platforms?.[0] || game.platforms?.[0] === 'both')
    );
  }

  if (filters.minAge !== 'all') {
    results = results.filter(game => game && game.minAge === filters.minAge);
  }

  if (filters.trialLimit && (filters.trialLimit.min > 3 || filters.trialLimit.max < 7)) {
    results = results.filter(
      game =>
        game.trialLimit >= filters.trialLimit.min &&
        game.trialLimit <= filters.trialLimit.max
    );
  }

  if (filters.newThisWeek) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    results = results.filter(game => new Date(game.releaseDate) > oneWeekAgo);
  }

  if (filters.highlyRated) {
    results = results.filter(game => game.rating >= 4);
  }

  if (filters.trending) {
    results = results.filter(game => game.playCount > 5000);
  }

  if (filters.hiddenGems) {
    results = results.filter(game => game.playCount < 1000);
  }

  // Sort results
  switch (sortBy) {
    case 'popular':
      results.sort((a, b) => b.playCount - a.playCount);
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      break;
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'alphabetical':
      results.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'relevance':
    default:
      // Keep original order for relevance
      break;
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  results = results.slice(startIndex, endIndex);

  return results;
};

// Get trending searches
export const getTrendingSearches = async (): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));

  return [
    'Battle Royale',
    'Puzzle Games',
    'Racing 2024',
    'RPG Adventure',
    'Casual Games',
    'Strategy War',
    'Sports Games',
    'Zombie Survival',
  ];
};

// Start trial
export const startTrial = async (gameId: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    trialId: `trial_${Date.now()}`,
    streamUrl: `https://mock.trioll.com/play/${gameId}`,
    expiresAt: new Date(Date.now() + 7 * 60 * 1000).toISOString(), // 7 minutes
  };
};

// Get game categories
export const getGameCategories = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return [
    {
      id: 'action',
      name: 'Action',
      icon: 'sword-cross',
      color: '#FF0066',
      gameCount: 1248,
      isPopular: true,
    },
    {
      id: 'puzzle',
      name: 'Puzzle',
      icon: 'puzzle',
      color: '#00FFFF',
      gameCount: 892,
    },
    {
      id: 'strategy',
      name: 'Strategy',
      icon: 'chess-knight',
      color: '#8866FF',
      gameCount: 567,
      isNew: true,
    },
    {
      id: 'racing',
      name: 'Racing',
      icon: 'racing-helmet',
      color: '#FFAA00',
      gameCount: 423,
    },
    {
      id: 'sports',
      name: 'Sports',
      icon: 'soccer',
      color: '#00FF66',
      gameCount: 756,
      isPopular: true,
    },
    {
      id: 'casual',
      name: 'Casual',
      icon: 'emoticon-happy',
      color: '#FF66FF',
      gameCount: 2341,
    },
    {
      id: 'rpg',
      name: 'RPG',
      icon: 'shield-sword',
      color: '#0088FF',
      gameCount: 389,
    },
    {
      id: 'simulation',
      name: 'Simulation',
      icon: 'home-city',
      color: '#FFFF00',
      gameCount: 612,
    },
    {
      id: 'adventure',
      name: 'Adventure',
      icon: 'compass',
      color: '#00FFAA',
      gameCount: 834,
      isNew: true,
    },
    {
      id: 'arcade',
      name: 'Arcade',
      icon: 'gamepad-variant',
      color: '#FF00FF',
      gameCount: 1567,
    },
    {
      id: 'card',
      name: 'Card',
      icon: 'cards-playing',
      color: '#FF3333',
      gameCount: 234,
    },
    {
      id: 'board',
      name: 'Board',
      icon: 'grid',
      color: '#3366FF',
      gameCount: 189,
    },
  ];
};
