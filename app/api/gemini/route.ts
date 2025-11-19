import { NextRequest, NextResponse } from "next/server";
import { queryGemini, streamGemini, type ConversationHistory } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { downloadFromS3 } from "@/lib/s3";

// Ensure this route uses Node.js runtime (required for file uploads and Buffer)
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for video processing

export async function POST(request: NextRequest) {
  const requestId = `api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Received POST request to /api/gemini`);
  
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

    logger.debug(`[${requestId}] Prompt received: ${prompt ? `${prompt.length} characters` : "missing"}`);
    logger.debug(`[${requestId}] Media file: ${videoFile ? `${videoFile.name} (${videoFile.type}, ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : "none"}`);
    logger.debug(`[${requestId}] Media URL: ${videoUrl || "none"}`);
    logger.debug(`[${requestId}] History JSON: ${historyJson ? `${historyJson.length} characters` : "none"}`);

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
      console.log(`[Gemini API] 📥 Downloading from S3 (server-side): ${videoUrl}`);
      logger.time(`[${requestId}] S3 download`);
      
      try {
        videoData = await downloadFromS3(videoUrl);
        logger.timeEnd(`[${requestId}] S3 download`);
        logger.debug(`[${requestId}] Media buffer size: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`[Gemini API] ✅ Successfully downloaded from S3: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
      } catch (error) {
        logger.error(`[${requestId}] Failed to download from S3:`, error);
        console.error(`[Gemini API] ❌ Failed to download from S3:`, error);
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

    // Check if streaming is requested (only for text-only queries)
    const shouldStream = !videoData && request.headers.get("x-stream") === "true";
    
    if (shouldStream) {
      logger.info(`[${requestId}] Streaming response...`);
      
      // Create a ReadableStream for streaming
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamGemini(prompt, conversationHistory)) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
            
            const duration = Date.now() - startTime;
            logger.info(`[${requestId}] Stream completed successfully in ${duration}ms`);
          } catch (error) {
            logger.error(`[${requestId}] Stream error:`, error);
            controller.error(error);
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }
    
    logger.info(`[${requestId}] Calling queryGemini...`);
    const response = await queryGemini(prompt, videoData, conversationHistory);
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Request completed successfully in ${duration}ms`);
    logger.debug(`[${requestId}] Response length: ${response.length} characters`);
    
    return NextResponse.json({ response });
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

