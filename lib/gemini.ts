import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import {
  estimateTextTokens,
  estimateVideoTokens,
  calculatePricing,
  formatCost,
} from "./token-utils";
import { getSystemPromptWithDomain } from "./prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";

const MODEL_NAME = "gemini-3-pro-preview";

// Lazy initialization - only check API key when actually used (at runtime)
let genAI: GoogleGenerativeAI | null = null;

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

export interface ConversationHistory {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export async function queryGemini(
  prompt: string,
  videoData?: { data: Buffer; mimeType: string } | null,
  conversationHistory?: ConversationHistory[],
  thinkingMode: ThinkingMode = "fast",
  mediaResolution: MediaResolution = "medium",
  domainExpertise: DomainExpertise = "all-sports"
): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Get system prompt with domain-specific enhancement
  const systemPrompt = getSystemPromptWithDomain(domainExpertise);
  const fullPrompt = `${systemPrompt}\n\n---\n\nUser Query: ${prompt}`;
  
  logger.info(`[${requestId}] Starting Gemini query`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] User prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] Full prompt length: ${fullPrompt.length} characters`);
  logger.debug(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);
  
  // Estimate input tokens (using full prompt with system prompt)
  let estimatedInputTokens = estimateTextTokens(fullPrompt);
  
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
    // Build generation config with thinking level and media resolution
    // Gemini 3 API parameters: thinking_level and media_resolution
    const generationConfig: any = {};
    
    // Map thinking mode to thinkingConfig with thinkingBudget
    // Note: gemini-3-pro-preview requires thinking mode (budget > 0)
    // "fast" = lower thinking budget, "deep" = higher thinking budget
    // thinkingBudget is in tokens - minimum is 1, higher values allow more reasoning
    if (thinkingMode === "deep") {
      generationConfig.thinkingConfig = {
        thinkingBudget: 8192, // Higher budget for deep thinking
      };
    } else {
      generationConfig.thinkingConfig = {
        thinkingBudget: 1024, // Lower budget for fast mode (model requires > 0)
      };
    }
    
    // Map media resolution to API parameter (snake_case for API)
    // The API expects: MEDIA_RESOLUTION_LOW, MEDIA_RESOLUTION_MEDIUM, or MEDIA_RESOLUTION_HIGH
    const mediaResolutionMap: Record<MediaResolution, string> = {
      low: "MEDIA_RESOLUTION_LOW",
      medium: "MEDIA_RESOLUTION_MEDIUM",
      high: "MEDIA_RESOLUTION_HIGH",
    };
    generationConfig.media_resolution = mediaResolutionMap[mediaResolution];
    
    logger.debug(`[${requestId}] Generation config:`, generationConfig);
    
    // Using Gemini 3 Pro with generation config
    const model = getGenAI().getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig,
    });
    
    // Build current message parts (using full prompt with system prompt)
    const parts: any[] = [{ text: fullPrompt }];
    
    // Add media (video or image) if provided
    if (videoData) {
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
    
    logger.debug(`[${requestId}] Sending request to Gemini API...`);
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
    
    return responseText;
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
          model: MODEL_NAME,
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 1024, // Minimum required for gemini-3-pro-preview
            },
          } as any,
        });
        
        // Rebuild parts
        const parts: any[] = [{ text: fullPrompt }];
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
        return responseText;
      } catch (fallbackError: any) {
        logger.error(`[${requestId}] Fallback also failed:`, fallbackError);
        throw fallbackError;
      }
    }
    
    logger.error(`[${requestId}] Error querying Gemini:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      errorDetails: error?.errorDetails,
      stack: error?.stack,
    });
    
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
      throw new Error(`Gemini API error (${error.status}): ${statusText}`);
    }
    
    // Handle errors with errorDetails array
    if (error?.errorDetails && Array.isArray(error.errorDetails) && error.errorDetails.length > 0) {
      const firstError = error.errorDetails[0];
      const errorMsg = firstError?.message || firstError?.reason || "API error";
      logger.error(`[${requestId}] API error details:`, firstError);
      throw new Error(`Gemini API error: ${errorMsg}`);
    }
    
    // Handle generic errors
    const errorMessage = error?.message || error?.toString() || "Failed to query Gemini API";
    logger.error(`[${requestId}] Generic error: ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

/**
 * Stream Gemini response (for text-only and video queries)
 * Returns an async generator that yields text chunks
 */
export async function* streamGemini(
  prompt: string,
  conversationHistory?: ConversationHistory[],
  videoData?: { data: Buffer; mimeType: string } | null,
  thinkingMode: ThinkingMode = "fast",
  mediaResolution: MediaResolution = "medium",
  domainExpertise: DomainExpertise = "all-sports"
): AsyncGenerator<string, void, unknown> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Get system prompt with domain-specific enhancement
  const systemPrompt = getSystemPromptWithDomain(domainExpertise);
  const fullPrompt = `${systemPrompt}\n\n---\n\nUser Query: ${prompt}`;
  
  logger.info(`[${requestId}] Starting Gemini stream`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] User prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] Full prompt length: ${fullPrompt.length} characters`);
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
    // Build generation config with thinking level and media resolution
    // Gemini 3 API parameters: thinking_level and media_resolution
    const generationConfig: any = {};
    
    // Map thinking mode to thinkingConfig with thinkingBudget
    // Note: gemini-3-pro-preview requires thinking mode (budget > 0)
    // "fast" = lower thinking budget, "deep" = higher thinking budget
    // thinkingBudget is in tokens - minimum is 1, higher values allow more reasoning
    if (thinkingMode === "deep") {
      generationConfig.thinkingConfig = {
        thinkingBudget: 8192, // Higher budget for deep thinking
      };
    } else {
      generationConfig.thinkingConfig = {
        thinkingBudget: 1024, // Lower budget for fast mode (model requires > 0)
      };
    }
    
    // Map media resolution to API parameter (snake_case for API)
    // The API expects: MEDIA_RESOLUTION_LOW, MEDIA_RESOLUTION_MEDIUM, or MEDIA_RESOLUTION_HIGH
    const mediaResolutionMap: Record<MediaResolution, string> = {
      low: "MEDIA_RESOLUTION_LOW",
      medium: "MEDIA_RESOLUTION_MEDIUM",
      high: "MEDIA_RESOLUTION_HIGH",
    };
    generationConfig.media_resolution = mediaResolutionMap[mediaResolution];
    
    logger.debug(`[${requestId}] Generation config:`, generationConfig);
    
    const model = getGenAI().getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig,
    });
    
    // Build current message parts (using full prompt with system prompt)
    const parts: any[] = [{ text: fullPrompt }];
    
    // Add media (video or image) if provided
    if (videoData) {
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
    
    logger.debug(`[${requestId}] Streaming request to Gemini API...`);
    
    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        yield chunkText;
      }
    }
    
    logger.info(`[${requestId}] Stream completed: ${fullText.length} characters`);
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
        model: MODEL_NAME,
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 1024, // Minimum required for gemini-3-pro-preview
          },
        } as any,
      });
      
      // Rebuild parts
      const parts: any[] = [{ text: fullPrompt }];
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
        result = await chat.sendMessageStream(parts);
      } else {
        result = await fallbackModel.generateContentStream(parts);
      }
      
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          yield chunkText;
        }
      }
      
      logger.info(`[${requestId}] Stream completed: ${fullText.length} characters`);
      return;
    }
    
    logger.error(`[${requestId}] Error streaming Gemini:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      errorDetails: error?.errorDetails,
    });
    throw error;
  }
}

