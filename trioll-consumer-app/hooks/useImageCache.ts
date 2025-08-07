import { useRef, useCallback } from 'react';
import { Image } from 'react-native';

interface CacheEntry {
  url: string;
  timestamp: number;
  status: 'loading' | 'cached' | 'error';
}

export const useImageCache = () => {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const activePreloads = useRef<Set<string>>(new Set());

  const getCachedStatus = useCallback((_gameId: string): boolean => {
    // Mock implementation - in real app would check actual cache
    return Math.random() > 0.5;
  }, []);

  const preloadImages = useCallback((urls: string[]) => {
    urls.forEach(url => {
      if (!cache.current.has(url) && !activePreloads.current.has(url)) {
        activePreloads.current.add(url);

        cache.current.set(url, {
          url,
          timestamp: Date.now(),
          status: 'loading',
        });

        Image.prefetch(url)
          .then(() => {
            const entry = cache.current.get(url);
            if (entry) {
              entry.status = 'cached';
            }
            activePreloads.current.delete(url);
          })
          .catch(() => {
            const entry = cache.current.get(url);
            if (entry) {
              entry.status = 'error';
            }
            activePreloads.current.delete(url);
          });
      }
    });
  }, []);

  const cancelPreload = useCallback(() => {
    // Clear active preloads
    activePreloads.current.clear();
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
    activePreloads.current.clear();
  }, []);

  const getCacheSize = useCallback(() => {
    return cache.current.size;
  }, []);

  return {
    getCachedStatus,
    preloadImages,
    cancelPreload,
    clearCache,
    getCacheSize,
  };
};
