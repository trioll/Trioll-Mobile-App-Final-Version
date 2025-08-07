import { useState, useEffect } from 'react';

export const useGameDetail = (gameId: string) => {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Mock implementation
    const loadGame = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData({ id: gameId, likes: 10, rating: 4.5 });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [gameId]);

  return { data, isLoading, error };
};
