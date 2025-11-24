import { NextRequest, NextResponse } from "next/server";
import { queryLLM, streamLLM, type ConversationHistory } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { downloadFromS3 } from "@/lib/s3";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";

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

    logger.debug(`[${requestId}] Prompt received: ${prompt ? `${prompt.length} characters` : "missing"}`);
    logger.debug(`[${requestId}] Media file: ${videoFile ? `${videoFile.name} (${videoFile.type}, ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : "none"}`);
    logger.debug(`[${requestId}] Media URL: ${videoUrl || "none"}`);
    logger.debug(`[${requestId}] History JSON: ${historyJson ? `${historyJson.length} characters` : "none"}`);
    logger.debug(`[${requestId}] Thinking mode: ${thinkingMode}`);
    logger.debug(`[${requestId}] Media resolution: ${mediaResolution}`);
    logger.debug(`[${requestId}] Domain expertise: ${domainExpertise}`);

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
      const LARGE_VIDEO_LIMIT_MB = 100;
      
      if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
        logger.warn(`[${requestId}] Video size (${sizeMB.toFixed(2)} MB) exceeds recommended limit (${LARGE_VIDEO_LIMIT_MB} MB)`);
        // Return a natural LLM-style response instead of an error
        const naturalResponse = `## 📹 Video Size Issue

I can see you've uploaded a video that's **${sizeMB.toFixed(1)} MB** in size. Unfortunately, that's quite large for me to process effectively - I work best with videos under **${LARGE_VIDEO_LIMIT_MB} MB**.

<details>
<summary>📊 Why This Matters</summary>

This size limitation helps ensure I can analyze your video thoroughly and provide you with detailed, accurate coaching insights. Larger files can cause processing issues and may not complete successfully.

Video analysis requires significant processing power, and keeping files under 100 MB ensures:
- Faster processing times
- More reliable analysis
- Better quality insights
- Consistent performance across different video types

</details>

<details>
<summary>💡 How to Fix This</summary>

Here are a few ways you can help me analyze your video:

**1. Trim the video**
- Focus on the most important moments or rallies you'd like me to review
- Even a 30-60 second clip can provide valuable insights!
- Most video editing apps allow you to easily cut specific sections

**2. Compress the video**
- Use a video compression tool to reduce the file size while maintaining good quality
- Many free tools are available online (e.g., HandBrake, Adobe Express, CloudConvert)
- Target a lower bitrate while keeping the resolution

**3. Adjust media resolution**
- You can change the media resolution setting to **Low** in the chat input below
- This helps me process larger videos more efficiently
- Low resolution is often sufficient for technique analysis

**4. Split into clips**
- Break your video into shorter segments and submit them separately
- I can analyze multiple clips and provide focused feedback on each
- This approach often leads to more detailed, actionable insights

</details>

---

I'm here to help you improve, so please feel free to try again with a smaller file. I'm excited to analyze your performance once you're ready! 🎾`;

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
              const LARGE_VIDEO_LIMIT_MB = 100;
              
              if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
                logger.warn(`[${requestId}] Video size (${sizeMB.toFixed(2)} MB) exceeds limit in streaming mode`);
                // Stream the natural error response instead
                const naturalResponse = `## 📹 Video Size Issue

I can see you've uploaded a video that's **${sizeMB.toFixed(1)} MB** in size. Unfortunately, that's quite large for me to process effectively - I work best with videos under **${LARGE_VIDEO_LIMIT_MB} MB**.

<details>
<summary>📊 Why This Matters</summary>

This size limitation helps ensure I can analyze your video thoroughly and provide you with detailed, accurate coaching insights. Larger files can cause processing issues and may not complete successfully.

Video analysis requires significant processing power, and keeping files under 100 MB ensures:
- Faster processing times
- More reliable analysis
- Better quality insights
- Consistent performance across different video types

</details>

<details>
<summary>💡 How to Fix This</summary>

Here are a few ways you can help me analyze your video:

**1. Trim the video**
- Focus on the most important moments or rallies you'd like me to review
- Even a 30-60 second clip can provide valuable insights!
- Most video editing apps allow you to easily cut specific sections

**2. Compress the video**
- Use a video compression tool to reduce the file size while maintaining good quality
- Many free tools are available online (e.g., HandBrake, Adobe Express, CloudConvert)
- Target a lower bitrate while keeping the resolution

**3. Adjust media resolution**
- You can change the media resolution setting to **Low** in the chat input below
- This helps me process larger videos more efficiently
- Low resolution is often sufficient for technique analysis

**4. Split into clips**
- Break your video into shorter segments and submit them separately
- I can analyze multiple clips and provide focused feedback on each
- This approach often leads to more detailed, actionable insights

</details>

---

I'm here to help you improve, so please feel free to try again with a smaller file. I'm excited to analyze your performance once you're ready! 🎾`;
                
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
            
            for await (const chunk of streamLLM(prompt, conversationHistory, videoData, thinkingMode, mediaResolution, domainExpertise)) {
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
            // Only call error if controller is still open
            try {
              controller.error(error);
            } catch (errorError) {
              // Controller already closed, log but don't throw
              logger.warn(`[${requestId}] Could not send error to closed controller:`, errorError);
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
    const response = await queryLLM(prompt, videoData, conversationHistory, thinkingMode, mediaResolution, domainExpertise);
    
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

