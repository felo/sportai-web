import { NextRequest, NextResponse } from "next/server";
import { queryLLM, streamLLM, type ConversationHistory } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { downloadFromS3 } from "@/lib/s3";
import { getVideoSizeErrorMessage, LARGE_VIDEO_LIMIT_MB } from "@/lib/video-size-messages";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import type { PromptType } from "@/lib/prompts";

// Ensure this route uses Node.js runtime (required for file uploads and Buffer)
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for video processing

export async function POST(request: NextRequest) {
  const requestId = `api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received POST request to /api/llm`);
  
  // Check content length to catch 413 errors early
  // Note: Vercel has a hard limit of 4.5MB for serverless functions
  // Requests larger than this may return 404 before reaching the handler
  const VERCEL_MAX_SIZE_MB = 4.5;
  const MAX_PAYLOAD_SIZE_MB = 20; // For other deployments
  const contentLength = request.headers.get("content-length");
  
  if (contentLength) {
    const sizeMB = parseInt(contentLength) / (1024 * 1024);
    logger.debug(`[${requestId}] Request size: ${sizeMB.toFixed(2)} MB`);
    
    // Vercel-specific check - return clear error before Vercel rejects it
    if (sizeMB > VERCEL_MAX_SIZE_MB) {
      logger.error(`[${requestId}] Request too large for Vercel: ${sizeMB.toFixed(2)} MB (Vercel limit: ${VERCEL_MAX_SIZE_MB} MB)`);
      return NextResponse.json(
        { 
          error: `Request payload too large (${sizeMB.toFixed(2)} MB). Vercel has a ${VERCEL_MAX_SIZE_MB}MB limit for serverless functions. Please use a smaller video file or compress it.` 
        },
        { status: 413 }
      );
    }
    
    if (sizeMB > MAX_PAYLOAD_SIZE_MB) {
      logger.error(`[${requestId}] Request too large: ${sizeMB.toFixed(2)} MB (limit: ${MAX_PAYLOAD_SIZE_MB} MB)`);
      return NextResponse.json(
        { error: `Request payload too large (${sizeMB.toFixed(2)} MB). Maximum size is ${MAX_PAYLOAD_SIZE_MB} MB.` },
        { status: 413 }
      );
    }
  }
  
  try {
    logger.debug(`[${requestId}] Parsing form data...`);
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const videoFile = formData.get("video") as File | null;
    const videoUrl = formData.get("videoUrl") as string | null;
    const historyJson = formData.get("history") as string | null;
    const thinkingMode = (formData.get("thinkingMode") as ThinkingMode) || "fast";
    const mediaResolution = (formData.get("mediaResolution") as MediaResolution) || "medium";
    const domainExpertise = (formData.get("domainExpertise") as DomainExpertise) || "all-sports";
    const promptType = (formData.get("promptType") as PromptType) || "video";
    // Query complexity hint from client (for optimized thinking budget)
    const queryComplexity = (formData.get("queryComplexity") as "simple" | "complex") || "complex";
    // Existing cache name for reuse (e.g., on retry)
    const existingCacheName = formData.get("cacheName") as string | null;

    logger.debug(`[${requestId}] Prompt received: ${prompt ? `${prompt.length} characters` : "missing"}`);
    logger.debug(`[${requestId}] Media file: ${videoFile ? `${videoFile.name} (${videoFile.type}, ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : "none"}`);
    logger.debug(`[${requestId}] Media URL: ${videoUrl || "none"}`);
    logger.debug(`[${requestId}] History JSON: ${historyJson ? `${historyJson.length} characters` : "none"}`);
    logger.debug(`[${requestId}] Thinking mode: ${thinkingMode}`);
    logger.debug(`[${requestId}] Media resolution: ${mediaResolution}`);
    logger.debug(`[${requestId}] Domain expertise: ${domainExpertise}`);
    logger.debug(`[${requestId}] Query complexity: ${queryComplexity}`);

    if (!prompt || typeof prompt !== "string") {
      logger.error(`[${requestId}] Validation failed: Prompt is required`);
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Parse conversation history if provided
    let conversationHistory: ConversationHistory[] | undefined;
    if (historyJson) {
      try {
        conversationHistory = JSON.parse(historyJson) as ConversationHistory[];
        logger.debug(`[${requestId}] Conversation history: ${conversationHistory.length} messages`);
      } catch (error) {
        logger.error(`[${requestId}] Failed to parse conversation history, continuing without it:`, error);
        conversationHistory = undefined;
      }
    }

    let videoData: { data: Buffer; mimeType: string } | null = null;
    
    // Priority: videoUrl (S3) > videoFile (direct upload)
    if (videoUrl) {
      // Download from S3 using AWS SDK (efficient server-side download)
      logger.info(`[${requestId}] Downloading media from S3: ${videoUrl}`);
      console.log(`[LLM API] 📥 Downloading from S3 (server-side): ${videoUrl}`);
      logger.time(`[${requestId}] S3 download`);
      
      try {
        videoData = await downloadFromS3(videoUrl);
        logger.timeEnd(`[${requestId}] S3 download`);
        logger.debug(`[${requestId}] Media buffer size: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`[LLM API] ✅ Successfully downloaded from S3: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`[LLM API] 📹 Video URL: ${videoUrl}`);
        console.log(`[LLM API] 📹 Video MIME type: ${videoData.mimeType}`);
      } catch (error) {
        logger.error(`[${requestId}] Failed to download from S3:`, error);
        console.error(`[LLM API] ❌ Failed to download from S3:`, error);
        return NextResponse.json(
          { error: `Failed to download media from S3: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    } else if (videoFile) {
      const fileType = videoFile.type.startsWith("video/") ? "video" : "image";
      logger.info(`[${requestId}] Processing ${fileType} file: ${videoFile.name}`);
      logger.time(`[${requestId}] ${fileType} processing`);
      
      // Convert file to buffer
      const arrayBuffer = await videoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      videoData = {
        data: buffer,
        mimeType: videoFile.type,
      };
      
      logger.timeEnd(`[${requestId}] ${fileType} processing`);
      logger.debug(`[${requestId}] ${fileType} buffer size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    }
    
    // Warn about large video files that may cause API issues
    if (videoData && videoData.mimeType.startsWith("video/")) {
      const sizeMB = videoData.data.length / (1024 * 1024);
      // Gemini API tends to have issues with videos > 50MB, especially longer duration ones
      const LARGE_VIDEO_WARNING_MB = 50;
      
      if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
        logger.warn(`[${requestId}] Video size (${sizeMB.toFixed(2)} MB) exceeds recommended limit (${LARGE_VIDEO_LIMIT_MB} MB)`);
        // Return a natural LLM-style response instead of an error
        const naturalResponse = getVideoSizeErrorMessage(sizeMB);

        logger.debug(`[${requestId}] Returning natural LLM response for oversized video`);
        
        // Mark this as a special "too_large" response type so client can handle it appropriately
        return NextResponse.json(
          { response: naturalResponse, videoTooLarge: true },
          { status: 200 } // Return 200 so it's treated as a successful response
        );
      } else if (sizeMB > LARGE_VIDEO_WARNING_MB) {
        logger.warn(`[${requestId}] Large video detected (${sizeMB.toFixed(2)} MB) - may cause API timeout or errors`);
        console.warn(`[LLM API] ⚠️ Large video (${sizeMB.toFixed(2)} MB) - processing may be slow or fail. Consider using a shorter clip or lower resolution.`);
      }
    }

    // Check if streaming is requested (for both text-only and video queries)
    const shouldStream = request.headers.get("x-stream") === "true";
    
    if (shouldStream) {
      logger.info(`[${requestId}] Streaming response...`);
      
      // Create a ReadableStream for streaming
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Check if video is too large before streaming
            if (videoData && videoData.mimeType.startsWith("video/")) {
              const sizeMB = videoData.data.length / (1024 * 1024);
              
              if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
                logger.warn(`[${requestId}] Video size (${sizeMB.toFixed(2)} MB) exceeds limit in streaming mode`);
                // Stream the natural error response instead
                const naturalResponse = getVideoSizeErrorMessage(sizeMB);
                
                // Stream the response character by character for a natural typing effect
                const encoder = new TextEncoder();
                for (let i = 0; i < naturalResponse.length; i++) {
                  try {
                    controller.enqueue(encoder.encode(naturalResponse[i]));
                    // Small delay to simulate typing (optional)
                    await new Promise(resolve => setTimeout(resolve, 1));
                  } catch (enqueueError) {
                    const errorMessage = enqueueError instanceof Error ? enqueueError.message : String(enqueueError);
                    if (enqueueError instanceof TypeError && 
                        (errorMessage.includes("closed") || errorMessage.includes("Invalid state"))) {
                      logger.warn(`[${requestId}] Stream controller closed during natural response`);
                      break;
                    }
                    throw enqueueError;
                  }
                }
                
                try {
                  controller.close();
                } catch (closeError) {
                  logger.debug(`[${requestId}] Controller already closed`);
                }
                
                const duration = Date.now() - startTime;
                logger.info(`[${requestId}] Natural error response streamed in ${duration}ms`);
                return;
              }
            }
            
            // Get streaming result (includes cache info and text generator)
            const streamResult = await streamLLM(
              prompt, 
              conversationHistory, 
              videoData, 
              thinkingMode, 
              mediaResolution, 
              domainExpertise, 
              promptType, 
              queryComplexity,
              existingCacheName || undefined
            );
            
            // Log cache status
            if (streamResult.cacheUsed) {
              logger.info(`[${requestId}] Using cached content${streamResult.cacheName ? ` (new cache: ${streamResult.cacheName})` : ''}`);
            }
            
            // Stream the text chunks
            for await (const chunk of streamResult.textGenerator) {
              // Check if controller is still open before enqueueing
              // This can happen if the client aborts the request
              try {
                controller.enqueue(new TextEncoder().encode(chunk));
              } catch (enqueueError) {
                // Controller might be closed (e.g., client aborted)
                // Check for both "closed" and "Invalid state" errors
                const errorMessage = enqueueError instanceof Error ? enqueueError.message : String(enqueueError);
                if (enqueueError instanceof TypeError && 
                    (errorMessage.includes("closed") || errorMessage.includes("Invalid state"))) {
                  logger.warn(`[${requestId}] Stream controller closed or invalid state, stopping stream:`, errorMessage);
                  break;
                }
                throw enqueueError;
              }
            }
            
            // Send model/cache info as a final metadata chunk (JSON-encoded, prefixed with special marker)
            const streamMetadata = JSON.stringify({
              __metadata__: true,
              cacheName: streamResult.cacheName,
              cacheUsed: streamResult.cacheUsed,
              modelUsed: streamResult.modelUsed,
              modelReason: streamResult.modelReason,
            });
            try {
              controller.enqueue(new TextEncoder().encode(`\n__STREAM_META__${streamMetadata}`));
            } catch (e) {
              // Ignore if controller is closed
            }
            
            // Only close if controller is still open
            try {
              controller.close();
            } catch (closeError) {
              // Controller already closed, that's okay
              logger.debug(`[${requestId}] Controller already closed`);
            }
            
            const duration = Date.now() - startTime;
            logger.info(`[${requestId}] Stream completed successfully in ${duration}ms`);
          } catch (error) {
            logger.error(`[${requestId}] Stream error:`, error);
            
            // Send error message as stream content so client can display it
            // This prevents ERR_EMPTY_RESPONSE errors on the client
            const errorMessage = error instanceof Error ? error.message : "Failed to process request";
            const errorResponse = `\n\n⚠️ **Error:** ${errorMessage}`;
            
            try {
              controller.enqueue(new TextEncoder().encode(errorResponse));
            } catch (enqueueError) {
              logger.warn(`[${requestId}] Could not enqueue error message:`, enqueueError);
            }
            
            // Close the stream properly (not with error)
            try {
              controller.close();
            } catch (closeError) {
              // Controller already closed, log but don't throw
              logger.warn(`[${requestId}] Could not close controller:`, closeError);
            }
          }
        },
        cancel() {
          logger.info(`[${requestId}] Stream cancelled by client`);
        },
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }
    
    logger.info(`[${requestId}] Calling queryLLM...`);
    const llmResponse = await queryLLM(
      prompt, 
      videoData, 
      conversationHistory, 
      thinkingMode, 
      mediaResolution, 
      domainExpertise, 
      promptType, 
      queryComplexity,
      existingCacheName || undefined
    );
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Request completed successfully in ${duration}ms`);
    logger.debug(`[${requestId}] Response length: ${llmResponse.text.length} characters`);
    
    if (llmResponse.cacheUsed) {
      logger.info(`[${requestId}] Cache used${llmResponse.cacheName ? ` (new cache: ${llmResponse.cacheName})` : ''}`);
    }
    
    return NextResponse.json({ 
      response: llmResponse.text,
      cacheName: llmResponse.cacheName,
      cacheUsed: llmResponse.cacheUsed,
      modelUsed: llmResponse.modelUsed,
      modelReason: llmResponse.modelReason,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    
    // Return 429 for rate limiting, 500 for other errors
    const status = errorMessage.includes("Rate limit") ? 429 : 500;
    
    logger.debug(`[${requestId}] Returning error response: ${status} - ${errorMessage}`);
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

