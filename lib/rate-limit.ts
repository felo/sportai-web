import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Rate Limiting Configuration
 * 
 * Uses Upstash Redis for production (works with serverless/Vercel)
 * Falls back to in-memory rate limiting for development
 */

// Rate limit tiers - adjust based on your needs
export const RATE_LIMITS = {
  // Standard API endpoints (tasks, profile, etc.)
  standard: {
    requests: 60,
    window: "1 m" as const, // 60 requests per minute
  },
  // Heavy LLM operations (video analysis, deep thinking) - authenticated users
  heavy: {
    requests: 10,
    window: "1 m" as const, // 10 requests per minute per user
  },
  // Light LLM operations (text-only, fast thinking) - authenticated users
  light: {
    requests: 30,
    window: "1 m" as const, // 30 requests per minute per user
  },
  // Trial tier for unauthenticated users (IP-based, shared on same network)
  // Moderate limit - shared across all guests on same network
  trial: {
    requests: 12,
    window: "1 m" as const, // 12 requests per minute per IP
  },
  // Very expensive operations (video upload, task creation)
  veryExpensive: {
    requests: 5,
    window: "1 m" as const, // 5 requests per minute
  },
  // Auth-related endpoints (prevent brute force)
  auth: {
    requests: 10,
    window: "15 m" as const, // 10 requests per 15 minutes
  },
  // Burst protection for general access
  burst: {
    requests: 100,
    window: "10 s" as const, // 100 requests per 10 seconds
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

// In-memory store for development (not suitable for production)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function getInMemoryRateLimiter(tier: RateLimitTier) {
  const config = RATE_LIMITS[tier];
  const windowMs = parseWindow(config.window);

  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const key = `${tier}:${identifier}`;
      const stored = inMemoryStore.get(key);

      // Clean up expired entries periodically
      if (Math.random() < 0.01) {
        cleanupInMemoryStore();
      }

      if (!stored || stored.resetAt < now) {
        // New window
        inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
        return {
          success: true,
          limit: config.requests,
          remaining: config.requests - 1,
          reset: now + windowMs,
        };
      }

      if (stored.count >= config.requests) {
        // Rate limited
        return {
          success: false,
          limit: config.requests,
          remaining: 0,
          reset: stored.resetAt,
        };
      }

      // Increment
      stored.count++;
      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - stored.count,
        reset: stored.resetAt,
      };
    },
  };
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60000; // Default 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60000;
  }
}

function cleanupInMemoryStore() {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}

// Singleton Redis client
let redis: Redis | null = null;
let rateLimiters: Map<RateLimitTier, Ratelimit> = new Map();

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getUpstashRateLimiter(tier: RateLimitTier): Ratelimit | null {
  const existing = rateLimiters.get(tier);
  if (existing) return existing;

  const redisClient = getRedisClient();
  if (!redisClient) return null;

  const config = RATE_LIMITS[tier];
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `sportai:ratelimit:${tier}`,
  });

  rateLimiters.set(tier, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for an identifier
 * Uses Upstash Redis in production, in-memory store in development
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "standard"
): Promise<RateLimitResult> {
  // Try Upstash first (production)
  const upstashLimiter = getUpstashRateLimiter(tier);
  
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  // Fall back to in-memory (development)
  const inMemoryLimiter = getInMemoryRateLimiter(tier);
  return inMemoryLimiter.limit(identifier);
}

/**
 * Get the identifier for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  const ip = cfIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  
  if (!result.success) {
    response.headers.set(
      "Retry-After",
      Math.ceil((result.reset - Date.now()) / 1000).toString()
    );
  }

  return response;
}

/**
 * Create a rate limited response (429 Too Many Requests)
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
  
  const response = NextResponse.json(
    {
      error: "Too many requests",
      message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
      retryAfter,
    },
    { status: 429 }
  );

  return addRateLimitHeaders(response, result);
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  tier: RateLimitTier = "standard"
) {
  return async (request: Request, ...args: unknown[]): Promise<NextResponse> => {
    const identifier = getRateLimitIdentifier(request);
    const result = await checkRateLimit(identifier, tier);

    if (!result.success) {
      return rateLimitedResponse(result);
    }

    const response = await handler(request, ...args);
    return addRateLimitHeaders(response, result);
  };
}

