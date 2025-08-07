import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useApp } from '../context/AppContext';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('useGamesLoader');
const API_BASE_URL = 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod';
const FETCH_INTERVAL = 30000; // 30 seconds

export const useGamesLoader = () => {
  const { setGames } = useApp();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const fetchGames = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.games && Array.isArray(data.games)) {
        setGames(data.games);
      }
    } catch (error) {
      logger.debug('Fetch failed:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchGames();

    // Set up interval
    intervalRef.current = setInterval(fetchGames, FETCH_INTERVAL);

    // App state listener
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        fetchGames();
      }
      appStateRef.current = nextAppState;
    });

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      appStateSubscription.remove();
    };
  }, []);
};