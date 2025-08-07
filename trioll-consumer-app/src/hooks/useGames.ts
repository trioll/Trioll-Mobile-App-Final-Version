import type { Game } from '../types/api.types';
import { useState, useEffect } from 'react';

import { dummyGames } from '../../data/dummyGames';
import { safeAPI } from '../services/api/SafeTriollAPI';
import { dataMapper } from '../utils/dataMapper';
import { Config } from '../config/environments';

export const useGames = (genre?: string | null, limit?: number) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingApiData, setIsUsingApiData] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);

        // Use production API unless explicitly configured for mock
        if (Config.USE_MOCK_API) {
          // Use dummyGames only when mock API is enabled
          setGames(dummyGames);
          setIsUsingApiData(false);
        } else {
          // Use safe API with automatic fallback
          const response = await safeAPI.getGames(100, genre || undefined); // Get all games
          

          if (response && response.games) {
            // Map API response to our Game type
            const mappedGames = response.games.map((game: unknown) =>
              dataMapper.mapApiGameToLocal(game)
            );
            
            
            setGames(mappedGames);
            setIsUsingApiData(!response.isUsingFallback);
            // Loaded games from API or fallback data
          } else {
            throw new Error('Invalid API response');
          }
        }
      } catch (_err) {
        // Failed to load games
        setError('Failed to load games');
        // Keep dummy games as fallback
        setGames(dummyGames);
        setIsUsingApiData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [genre, limit]);

  return { games, loading, error, isUsingApiData };
};

export const useFeaturedGames = (limit: number = 5) => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedGames = async () => {
      try {
        setLoading(true);

        if (Config.USE_MOCK_API) {
          // Use dummyGames when mock API is enabled
          const featured = dummyGames.filter((game) => game.featured).slice(0, limit);
          setFeaturedGames(featured.length > 0 ? featured : dummyGames.slice(0, limit));
        } else {
          // Use safe API with automatic fallback
          const response = await safeAPI.getFeaturedGames(limit);

          if (response && response.games) {
            const mappedGames = response.games.map((game: unknown) =>
              dataMapper.mapApiGameToLocal(game)
            );
            setFeaturedGames(mappedGames);
            // Loaded featured games from API or fallback data
          } else {
            // If no featured games, get regular games
            const regularResponse = await safeAPI.getGames(limit);
            if (regularResponse && regularResponse.games) {
              const mappedGames = regularResponse.games.map((game: unknown) =>
                dataMapper.mapApiGameToLocal(game)
              );
              setFeaturedGames(mappedGames);
            }
          }
        }
      } catch (_err) {
        // Failed to load featured games
        setError('Failed to load featured games');
        // Use first 5 dummy games as fallback
        setFeaturedGames(dummyGames.slice(0, limit));
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedGames();
  }, [limit]);

  return { featuredGames, loading, error };
};
