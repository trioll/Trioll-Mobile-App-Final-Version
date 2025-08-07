class CacheManager {
  private cache = new Map<string, { data: any; expiry: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheManager = new CacheManager();
export default cacheManager;
