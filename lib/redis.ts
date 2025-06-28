import Redis from 'ioredis';

// Initialize Redis client
// Use environment variable for Redis connection URL or use default localhost
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client
const redis = new Redis(redisUrl);

// Handler for connection events
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Helper functions for working with Redis

/**
 * Set a value in Redis with optional expiration
 * @param key The key to store
 * @param value The value to store (will be JSON stringified)
 * @param expireSeconds Optional expiration time in seconds
 */
export async function setCache(key: string, value: any, expireSeconds?: number): Promise<void> {
  try {
    const stringValue = JSON.stringify(value);
    if (expireSeconds) {
      await redis.setex(key, expireSeconds, stringValue);
    } else {
      await redis.set(key, stringValue);
    }
  } catch (error) {
    console.error('Redis set error:', error);
    // Fail silently - application should work even if caching fails
  }
}

/**
 * Get a value from Redis
 * @param key The key to retrieve
 * @returns The parsed value or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Delete a value from Redis
 * @param key The key to delete
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/**
 * Delete all cache keys matching a pattern
 * @param pattern The pattern to match (e.g., "config:*")
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis delete pattern error:', error);
  }
}

// Helper function to generate cache keys
export function getCacheKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

export default redis; 