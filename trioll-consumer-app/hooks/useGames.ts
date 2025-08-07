import type { Game } from './../src/types/api.types';
import { useState, useCallback } from 'react';
import { searchGames } from '../utils/fakeApi';
import type { SearchFilters } from '../screens/SearchScreen';

export const useGameSearch = () => {
  const [results, setResults] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await searchGames({
        query,
        filters: {
          genres: [],
          platform: 'all',
          ageRating: 'all',
          trialDuration: { min: 0, max: 30 },
          playerCount: 'any',
          releaseDate: 'any',
          minRating: 0,
          hasAchievements: false,
          isMultiplayer: false,
          isOfflineCapable: false,
          languages: [],
          newThisWeek: false,
          highlyRated: false,
          trending: false,
          hiddenGems: false,
        } as SearchFilters,
        sortBy: 'relevance',
      });
      setResults(searchResults);
    } catch (_err) {
      setError('Failed to search games');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
};
