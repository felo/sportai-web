import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import { logger } from "./logger";
import {
  estimateTextTokens,
  estimateVideoTokens,
  calculatePricing,
  formatCost,
} from "./token-utils";
import { getSystemPromptWithDomainAndInsight, getFramePromptWithDomainAndInsight, type PromptType, type UserContext } from "./prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise, InsightLevel } from "@/utils/storage";

// Model selection: Gemini 3 Flash for complex, Gemini 2.5 Flash for simple
const MODEL_NAME_PRO = "gemini-3-flash-preview";
const MODEL_NAME_FLASH = "gemini-2.5-flash";

// Minimum tokens for explicit caching (Gemini requirement: 32,768 tokens)
// ~22MB of video content
const MIN_TOKENS_FOR_CACHING = 32768;
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Patterns that indicate an explicitly complex query needing the Pro model
 * These queries benefit from deeper reasoning capabilities
 */
const COMPLEX_QUERY_PATTERNS = [
  /\b(compare|comparison|versus|vs\.?|difference between)\b/i,
  /\b(overall|throughout|all of|each of|entire|whole)\b/i,
  /\b(summarize|summary|recap|overview)\b/i,
  /\b(first|second|third|earlier|previous|before|beginning)\b/i,
  /\b(analyze|analyse|review|evaluate|assess|critique)\b/i,
  /\b(strategy|tactical|game plan|approach)\b/i,
  /\b(step by step|detailed|in-depth|comprehensive)\b/i,
];

/**
 * Determine which model to use based on query characteristics
 * 
 * Use Pro model for:
 * - Video analysis (needs visual understanding)
 * - Explicitly complex queries (compare, analyze, summarize, etc.)
 * 
 * Use Flash model for:
 * - All text-only queries (faster, cheaper)
 * - Including first message without video (likely simple questions)
 */
function selectModel(
  hasVideo: boolean,
  hasHistory: boolean,
  prompt: string
): { modelName: string; reason: string } {
  // Always use Pro for video analysis
  if (hasVideo) {
    return { modelName: MODEL_NAME_PRO, reason: "video_analysis" };
  }
  
  // Check for explicitly complex queries (even without video)
  for (const pattern of COMPLEX_QUERY_PATTERNS) {
    if (pattern.test(prompt)) {
      return { modelName: MODEL_NAME_PRO, reason: "complex_query" };
    }
  }
  
  // All text-only queries → use Flash for speed
  // This includes first message without video (probably just a simple question)
  return { modelName: MODEL_NAME_FLASH, reason: "text_query" };
}

// Lazy initialization - only check API key when actually used (at runtime)
let genAI: GoogleGenerativeAI | null = null;
let cacheManager: GoogleAICacheManager | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      logger.error("GEMINI_API_KEY environment variable is not set");
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function getCacheManager(): GoogleAICacheManager {
  if (!cacheManager) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for cache management");
    }
    cacheManager = new GoogleAICacheManager(process.env.GEMINI_API_KEY);
  }
  return cacheManager;
}

/**
 * Check if video content is large enough for explicit caching
 */
function isEligibleForCaching(videoSizeBytes: number): boolean {
  // Rough estimate: 1.5 tokens per KB
  const estimatedTokens = Math.ceil((videoSizeBytes / 1024) * 1.5);
  return estimatedTokens >= MIN_TOKENS_FOR_CACHING;
}

export interface ConversationHistory {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface LLMResponse {
  text: string;
  cacheName?: string; // If a new cache was created
  cacheUsed: boolean; // Whether cached content was used
  modelUsed: string; // Which model was used (pro or flash)
  modelReason: string; // Why that model was selected
}

export async function queryLLM(
  prompt: string,
  videoData?: { data: Buffer; mimeType: string } | null,
  conversationHistory?: ConversationHistory[],
  thinkingMode: ThinkingMode = "fast",
  mediaResolution: MediaResolution = "medium",
  domainExpertise: DomainExpertise = "all-sports",
  promptType: PromptType = "video",
  queryComplexity: "simple" | "complex" = "complex",
  existingCacheName?: string,
  insightLevel: InsightLevel = "beginner",
  userContext?: UserContext
): Promise<LLMResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Check if video is present
  const hasVideo = !!videoData;
  
