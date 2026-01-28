import { NextRequest, NextResponse } from "next/server";
import { queryLLM, streamLLM, type ConversationHistory } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { downloadFromS3 } from "@/lib/s3";
import { getVideoSizeErrorMessage, LARGE_VIDEO_LIMIT_MB } from "@/lib/video-size-messages";
import { checkRateLimit, getRateLimitIdentifier, rateLimitedResponse, type RateLimitTier } from "@/lib/rate-limit";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase-server";
import type { ThinkingMode, MediaResolution, DomainExpertise, InsightLevel } from "@/utils/storage";
import type { PromptType, UserContext } from "@/lib/prompts";
import type { FullProfile } from "@/types/profile";

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
    // AI Insight Level - controls complexity and depth of responses
    const insightLevel = (formData.get("insightLevel") as InsightLevel) || "beginner";
    
    // =========================================================================
    // RATE LIMITING - Applied after parsing to determine request type
    // =========================================================================
    // Try to get authenticated user (optional - allows both auth and non-auth usage)
    const user = await getAuthenticatedUser(request);
    
    // Determine if this is a "heavy" or "light" request:
    // - Heavy: Has video OR deep thinking mode (expensive operations)
    // - Light: Text-only AND fast thinking mode (quick flash requests)
    const hasVideo = !!(videoFile || videoUrl);
    const isDeepThinking = thinkingMode === "deep";
    const isHeavyRequest = hasVideo || isDeepThinking;
    
    // Apply rate limiting based on authentication and request type:
    // - Authenticated + heavy: "heavy" tier (10 req/min)
    // - Authenticated + light: "light" tier (30 req/min)
    // - Unauthenticated: "trial" tier (12 req/min per IP)
    const identifier = getRateLimitIdentifier(request, user?.id);
    let rateLimitTier: RateLimitTier;
    
    if (!user) {
      rateLimitTier = "trial";
    } else {
      rateLimitTier = isHeavyRequest ? "heavy" : "light";
    }
    
    const rateLimitResult = await checkRateLimit(identifier, rateLimitTier);
    
    if (!rateLimitResult.success) {
      logger.warn(`[${requestId}] Rate limit exceeded for: ${identifier} (tier: ${rateLimitTier}, heavy: ${isHeavyRequest})`);
      
      // Give helpful message for unauthenticated users
      if (!user) {
        const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: `You've reached the limit for guest users (12 requests/minute). Sign in for higher limits. Retry in ${retryAfter} seconds.`,
            retryAfter,
            signInRequired: false,
          },
          { status: 429 }
        );
      }
      
      return rateLimitedResponse(rateLimitResult);
    }
    
    logger.debug(`[${requestId}] Rate limit check passed (tier: ${rateLimitTier}, heavy: ${isHeavyRequest}, remaining: ${rateLimitResult.remaining})`);
    // User context for personalization
    const userFirstName = formData.get("userFirstName") as string | null;

    logger.debug(`[${requestId}] Prompt received: ${prompt ? `${prompt.length} characters` : "missing"}`);
    logger.debug(`[${requestId}] Media file: ${videoFile ? `${videoFile.name} (${videoFile.type}, ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)` : "none"}`);
    logger.debug(`[${requestId}] Media URL: ${videoUrl || "none"}`);
    logger.debug(`[${requestId}] History JSON: ${historyJson ? `${historyJson.length} characters` : "none"}`);
    logger.debug(`[${requestId}] Thinking mode: ${thinkingMode}`);
    logger.debug(`[${requestId}] Media resolution: ${mediaResolution}`);
    logger.debug(`[${requestId}] Domain expertise: ${domainExpertise}`);
    logger.debug(`[${requestId}] Query complexity: ${queryComplexity}`);
    logger.debug(`[${requestId}] Insight level: ${insightLevel}`);
    logger.debug(`[${requestId}] User: ${userFirstName || "anonymous"}`);
    
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
    
    // Check if this is the first message (no conversation history)
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    
    // Build user context for personalization
    // For first message, fetch full profile if user is authenticated
    let userContext: UserContext | undefined = userFirstName ? { firstName: userFirstName } : undefined;
    
    // Fetch profile data for first message if user is authenticated
    if (isFirstMessage && user) {
      try {
        logger.debug(`[${requestId}] Fetching profile for first message`);
        const supabase = getSupabaseAdmin();
        
        // Fetch all profile data in parallel
        const [
          profileResult,
          sportsResult,
          equipmentResult,
          coachResult,
          coachSportsResult,
          businessResult,
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("player_sports").select("*").eq("profile_id", user.id),
          supabase.from("player_equipment").select("*").eq("profile_id", user.id),
          supabase.from("coach_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
          // Note: coach_sports uses coach_profile_id which references coach_profiles.profile_id
          // We need to fetch coach_sports after we know the coach profile exists
          supabase.from("coach_sports").select("*").eq("coach_profile_id", user.id),
          supabase.from("business_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
        ]);
        
        if (!profileResult.error && profileResult.data) {
          const profileData = profileResult.data;
          const sports = (sportsResult.data || []) as any[];
          const equipment = (equipmentResult.data || []) as any[];
          const coach = coachResult.data as any;
          const coachSports = (coachSportsResult.data || []) as any[];
          const business = businessResult.data as any;
          
          // Transform profile data to UserContext format
          userContext = {
            firstName: userFirstName || profileData.full_name?.split(" ")[0] || undefined,
            profile: {
              handedness: profileData.handedness as "left" | "right" | "ambidextrous" | undefined,
              gender: profileData.gender as "male" | "female" | "non-binary" | "prefer-not-to-say" | undefined,
              dateOfBirth: profileData.date_of_birth || undefined,
              height: profileData.height || undefined,
              weight: profileData.weight || undefined,
              physicalLimitations: profileData.physical_limitations || undefined,
              unitsPreference: (profileData.units_preference as "metric" | "imperial") || undefined,
              sports: sports.map(sport => ({
                sport: sport.sport,
                skillLevel: sport.skill_level,
                yearsPlaying: sport.years_playing,
                playingStyle: sport.playing_style || undefined,
                preferredSurfaces: sport.preferred_surfaces || [],
                goals: sport.goals || [],
                clubName: sport.club_name || undefined,
              })),
              equipment: equipment.map(eq => ({
                sport: eq.sport,
                equipmentType: eq.equipment_type,
                brand: eq.brand || undefined,
                modelName: eq.model_name || undefined,
              })),
              // Add coach profile if available
              ...(coach && !coachResult.error ? {
                coach: {
                  isActive: coach.is_active,
                  yearsExperience: coach.years_experience,
                  coachingLevel: coach.coaching_level,
                  employmentType: coach.employment_type,
                  clientCount: coach.client_count,
                  specialties: coach.specialties || [],
                  affiliation: coach.affiliation || undefined,
                  usesVideoAnalysis: coach.uses_video_analysis,
                  coachSports: coachSports.map(cs => ({
                    sport: cs.sport,
                    certifications: cs.certifications || [],
                  })),
                },
              } : {}),
              // Add business profile if available
              ...(business && !businessResult.error ? {
                business: {
                  companyName: business.company_name,
                  website: business.website || undefined,
                  role: business.role,
                  companySize: business.company_size,
                  country: business.country || undefined,
                  businessType: business.business_type,
                  useCases: business.use_cases || [],
                },
              } : {}),
            },
          };
          
          const profileInfo = [
            `${sports.length} sports`,
            `${equipment.length} equipment items`,
            coach && !coachResult.error ? "coach profile" : null,
            business && !businessResult.error ? "business profile" : null,
          ].filter(Boolean).join(", ");
          
          logger.debug(`[${requestId}] Profile loaded: ${profileInfo}`);
        } else {
          logger.debug(`[${requestId}] No profile found or error: ${profileResult.error?.message || "not found"}`);
        }
      } catch (error) {
        logger.warn(`[${requestId}] Failed to fetch profile for first message:`, error);
        // Continue with basic userContext if profile fetch fails
      }
    }

    if (!prompt || typeof prompt !== "string") {
      logger.error(`[${requestId}] Validation failed: Prompt is required`);
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let videoData: { data: Buffer; mimeType: string } | null = null;
    
    // Priority: videoUrl (S3 or external) > videoFile (direct upload)
    if (videoUrl) {
      // Check if this is an S3 URL or external URL (like Cloudinary)
      const isS3Url = videoUrl.includes('.s3.') && videoUrl.includes('amazonaws.com');
      
      if (isS3Url) {
        // Download from S3 using AWS SDK (efficient server-side download)
        logger.info(`[${requestId}] Downloading media from S3: ${videoUrl}`);
        logger.info(`📥 Downloading from S3 (server-side): ${videoUrl}`);
        logger.time(`[${requestId}] S3 download`);
        
        try {
          videoData = await downloadFromS3(videoUrl);
          logger.timeEnd(`[${requestId}] S3 download`);
          logger.debug(`[${requestId}] Media buffer size: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
          logger.debug(`[${requestId}] Video URL: ${videoUrl}, MIME type: ${videoData.mimeType}`);
        } catch (error) {
          logger.error(`[${requestId}] Failed to download from S3:`, error);
          return NextResponse.json(
            { error: `Failed to download media from S3: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 }
          );
        }
      } else {
        // External URL (Cloudinary, etc.) - download via HTTP fetch
        logger.info(`[${requestId}] Downloading media from external URL: ${videoUrl}`);
        logger.time(`[${requestId}] External download`);
        
        try {
          const response = await fetch(videoUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'video/mp4';
          videoData = {
            data: Buffer.from(arrayBuffer),
            mimeType: contentType,
          };
          logger.timeEnd(`[${requestId}] External download`);
          logger.debug(`[${requestId}] External media buffer size: ${(videoData.data.length / (1024 * 1024)).toFixed(2)} MB`);
        } catch (error) {
          logger.error(`[${requestId}] Failed to download from external URL:`, error);
          return NextResponse.json(
            { error: `Failed to download media: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 }
          );
        }
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
    
    // Log video size for monitoring
    // Note: The actual size limit check and error response is handled in the streaming/non-streaming
    // branches below to ensure proper response format (streaming vs JSON)
    if (videoData && videoData.mimeType.startsWith("video/")) {
      const sizeMB = videoData.data.length / (1024 * 1024);
      
      if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
        logger.warn(`[${requestId}] Video size (${sizeMB.toFixed(2)} MB) exceeds limit (${LARGE_VIDEO_LIMIT_MB} MB)`);
      } else {
        logger.debug(`[${requestId}] Video size: ${sizeMB.toFixed(2)} MB (limit: ${LARGE_VIDEO_LIMIT_MB} MB)`);
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
                // Use for...of to properly handle multi-byte Unicode characters (emojis)
                const encoder = new TextEncoder();
                for (const char of naturalResponse) {
                  try {
                    controller.enqueue(encoder.encode(char));
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
              existingCacheName || undefined,
              insightLevel,
              userContext
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
              hasVideo: hasVideo,
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
    
    // Non-streaming: Check video size limit and return JSON response if too large
    if (videoData && videoData.mimeType.startsWith("video/")) {
      const sizeMB = videoData.data.length / (1024 * 1024);
      
      if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
        logger.debug(`[${requestId}] Returning JSON response for oversized video (non-streaming)`);
        const naturalResponse = getVideoSizeErrorMessage(sizeMB);
        
        return NextResponse.json(
          { response: naturalResponse, videoTooLarge: true },
          { status: 200 }
        );
      }
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
      existingCacheName || undefined,
      insightLevel,
      userContext
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
      hasVideo: hasVideo,
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
