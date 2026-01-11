import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Redis-based rate limiter middleware
 * Falls back to allowing requests if Redis is unavailable
 */
export function redisRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => {
      // Default: use IP address
      return req.ip || req.socket.remoteAddress || 'unknown';
    }
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const windowSeconds = Math.floor(windowMs / 1000);

      const result = await redisService.checkRateLimit(key, max, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        return res.status(429).json({
          error: message,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

/**
 * Strict rate limiter for sensitive endpoints (e.g., voting)
 */
export const strictRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many requests. Please wait before trying again.'
});

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimiter = redisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.'
});

/**
 * Lenient rate limiter for public endpoints
 */
export const publicRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests, please slow down.'
});
