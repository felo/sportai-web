import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

interface RedisHealthResponse {
  status: "connected" | "disconnected" | "error";
  provider: "upstash" | "memory" | "none";
  latency?: number;
  timestamp: string;
  error?: string;
  details?: {
    url?: string;
    hasToken: boolean;
    testKey?: string;
    testValue?: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<RedisHealthResponse>> {
  const timestamp = new Date().toISOString();
  
  // Check if Upstash environment variables are set
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    return NextResponse.json({
      status: "disconnected",
      provider: process.env.NODE_ENV === "development" ? "memory" : "none",
      timestamp,
      error: "Redis environment variables not configured",
      details: {
        url: redisUrl ? `${redisUrl.substring(0, 30)}...` : undefined,
        hasToken: !!redisToken,
      },
    });
  }
  
  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    // Test the connection with a simple ping-pong
    const startTime = Date.now();
    const testKey = `health-check-${Date.now()}`;
    const testValue = "pong";
    
    // Set a test value
    await redis.set(testKey, testValue, { ex: 10 }); // expires in 10 seconds
    
    // Get it back
    const result = await redis.get(testKey);
    
    // Delete it
    await redis.del(testKey);
    
    const latency = Date.now() - startTime;
    
    if (result === testValue) {
      return NextResponse.json({
        status: "connected",
        provider: "upstash",
        latency,
        timestamp,
        details: {
          url: `${redisUrl.substring(0, 30)}...`,
          hasToken: true,
          testKey,
          testValue: result as string,
        },
      });
    } else {
      return NextResponse.json({
        status: "error",
        provider: "upstash",
        latency,
        timestamp,
        error: `Test value mismatch: expected "${testValue}", got "${result}"`,
        details: {
          url: `${redisUrl.substring(0, 30)}...`,
          hasToken: true,
        },
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      provider: "upstash",
      timestamp,
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        url: `${redisUrl.substring(0, 30)}...`,
        hasToken: true,
      },
    });
  }
}

