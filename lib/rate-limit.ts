import { redis } from "./redis"

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval?: number // Max number of unique tokens per interval
  maxRequests?: number // Max requests per interval, defaults to 1
}

interface RateLimitResponse {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function rateLimit(
  options: RateLimitOptions
): Promise<(identifier: string) => Promise<RateLimitResponse>> {
  const {
    interval,
    uniqueTokenPerInterval = 500,
    maxRequests = 1
  } = options

  const rateLimiterPrefix = "rate-limiter:"

  // Create a sliding window for rate limiting
  return async function rateLimiter(identifier: string): Promise<RateLimitResponse> {
    const now = Date.now()
    const windowStart = now - interval
    const key = `${rateLimiterPrefix}${identifier}`

    try {
      // Start a Redis transaction
      const multi = redis.multi()

      // Add the current timestamp to the sorted set
      multi.zadd(key, now.toString(), now.toString())

      // Remove timestamps outside the current window
      multi.zremrangebyscore(key, "-inf", windowStart.toString())

      // Count requests in the current window
      multi.zcard(key)

      // Set expiry on the key
      multi.pexpire(key, interval)

      // Execute transaction
      const [, , requestCount] = await multi.exec()

      // Get the count from the response
      const count = requestCount ? Number(requestCount[1]) : 0

      const response: RateLimitResponse = {
        success: count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count),
        reset: now + interval
      }

      return response
    } catch (error) {
      console.error("Rate limit error:", error)
      // If Redis fails, default to allowing the request
      return {
        success: true,
        limit: maxRequests,
        remaining: 1,
        reset: now + interval
      }
    }
  }
}

// Helper function to generate a rate limit key
export function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`
} 