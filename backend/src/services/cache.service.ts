// =====================================================
// Cache Service - Redis Caching Operations
// Provides caching functionality across the application
// =====================================================

import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis client
   */
  private async initialize(): Promise<void> {
    try {
      // Create Redis client
      this.client = createClient({
        socket: {
          host: env.redis.host,
          port: env.redis.port,
        },
        password: env.redis.password || undefined,
        database: 0, // Use database 0 by default
      });

      // Error handler
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      // Connect handler
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      // Reconnect handler
      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      // Connect to Redis
      await this.client.connect();
      
      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      this.isConnected = false;
    }
  }

  /**
   * Check if cache service is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, returning null');
      return null;
    }

    try {
      const value = await this.client!.get(key);
      if (value === null) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Cache not available, skipping set operation');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.client!.setEx(key, ttl, serialized);
      } else {
        await this.client!.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client!.del(keys);
      return keys.length;
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get time to live for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.client!.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client!.incr(key);
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client!.decr(key);
    } catch (error) {
      logger.error(`Error decrementing key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get or set pattern - retrieve from cache or compute and cache
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute the value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Store user session
   */
  async setSession(userId: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`session:${userId}`, sessionData, ttl);
  }

  /**
   * Get user session
   */
  async getSession(userId: string): Promise<any> {
    return this.get(`session:${userId}`);
  }

  /**
   * Delete user session
   */
  async deleteSession(userId: string): Promise<boolean> {
    return this.del(`session:${userId}`);
  }

  /**
   * Cache employee data
   */
  async cacheEmployee(employeeId: string, employeeData: any, ttl: number = 3600): Promise<boolean> {
    return this.set(`employee:${employeeId}`, employeeData, ttl);
  }

  /**
   * Get cached employee data
   */
  async getCachedEmployee(employeeId: string): Promise<any> {
    return this.get(`employee:${employeeId}`);
  }

  /**
   * Invalidate employee cache
   */
  async invalidateEmployee(employeeId: string): Promise<boolean> {
    return this.del(`employee:${employeeId}`);
  }

  /**
   * Invalidate all employee caches for an organization
   */
  async invalidateOrganizationEmployees(organizationId: string): Promise<number> {
    return this.delPattern(`employee:*:org:${organizationId}`);
  }

  /**
   * Cache organization data
   */
  async cacheOrganization(organizationId: string, data: any, ttl: number = 7200): Promise<boolean> {
    return this.set(`organization:${organizationId}`, data, ttl);
  }

  /**
   * Get cached organization data
   */
  async getCachedOrganization(organizationId: string): Promise<any> {
    return this.get(`organization:${organizationId}`);
  }

  /**
   * Rate limiting - increment request count
   */
  async incrementRateLimit(identifier: string, windowSeconds: number): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const key = `ratelimit:${identifier}`;
    
    try {
      const count = await this.incr(key);
      if (count === 1) {
        // Set expiration on first increment
        await this.expire(key, windowSeconds);
      }
      return count;
    } catch (error) {
      logger.error(`Error incrementing rate limit for ${identifier}:`, error);
      return null;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return await this.client!.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.flushAll();
      logger.warn('Cache flushed - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client!.info();
      return info;
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Cache service disconnected');
    }
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const response = await this.client!.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Error pinging cache:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export cache key generators
export const CacheKeys = {
  employee: (employeeId: string) => `employee:${employeeId}`,
  organization: (organizationId: string) => `organization:${organizationId}`,
  session: (userId: string) => `session:${userId}`,
  rateLimit: (identifier: string) => `ratelimit:${identifier}`,
  leaveBalance: (employeeId: string) => `leave:balance:${employeeId}`,
  attendance: (employeeId: string, date: string) => `attendance:${employeeId}:${date}`,
};
