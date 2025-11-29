/**
 * Gemini Context Cache Manager
 * 
 * Manages cached content for faster follow-up responses.
 * Uses Gemini's explicit caching API for large content (videos).
 * 
 * Key benefits:
 * - 50-90% faster follow-up responses
 * - Reduced token costs (cached tokens are cheaper)
 * - Video context persists across messages
 * 
 * Note: Gemini requires minimum 32,768 tokens for explicit caching.
 * For smaller content, implicit caching is used automatically.
 */

import { GoogleAICacheManager, CachedContent } from "@google/generative-ai/server";
import { logger } from "./logger";

// Lazy initialization
let cacheManager: GoogleAICacheManager | null = null;

// In-memory store for chat-to-cache mapping
// In production, use Redis or a database for persistence
const chatCacheMap = new Map<string, {
  cacheName: string;
  createdAt: number;
  expiresAt: number;
}>();

// Cache TTL: 1 hour (can be extended)
const CACHE_TTL_SECONDS = 3600;

// Minimum tokens required for explicit caching (Gemini requirement)
const MIN_TOKENS_FOR_CACHING = 32768;

// Estimated tokens for video (rough: 1.5 tokens per KB)
function estimateVideoTokens(sizeBytes: number): number {
  return Math.ceil((sizeBytes / 1024) * 1.5);
}

function getCacheManager(): GoogleAICacheManager {
  if (!cacheManager) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for cache management");
    }
    cacheManager = new GoogleAICacheManager(apiKey);
  }
  return cacheManager;
}

/**
 * Check if content is large enough for explicit caching
 */
export function isEligibleForCaching(videoSizeBytes?: number): boolean {
  if (!videoSizeBytes) return false;
  const estimatedTokens = estimateVideoTokens(videoSizeBytes);
  return estimatedTokens >= MIN_TOKENS_FOR_CACHING;
}

/**
 * Create a content cache for a chat session with video
 * 
 * @param chatId - Unique chat identifier
 * @param modelName - Gemini model name (e.g., "gemini-3-pro-preview")
 * @param systemInstruction - System prompt
 * @param videoData - Video content (base64 encoded with MIME type)
 * @returns CachedContent object or null if caching not possible
 */
export async function createChatCache(
  chatId: string,
  modelName: string,
  systemInstruction: string,
  videoData: { data: Buffer; mimeType: string }
): Promise<CachedContent | null> {
  const requestId = `cache_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  // Check if video is large enough for explicit caching
  if (!isEligibleForCaching(videoData.data.length)) {
    logger.debug(`[${requestId}] Video too small for explicit caching (${(videoData.data.length / 1024).toFixed(0)} KB, need ~22 MB for 32K tokens)`);
    return null;
  }
  
  logger.info(`[${requestId}] Creating cache for chat ${chatId}`);
  
  try {
    const manager = getCacheManager();
    
    const cache = await manager.create({
      model: modelName,
      displayName: `sportai_chat_${chatId}`,
      systemInstruction,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: videoData.data.toString("base64"),
                mimeType: videoData.mimeType,
              },
            },
          ],
        },
      ],
      ttlSeconds: CACHE_TTL_SECONDS,
    });
    
    logger.info(`[${requestId}] Cache created: ${cache.name}`);
    
    // Store mapping
    chatCacheMap.set(chatId, {
      cacheName: cache.name!,
      createdAt: Date.now(),
      expiresAt: Date.now() + (CACHE_TTL_SECONDS * 1000),
    });
    
    return cache;
  } catch (error) {
    logger.error(`[${requestId}] Failed to create cache:`, error);
    return null;
  }
}

/**
 * Get cached content for a chat session
 * Returns null if no cache exists or cache has expired
 */
export async function getChatCache(chatId: string): Promise<CachedContent | null> {
  const mapping = chatCacheMap.get(chatId);
  
  if (!mapping) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > mapping.expiresAt) {
    logger.debug(`Cache for chat ${chatId} has expired`);
    chatCacheMap.delete(chatId);
    return null;
  }
  
  try {
    const manager = getCacheManager();
    const cache = await manager.get(mapping.cacheName);
    return cache;
  } catch (error) {
    logger.warn(`Failed to get cache for chat ${chatId}:`, error);
    chatCacheMap.delete(chatId);
    return null;
  }
}

/**
 * Check if a chat has an active cache
 */
export function hasChatCache(chatId: string): boolean {
  const mapping = chatCacheMap.get(chatId);
  if (!mapping) return false;
  if (Date.now() > mapping.expiresAt) {
    chatCacheMap.delete(chatId);
    return false;
  }
  return true;
}

/**
 * Get cache name for a chat (for use with getGenerativeModelFromCachedContent)
 */
export function getChatCacheName(chatId: string): string | null {
  const mapping = chatCacheMap.get(chatId);
  if (!mapping) return null;
  if (Date.now() > mapping.expiresAt) {
    chatCacheMap.delete(chatId);
    return null;
  }
  return mapping.cacheName;
}

/**
 * Delete cache for a chat session
 */
export async function deleteChatCache(chatId: string): Promise<void> {
  const mapping = chatCacheMap.get(chatId);
  if (!mapping) return;
  
  try {
    const manager = getCacheManager();
    await manager.delete(mapping.cacheName);
    logger.info(`Deleted cache for chat ${chatId}`);
  } catch (error) {
    logger.warn(`Failed to delete cache for chat ${chatId}:`, error);
  }
  
  chatCacheMap.delete(chatId);
}

/**
 * Extend cache TTL for a chat session
 */
export async function extendCacheTTL(chatId: string, additionalSeconds: number = CACHE_TTL_SECONDS): Promise<boolean> {
  const mapping = chatCacheMap.get(chatId);
  if (!mapping) return false;
  
  try {
    const manager = getCacheManager();
    await manager.update(mapping.cacheName, {
      cachedContent: {
        ttlSeconds: additionalSeconds,
      },
    });
    
    // Update local mapping
    mapping.expiresAt = Date.now() + (additionalSeconds * 1000);
    
    logger.info(`Extended cache TTL for chat ${chatId} by ${additionalSeconds}s`);
    return true;
  } catch (error) {
    logger.warn(`Failed to extend cache TTL for chat ${chatId}:`, error);
    return false;
  }
}

/**
 * Clean up expired caches (call periodically)
 */
export function cleanupExpiredCaches(): void {
  const now = Date.now();
  for (const [chatId, mapping] of chatCacheMap.entries()) {
    if (now > mapping.expiresAt) {
      chatCacheMap.delete(chatId);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  activeCaches: number;
  chatIds: string[];
} {
  cleanupExpiredCaches();
  return {
    activeCaches: chatCacheMap.size,
    chatIds: Array.from(chatCacheMap.keys()),
  };
}

