import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import redis from '@/lib/redis';

// Global API settings
const CACHE_DURATION = 300; // 5 minutes in seconds
const API_RATE_LIMIT = 100; // requests per minute

/**
 * API middleware that runs before all API routes
 */
export async function middleware(req: NextRequest) {
  // Get the pathname to use for rate limiting and other operations
  const { pathname } = req.nextUrl;
  
  // Get authentication token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Create a response object that we can modify
  const response = NextResponse.next();
  
  // Add common headers
  response.headers.set('X-API-Version', '1.0.0');
  
  // Rate limiting implementation
  if (token) {
    const userId = token.sub as string;
    const rateKey = `rate_limit:${userId}:${Math.floor(Date.now() / 60000)}`; // Key expires each minute
    
    try {
      // Increment the counter for this user in the current minute
      const count = await redis.incr(rateKey);
      
      // Set expiry for the rate limit key (60 seconds)
      if (count === 1) {
        await redis.expire(rateKey, 60);
      }
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', String(API_RATE_LIMIT));
      response.headers.set('X-RateLimit-Remaining', String(Math.max(0, API_RATE_LIMIT - count)));
      
      // If rate limit exceeded
      if (count > API_RATE_LIMIT) {
        return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(API_RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 60000) * 60),
          },
        });
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue even if rate limiting fails
    }
  }
  
  // Cache control for GET requests
  if (req.method === 'GET') {
    response.headers.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
  } else {
    // For non-GET requests, ensure no caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}

// Configure middleware to run on all API routes
export const config = {
  matcher: ['/api/:path*'],
};