  // Get system prompt with domain-specific, insight level, AND user context enhancement
  const systemPrompt = promptType === "frame" 
    ? getFramePromptWithDomainAndInsight(domainExpertise, insightLevel, userContext)
    : getSystemPromptWithDomainAndInsight(domainExpertise, insightLevel, userContext, hasVideo);
  
  // Select model based on query characteristics
  const hasHistory = !!(conversationHistory && conversationHistory.length > 0);
  const { modelName: selectedModel, reason: modelReason } = selectModel(hasVideo, hasHistory, prompt);
  
  logger.info(`[${requestId}] Starting LLM query`);
  logger.debug(`[${requestId}] Model: ${selectedModel} (${modelReason})`);
  logger.debug(`[${requestId}] Insight level: ${insightLevel}`);
  logger.debug(`[${requestId}] Domain: ${domainExpertise}`);
  logger.debug(`[${requestId}] User: ${userContext?.firstName || "anonymous"}`);
  logger.debug(`[${requestId}] User prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] System prompt length: ${systemPrompt.length} characters`);
  logger.debug(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);
  
  // Estimate input tokens (system instruction + user prompt + history)
  // Note: systemInstruction is sent separately but still counts toward input
  let estimatedInputTokens = estimateTextTokens(systemPrompt) + estimateTextTokens(prompt);
  
