import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import {
  estimateTextTokens,
  estimateVideoTokens,
  calculatePricing,
  formatCost,
} from "./token-utils";

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
  conversationHistory?: ConversationHistory[]
): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Starting Gemini query`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] Prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);
  
  // Estimate input tokens
  let estimatedInputTokens = estimateTextTokens(prompt);
  
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
    // Using Gemini 3 Pro - uses dynamic thinking (high) by default
    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });
    
    // Build current message parts
    const parts: any[] = [{ text: prompt }];
    
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
 * Stream Gemini response (for text-only queries)
 * Returns an async generator that yields text chunks
 */
export async function* streamGemini(
  prompt: string,
  conversationHistory?: ConversationHistory[]
): AsyncGenerator<string, void, unknown> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Starting Gemini stream`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] Prompt length: ${prompt.length} characters`);
  logger.debug(`[${requestId}] Conversation history: ${conversationHistory?.length || 0} messages`);
  
  try {
    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });
    
    const parts = [{ text: prompt }];
    
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
    logger.error(`[${requestId}] Error streaming Gemini:`, {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      errorDetails: error?.errorDetails,
    });
    throw error;
  }
}

