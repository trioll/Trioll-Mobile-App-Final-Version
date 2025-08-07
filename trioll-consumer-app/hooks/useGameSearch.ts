import type { Game } from './../src/types/api.types';
import { useState, useEffect, useCallback } from 'react';
import triollAPI from '../src/services/api/TriollAPI';
import { dataMapper } from '../src/utils/dataMapper';
import { getLogger } from '../src/utils/logger';
import type { SearchFilters } from '../screens/SearchScreen';

const logger = getLogger('useGameSearch');

interface UseGameSearchResult {
  results: Game[];
  loading: boolean;
  isUsingApiData: boolean;
  error: string | null;
  search: (query: string) => void;
}

export const useGameSearch = (
  initialQuery: string = '',
  limit: number = 20
): UseGameSearchResult => {
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUsingApiData, setIsUsingApiData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() && searchQuery !== '') {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try API first
        const apiResults = await triollAPI.searchGames(searchQuery, limit);

        if (apiResults && apiResults.results && apiResults.results.length > 0) {
          // Map API results to local Game type
          const mappedResults = apiResults.results.map(game => dataMapper.mapApiGameToLocal(game));
          setResults(mappedResults);
          setIsUsingApiData(true);
        } else if (searchQuery === '') {
          // For empty search, get all games
          const allGames = await triollAPI.getGames(limit);
          const mappedGames = allGames.games.map(game => dataMapper.mapApiGameToLocal(game));
          setResults(mappedGames);
          setIsUsingApiData(true);
        } else {
          // No results from API
          setResults([]);
          setIsUsingApiData(true);
        }
      } catch (err) {
        // API search failed
        logger.info('API search failed', { error: err });
        setError('Search failed. Please try again.');
        setResults([]);
        setIsUsingApiData(false);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // Perform initial search
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Search function to update query
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    results,
    loading,
    isUsingApiData,
    error,
    search,
  };
};

// Hook for search suggestions
export const useSearchSuggestions = (query: string): string[] => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // For now, use static suggestions
    // TODO: Implement API endpoint for dynamic suggestions
    const staticSuggestions = [
      'action games',
      'adventure quest',
      'arcade classics',
      'battle royale',
      'casual puzzle',
      'racing simulator',
      'rpg fantasy',
      'strategy games',
      'sports championship',
      'survival horror',
    ];

    const filtered = staticSuggestions
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    setSuggestions(filtered);
  }, [query]);

  return suggestions;
};
