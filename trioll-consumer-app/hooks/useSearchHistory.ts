import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('useSearchHistory');

const SEARCH_HISTORY_KEY = 'trioll_search_history';
const MAX_HISTORY_ITEMS = 10;

export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const stored = await SecureStore.getItemAsync(SEARCH_HISTORY_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (history: string[]) => {
    try {
      await SecureStore.setItemAsync(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      logger.error('Error saving search history:', error);
    }
    return;
};

  const addToHistory = (query: string) => {
    if (!query || query.trim().length === 0) return;

    const trimmedQuery = query.trim();
    const newHistory = [trimmedQuery, ...searchHistory.filter(item => item !== trimmedQuery)].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  const removeFromHistory = (query: string) => {
    const newHistory = searchHistory.filter(item => item !== query);
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
  };

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
};
