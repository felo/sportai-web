import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import {
  estimateTextTokens,
  estimateVideoTokens,
  calculatePricing,
  formatCost,
} from "./token-utils";

if (!process.env.GEMINI_API_KEY) {
  logger.error("GEMINI_API_KEY environment variable is not set");
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-3-pro-preview";

export async function queryGemini(
  prompt: string,
  videoData?: { data: Buffer; mimeType: string } | null
): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Starting Gemini query`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] Prompt length: ${prompt.length} characters`);
  
  // Estimate input tokens
  let estimatedInputTokens = estimateTextTokens(prompt);
  if (videoData) {
    const videoSizeMB = (videoData.data.length / (1024 * 1024)).toFixed(2);
    const videoTokens = estimateVideoTokens(videoData.data.length, videoData.mimeType);
    estimatedInputTokens += videoTokens;
    logger.info(`[${requestId}] Video attached: ${videoData.mimeType}, ${videoSizeMB} MB`);
    logger.debug(`[${requestId}] Estimated video tokens: ${videoTokens.toLocaleString()}`);
  } else {
    logger.debug(`[${requestId}] No video attached`);
  }
  logger.debug(`[${requestId}] Estimated input tokens: ${estimatedInputTokens.toLocaleString()}`);
  
  logger.time(`[${requestId}] API call duration`);
  
  try {
    // Using Gemini 3 Pro - uses dynamic thinking (high) by default
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Build content parts
    const parts: any[] = [{ text: prompt }];
    
    // Add video if provided
    if (videoData) {
      const base64Length = videoData.data.toString("base64").length;
      logger.debug(`[${requestId}] Video base64 length: ${base64Length} characters`);
      
      parts.push({
        inlineData: {
          data: videoData.data.toString("base64"),
          mimeType: videoData.mimeType,
        },
      });
    }
    
    logger.debug(`[${requestId}] Content parts: ${parts.length}`);
    logger.debug(`[${requestId}] Sending request to Gemini API...`);
    
    // Use type assertion to work with SDK types
    const result = await model.generateContent(parts as any);
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
  prompt: string
): AsyncGenerator<string, void, unknown> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Starting Gemini stream`);
  logger.debug(`[${requestId}] Model: ${MODEL_NAME}`);
  logger.debug(`[${requestId}] Prompt length: ${prompt.length} characters`);
  
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const parts = [{ text: prompt }];
    
    logger.debug(`[${requestId}] Streaming request to Gemini API...`);
    
    const result = await model.generateContentStream(parts as any);
    
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