  // Add tokens from conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    const historyTokens = conversationHistory.reduce(
      (sum, msg) => sum + estimateTextTokens(msg.parts.map(p => p.text).join("")),
      0
    );
    estimatedInputTokens += historyTokens;
    logger.debug(`[${requestId}] History tokens: ${historyTokens.toLocaleString()}`);
  }
  
  if (videoData) {
    const isImage = videoData.mimeType.startsWith("image/");
    const mediaType = isImage ? "image" : "video";
    const mediaSizeMB = (videoData.data.length / (1024 * 1024)).toFixed(2);
    
    // Images use different token estimation than videos
    // For images: roughly 257 tokens per image (base) + size-based estimation
    // For videos: use existing video token estimation
    let mediaTokens: number;
    if (isImage) {
      // Gemini images: base 257 tokens + ~85 tokens per 100KB
      const imageSizeKB = videoData.data.length / 1024;
      mediaTokens = 257 + Math.ceil((imageSizeKB / 100) * 85);
    } else {
      mediaTokens = estimateVideoTokens(videoData.data.length, videoData.mimeType);
    }
    
    estimatedInputTokens += mediaTokens;
    logger.info(`[${requestId}] ${mediaType} attached: ${videoData.mimeType}, ${mediaSizeMB} MB`);
    logger.debug(`[${requestId}] Estimated ${mediaType} tokens: ${mediaTokens.toLocaleString()}`);
  } else {
    logger.debug(`[${requestId}] No media attached`);
  }
  logger.debug(`[${requestId}] Estimated input tokens: ${estimatedInputTokens.toLocaleString()}`);
  
  logger.time(`[${requestId}] API call duration`);
  
  try {
    // Build generation config
    const generationConfig: any = {};
    const isFlashModel = selectedModel.includes("flash");
    
    // Thinking config only applies to Pro/thinking models, not Flash
    let thinkingBudget: number | undefined;
    
    if (!isFlashModel) {
      // Smart thinking budget for Pro model
      if (thinkingMode === "deep") {
        thinkingBudget = 8192;
      } else {
        const promptTokens = estimateTextTokens(prompt);
        const hasLongHistory = conversationHistory && conversationHistory.length > 5;
        
        if (hasVideo) {
          thinkingBudget = 1024;
        } else if (queryComplexity === "simple") {
          thinkingBudget = 64;
        } else if (promptTokens > 50 || hasLongHistory) {
          thinkingBudget = 256;
        } else {
          thinkingBudget = 64;
        }
      }
      
      generationConfig.thinkingConfig = { thinkingBudget };
      logger.debug(`[${requestId}] Pro model - thinking budget: ${thinkingBudget} tokens`);
    } else {
      logger.debug(`[${requestId}] Flash model - no thinking config`);
    }
    
    // Media resolution only for Pro model with video
    if (hasVideo && !isFlashModel) {
      const mediaResolutionMap: Record<MediaResolution, string> = {
        low: "MEDIA_RESOLUTION_LOW",
        medium: "MEDIA_RESOLUTION_MEDIUM",
        high: "MEDIA_RESOLUTION_HIGH",
      };
      generationConfig.media_resolution = mediaResolutionMap[mediaResolution];
    }
    
    logger.debug(`[${requestId}] Generation config:`, generationConfig);
    
    // Track caching state
    let cacheUsed = false;
    let newCacheName: string | undefined;
    let model: any;
    
    // Try to use existing cache if provided
    if (existingCacheName) {
      try {
        logger.debug(`[${requestId}] Attempting to use existing cache: ${existingCacheName}`);
        const cachedContent = await getCacheManager().get(existingCacheName);
        model = getGenAI().getGenerativeModelFromCachedContent(cachedContent, {
          generationConfig,
        });
        cacheUsed = true;
        logger.info(`[${requestId}] ✅ Using cached content`);
      } catch (cacheError) {
        logger.warn(`[${requestId}] Cache not found or expired, falling back to normal model`, cacheError);
      }
    }
    
    // If no cache used, check if we should create one for large videos
    if (!cacheUsed && videoData && isEligibleForCaching(videoData.data.length)) {
      try {
        logger.debug(`[${requestId}] Video eligible for caching (${(videoData.data.length / 1024 / 1024).toFixed(2)} MB)`);
        const cache = await getCacheManager().create({
          model: `models/${MODEL_NAME_PRO}`,
          displayName: `sportai_${requestId}`,
          systemInstruction: systemPrompt,
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
        
        newCacheName = cache.name;
        model = getGenAI().getGenerativeModelFromCachedContent(cache, {
          generationConfig,
        });
        cacheUsed = true;
        logger.info(`[${requestId}] ✅ Created new cache: ${cache.name}`);
      } catch (cacheError) {
        logger.warn(`[${requestId}] Failed to create cache, using normal model`, cacheError);
      }
    }
    
    // Fall back to normal model if caching wasn't used
    if (!model) {
      model = getGenAI().getGenerativeModel({ 
        model: selectedModel,
        generationConfig,
        systemInstruction: systemPrompt,
      });
    }
    
    // Build current message parts (user prompt only - system instruction is separate)
    const parts: any[] = [{ text: prompt }];
    
    // Add media (video or image) if provided AND not using cached content
    // Cached content already includes the video
    if (videoData && !cacheUsed) {
      const base64Length = videoData.data.toString("base64").length;
      const mediaType = videoData.mimeType.startsWith("image/") ? "image" : "video";
      logger.debug(`[${requestId}] ${mediaType} base64 length: ${base64Length} characters`);
      
      parts.push({
        inlineData: {
          data: videoData.data.toString("base64"),
          mimeType: videoData.mimeType,
        },
      });
    }
    
    // For conversation history, use startChat() if history exists, otherwise use generateContent()
    let result: any;
    
    if (conversationHistory && conversationHistory.length > 0) {
      // Use startChat() for multi-turn conversations
      logger.debug(`[${requestId}] Using chat mode with ${conversationHistory.length} history messages`);
      const chat = model.startChat({
        history: conversationHistory,
      });
      result = await chat.sendMessage(parts);
    } else {
      // Use generateContent() for single-turn queries
      logger.debug(`[${requestId}] Using single-turn mode`);
      result = await model.generateContent(parts);
    }
    
    logger.debug(`[${requestId}] Sending request to LLM API...`);
    const response = await result.response;
    const responseText = response.text();
    
    logger.timeEnd(`[${requestId}] API call duration`);
    logger.info(`[${requestId}] Response received: ${responseText.length} characters`);
    
    // Estimate output tokens
    const estimatedOutputTokens = estimateTextTokens(responseText);
    logger.debug(`[${requestId}] Estimated output tokens: ${estimatedOutputTokens.toLocaleString()}`);
    
    // Get actual token counts if available
    let actualInputTokens: number | null = null;
    let actualOutputTokens: number | null = null;
    
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      logger.debug(`[${requestId}] Finish reason: ${candidate.finishReason || "unknown"}`);
      
      // Log token count if available (may not be present in all SDK versions)
      if ('tokenCount' in candidate && candidate.tokenCount) {
        const tokenCount = (candidate as any).tokenCount;
        logger.debug(`[${requestId}] Actual token count: ${JSON.stringify(tokenCount)}`);
        
        if (typeof tokenCount === 'object') {
          actualInputTokens = tokenCount.inputTokens || tokenCount.input || null;
          actualOutputTokens = tokenCount.outputTokens || tokenCount.output || null;
        } else if (typeof tokenCount === 'number') {
          // If it's just a number, assume it's output tokens
          actualOutputTokens = tokenCount;
        }
      }
    }
    
    // Use actual tokens if available, otherwise use estimates
    const inputTokens = actualInputTokens ?? estimatedInputTokens;
    const outputTokens = actualOutputTokens ?? estimatedOutputTokens;
    
    // Calculate pricing
    const pricing = calculatePricing(inputTokens, outputTokens);
    logger.debug(`[${requestId}] Token usage:`);
    logger.debug(`[${requestId}]   Input: ${inputTokens.toLocaleString()} tokens (${actualInputTokens ? 'actual' : 'estimated'})`);
    logger.debug(`[${requestId}]   Output: ${outputTokens.toLocaleString()} tokens (${actualOutputTokens ? 'actual' : 'estimated'})`);
    logger.debug(`[${requestId}]   Total: ${(inputTokens + outputTokens).toLocaleString()} tokens`);
    logger.debug(`[${requestId}] Pricing:`);
    logger.debug(`[${requestId}]   Input: ${formatCost(pricing.inputCost)} ($${pricing.inputPricePerM}/1M tokens)`);
    logger.debug(`[${requestId}]   Output: ${formatCost(pricing.outputCost)} ($${pricing.outputPricePerM}/1M tokens)`);
    logger.debug(`[${requestId}]   Total: ${formatCost(pricing.totalCost)}`);
    
    return {
      text: responseText,
      cacheName: newCacheName,
      cacheUsed,
      modelUsed: selectedModel,
      modelReason,
    };
  } catch (error: any) {
    logger.timeEnd(`[${requestId}] API call duration`);
    
    // If generationConfig fails, try without it (for backwards compatibility)
    // Also catch "Budget 0 is invalid" errors which indicate thinking mode is required
    if (error?.message?.includes("generationConfig") || 
        error?.message?.includes("thinkingConfig") || 
        error?.message?.includes("thinkingBudget") || 
        error?.message?.includes("mediaResolution") || 
        error?.message?.includes("thinkingMode") ||
        error?.message?.includes("Budget 0 is invalid") ||
        error?.message?.includes("only works in thinking mode")) {
      logger.debug(`[${requestId}] Generation config parameters not supported, falling back to default settings`);
      try {
        // Retry with minimal thinking config (model requires thinking mode)
        const fallbackModel = getGenAI().getGenerativeModel({ 
          model: MODEL_NAME_PRO,
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 1024, // Minimum required for gemini-3-pro-preview
            },
          } as any,
          systemInstruction: systemPrompt,
        });
        
        // Rebuild parts (user prompt only)
        const parts: any[] = [{ text: prompt }];
        if (videoData) {
          parts.push({
            inlineData: {
              data: videoData.data.toString("base64"),
              mimeType: videoData.mimeType,
            },
          });
        }
        
        let result: any;
        if (conversationHistory && conversationHistory.length > 0) {
          const chat = fallbackModel.startChat({ history: conversationHistory });
          result = await chat.sendMessage(parts);
        } else {
          result = await fallbackModel.generateContent(parts);
        }
        
        const response = result.response;
        const responseText = response.text();
        
        logger.info(`[${requestId}] Response received (fallback): ${responseText.length} characters`);
        return {
          text: responseText,
          cacheName: undefined,
          cacheUsed: false,
          modelUsed: MODEL_NAME_PRO,
          modelReason: "fallback",
        };
      } catch (fallbackError: any) {
        logger.error(`[${requestId}] Fallback also failed:`, fallbackError);
        throw fallbackError;
      }
    }
    
    logger.error(`[${requestId}] Error querying LLM:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      errorDetails: error?.errorDetails,
      stack: error?.stack,
    });
    
    // Handle Google Generative AI specific errors with user-friendly messages
    // Don't expose raw Google error messages to users
    if (error?.message?.includes("[GoogleGenerativeAI Error]")) {
      logger.error(`[${requestId}] Google AI error detected, returning user-friendly message`);
      
      // Handle conversation history errors
      if (error?.message?.includes("First content should be with role")) {
        throw new Error("Something went wrong with the conversation. Please try again.");
      }
      
      // Handle other Google-specific errors
      throw new Error("The AI service encountered an issue. Please try again.");
    }
    
    // Handle rate limiting (429) - check both direct and nested status
    const status = error?.status || error?.response?.status;
    if (status === 429) {
      const retryDelay = error?.errorDetails?.[0]?.retryDelay || "a moment";
      logger.error(`[${requestId}] Rate limit exceeded. Retry delay: ${retryDelay}`);
      throw new Error(`Rate limit exceeded. Please wait ${retryDelay} before trying again.`);
    }
    
    // Handle other API errors with status codes
    if (error?.status) {
      const statusText = error?.statusText || error?.message || "Unknown error";
      logger.error(`[${requestId}] API error ${error.status}: ${statusText}`);
      throw new Error(`LLM API error (${error.status}): ${statusText}`);
    }
    
    // Handle errors with errorDetails array
    if (error?.errorDetails && Array.isArray(error.errorDetails) && error.errorDetails.length > 0) {
      const firstError = error.errorDetails[0];
      const errorMsg = firstError?.message || firstError?.reason || "API error";
      logger.error(`[${requestId}] API error details:`, firstError);
      throw new Error(`LLM API error: ${errorMsg}`);
    }
    
    // Handle generic errors
    const errorMessage = error?.message || error?.toString() || "Failed to query LLM API";
    logger.error(`[${requestId}] Generic error: ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

export interface StreamLLMResult {
  textGenerator: AsyncGenerator<string, void, unknown>;
  cacheName?: string;
  cacheUsed: boolean;
  modelUsed: string;
  modelReason: string;
}

/**
 * Stream LLM response (for text-only and video queries)
 * Returns an async generator that yields text chunks, plus cache info
 */
export async function streamLLM(
  prompt: string,
  conversationHistory?: ConversationHistory[],
  videoData?: { data: Buffer; mimeType: string } | null,
  thinkingMode: ThinkingMode = "fast",
  mediaResolution: MediaResolution = "medium",
  domainExpertise: DomainExpertise = "all-sports",
  promptType: PromptType = "video",
  queryComplexity: "simple" | "complex" = "complex",
  existingCacheName?: string,
  insightLevel: InsightLevel = "beginner",
  userContext?: UserContext
): Promise<StreamLLMResult> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Check if video is present
  const hasVideo = !!videoData;
  
  // Get system prompt with domain-specific, insight level, AND user context enhancement
  const systemPrompt = promptType === "frame" 
    ? getFramePromptWithDomainAndInsight(domainExpertise, insightLevel, userContext)
    : getSystemPromptWithDomainAndInsight(domainExpertise, insightLevel, userContext, hasVideo);
  
  // Select model based on query characteristics
  const hasHistory = !!(conversationHistory && conversationHistory.length > 0);
  const { modelName: selectedModel, reason: modelReason } = selectModel(hasVideo, hasHistory, prompt);
  
  logger.info(`[${requestId}] Starting LLM stream`);
  logger.debug(`[${requestId}] Model: ${selectedModel} (${modelReason})`);
  logger.debug(`[${requestId}] Insight level: ${insightLevel}`);
  logger.debug(`[${requestId}] Domain: ${domainExpertise}`);
  logger.debug(`[${requestId}] User: ${userContext?.firstName || "anonymous"}`);
  logger.debug(`[${requestId}] User prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] System prompt length: ${systemPrompt.length} characters`);
  logger.debug(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);
  logger.debug(`[${requestId}] Thinking mode: ${thinkingMode}`);
  logger.debug(`[${requestId}] Media resolution: ${mediaResolution}`);
  
  if (videoData) {
    const isImage = videoData.mimeType.startsWith("image/");
    const mediaType = isImage ? "image" : "video";
    const mediaSizeMB = (videoData.data.length / (1024 * 1024)).toFixed(2);
    logger.info(`[${requestId}] ${mediaType} attached: ${videoData.mimeType}, ${mediaSizeMB} MB`);
  }
  
  try {
    // Build generation config
    const generationConfig: any = {};
    const isFlashModel = selectedModel.includes("flash");
    
    // Thinking config only applies to Pro/thinking models, not Flash
    let thinkingBudget: number | undefined;
    
    if (!isFlashModel) {
      // Smart thinking budget for Pro model
      if (thinkingMode === "deep") {
        thinkingBudget = 8192;
      } else {
        const promptTokens = estimateTextTokens(prompt);
        const hasLongHistory = conversationHistory && conversationHistory.length > 5;
        
        if (hasVideo) {
          thinkingBudget = 1024;
        } else if (queryComplexity === "simple") {
          thinkingBudget = 64;
        } else if (promptTokens > 50 || hasLongHistory) {
          thinkingBudget = 256;
        } else {
          thinkingBudget = 64;
        }
      }
      
      generationConfig.thinkingConfig = { thinkingBudget };
      logger.debug(`[${requestId}] Pro model - thinking budget: ${thinkingBudget} tokens`);
    } else {
      logger.debug(`[${requestId}] Flash model - no thinking config`);
    }
    
    // Media resolution only for Pro model with video
    if (hasVideo && !isFlashModel) {
      const mediaResolutionMap: Record<MediaResolution, string> = {
        low: "MEDIA_RESOLUTION_LOW",
        medium: "MEDIA_RESOLUTION_MEDIUM",
        high: "MEDIA_RESOLUTION_HIGH",
      };
      generationConfig.media_resolution = mediaResolutionMap[mediaResolution];
    }
    
    logger.debug(`[${requestId}] Generation config:`, generationConfig);
    
    // Track caching state
    let cacheUsed = false;
    let newCacheName: string | undefined;
    let model: any;
    
    // Try to use existing cache if provided
    if (existingCacheName) {
      try {
        logger.debug(`[${requestId}] Attempting to use existing cache: ${existingCacheName}`);
        const cachedContent = await getCacheManager().get(existingCacheName);
        model = getGenAI().getGenerativeModelFromCachedContent(cachedContent, {
          generationConfig,
        });
        cacheUsed = true;
        logger.info(`[${requestId}] ✅ Using cached content for streaming`);
      } catch (cacheError) {
        logger.warn(`[${requestId}] Cache not found or expired, falling back to normal model`, cacheError);
      }
    }
    
    // If no cache used, check if we should create one for large videos
    if (!cacheUsed && videoData && isEligibleForCaching(videoData.data.length)) {
      try {
        logger.debug(`[${requestId}] Video eligible for caching (${(videoData.data.length / 1024 / 1024).toFixed(2)} MB)`);
        const cache = await getCacheManager().create({
          model: `models/${MODEL_NAME_PRO}`,
          displayName: `sportai_${requestId}`,
          systemInstruction: systemPrompt,
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
        
        newCacheName = cache.name;
        model = getGenAI().getGenerativeModelFromCachedContent(cache, {
          generationConfig,
        });
        cacheUsed = true;
        logger.info(`[${requestId}] ✅ Created new cache for streaming: ${cache.name}`);
      } catch (cacheError) {
        logger.warn(`[${requestId}] Failed to create cache, using normal model`, cacheError);
      }
    }
    
    // Fall back to normal model if caching wasn't used
    if (!model) {
      model = getGenAI().getGenerativeModel({ 
        model: selectedModel,
        generationConfig,
        systemInstruction: systemPrompt,
      });
    }
    
    // Build current message parts (user prompt only - system instruction is separate)
    const parts: any[] = [{ text: prompt }];
    
    // Add media (video or image) if provided AND not using cached content
    // Cached content already includes the video
    if (videoData && !cacheUsed) {
      const base64Length = videoData.data.toString("base64").length;
      const mediaType = videoData.mimeType.startsWith("image/") ? "image" : "video";
      logger.debug(`[${requestId}] ${mediaType} base64 length: ${base64Length} characters`);
      
      parts.push({
        inlineData: {
          data: videoData.data.toString("base64"),
          mimeType: videoData.mimeType,
        },
      });
    }
    
    // For conversation history, use startChat() if history exists, otherwise use generateContentStream()
    let result: any;
    
    if (conversationHistory && conversationHistory.length > 0) {
      // Use startChat() for multi-turn conversations
      logger.debug(`[${requestId}] Using chat mode with ${conversationHistory.length} history messages`);
      const chat = model.startChat({
        history: conversationHistory,
      });
      result = await chat.sendMessageStream(parts);
    } else {
      // Use generateContentStream() for single-turn queries
      logger.debug(`[${requestId}] Using single-turn streaming mode`);
      result = await model.generateContentStream(parts);
    }
    
    logger.debug(`[${requestId}] Streaming request to LLM API...`);
    
    // Create the text generator as an inner async generator
    async function* createTextGenerator(): AsyncGenerator<string, void, unknown> {
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          yield chunkText;
        }
      }
      logger.info(`[${requestId}] Stream completed: ${fullText.length} characters`);
    }
    
    return {
      textGenerator: createTextGenerator(),
      cacheName: newCacheName,
      cacheUsed,
      modelUsed: selectedModel,
      modelReason,
    };
  } catch (error: any) {
    // If generationConfig fails, try without it (for backwards compatibility)
    // Also catch "Budget 0 is invalid" errors which indicate thinking mode is required
    if (error?.message?.includes("generationConfig") || 
        error?.message?.includes("thinkingConfig") || 
        error?.message?.includes("thinkingBudget") || 
        error?.message?.includes("mediaResolution") || 
        error?.message?.includes("thinkingMode") ||
        error?.message?.includes("thinking_level") ||
        error?.message?.includes("media_resolution") ||
        error?.message?.includes("Budget 0 is invalid") ||
        error?.message?.includes("only works in thinking mode")) {
      logger.debug(`[${requestId}] Generation config parameters not supported, falling back to default settings`);
      // Retry with minimal thinking config (model requires thinking mode)
      const fallbackModel = getGenAI().getGenerativeModel({ 
        model: MODEL_NAME_PRO,
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 1024, // Minimum required for gemini-3-pro-preview
          },
        } as any,
        systemInstruction: systemPrompt,
      });
      
      // Rebuild parts (user prompt only)
      const fallbackParts: any[] = [{ text: prompt }];
      if (videoData) {
        fallbackParts.push({
          inlineData: {
            data: videoData.data.toString("base64"),
            mimeType: videoData.mimeType,
          },
        });
      }
      
      let fallbackResult: any;
      if (conversationHistory && conversationHistory.length > 0) {
        const chat = fallbackModel.startChat({ history: conversationHistory });
        fallbackResult = await chat.sendMessageStream(fallbackParts);
      } else {
        fallbackResult = await fallbackModel.generateContentStream(fallbackParts);
      }
      
      async function* fallbackGenerator(): AsyncGenerator<string, void, unknown> {
        let fullText = "";
        for await (const chunk of fallbackResult.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullText += chunkText;
            yield chunkText;
          }
        }
        logger.info(`[${requestId}] Stream completed (fallback): ${fullText.length} characters`);
      }
      
      return {
        textGenerator: fallbackGenerator(),
        cacheName: undefined,
        cacheUsed: false,
        modelUsed: MODEL_NAME_PRO,
        modelReason: "fallback",
      };
    }
    
    logger.error(`[${requestId}] Error streaming LLM:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      errorDetails: error?.errorDetails,
    });
    
    // Handle Google Generative AI specific errors with user-friendly messages
    // Don't expose raw Google error messages to users
    if (error?.message?.includes("[GoogleGenerativeAI Error]")) {
      logger.error(`[${requestId}] Google AI error detected, returning user-friendly message`);
      
      // Handle conversation history errors
      if (error?.message?.includes("First content should be with role")) {
        throw new Error("Something went wrong with the conversation. Please try again.");
      }
      
      // Handle other Google-specific errors
      throw new Error("The AI service encountered an issue. Please try again.");
    }
    
    // Provide more helpful error messages for common issues
    if (error?.status === 500 || error?.statusText === "Internal Server Error") {
      if (videoData) {
        const mediaSizeMB = (videoData.data.length / (1024 * 1024)).toFixed(2);
        throw new Error(
          `LLM API encountered an internal error while processing your ${mediaSizeMB}MB video. This often happens with longer videos. Try: (1) Using a shorter video clip, (2) Compressing the video, or (3) Switching to 'Low' media resolution in settings.`
        );
      } else {
        throw new Error(
          "LLM API encountered an internal error. Please try again in a few moments."
        );
      }
    }
    
    throw error;
  }
}

