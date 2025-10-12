import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  strategy: 'write-through' | 'write-behind' | 'write-around';
  maxSize: number;
  enableCompression: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(config: CacheConfig) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  set(key: string, data: any, customTTL?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTTL || this.ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

// Global cache instance
const globalCache = new AdvancedCache({
  ttl: 5 * 60 * 1000, // 5 minutes default
  strategy: 'write-through',
  maxSize: 1000,
  enableCompression: true,
});

export const useAdvancedCache = () => {
  const queryClient = useQueryClient();

  const setCache = useCallback((key: string, data: any, ttl?: number) => {
    globalCache.set(key, data, ttl);
  }, []);

  const getCache = useCallback((key: string) => {
    return globalCache.get(key);
  }, []);

  const hasCache = useCallback((key: string) => {
    return globalCache.has(key);
  }, []);

  const invalidateCache = useCallback((pattern: string) => {
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: [pattern] });
    
    // Clear local cache entries matching pattern
    // This would need pattern matching implementation
  }, [queryClient]);

  const prefetchData = useCallback(async (queryKey: string[], queryFn: () => Promise<any>, ttl?: number) => {
    const cacheKey = queryKey.join(':');
    
    // Check if data exists in cache
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch and cache data
    try {
      const data = await queryFn();
      setCache(cacheKey, data, ttl);
      
      // Also set in React Query cache
      queryClient.setQueryData(queryKey, data);
      
      return data;
    } catch (error) {
      console.error('Prefetch error:', error);
      throw error;
    }
  }, [getCache, setCache, queryClient]);

  const warmupCache = useCallback(async (queries: Array<{ queryKey: string[]; queryFn: () => Promise<any>; ttl?: number }>) => {
    const promises = queries.map(({ queryKey, queryFn, ttl }) => 
      prefetchData(queryKey, queryFn, ttl)
    );
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }, [prefetchData]);

  const getCacheStats = useCallback(() => {
    return globalCache.getStats();
  }, []);

  return {
    setCache,
    getCache,
    hasCache,
    invalidateCache,
    prefetchData,
    warmupCache,
    getCacheStats,
  };
};
