import { useState, useCallback } from 'react';
import { useToast } from './useToast';

export const useUserInteractions = () => {
  const [isLiking, setIsLiking] = useState(false);
  const { showToast } = useToast();

  const toggleLike = useCallback(async (_gameId: string) => {
    setIsLiking(true);
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast({ message: 'Game liked!', type: 'success' });
    } catch (error) {
      showToast({ message: 'Failed to like game', type: 'error' });
    } finally {
      setIsLiking(false);
    }
  }, [showToast]);

  return {
    toggleLike,
    isLiking,
  };
};
