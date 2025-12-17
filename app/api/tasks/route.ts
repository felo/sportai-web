import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSportAIApiUrl, getSportAIApiKey, getEnvironmentLabel } from "@/lib/sportai-api";
import { extractS3KeyFromUrl, generatePresignedDownloadUrl } from "@/lib/s3";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Task type to API endpoint mapping
// Note: "technique" tasks don't use SportAI API - they're processed client-side
const TASK_ENDPOINTS: Record<string, string> = {
  statistics: "/api/statistics",
  activity_detection: "/api/activity_detection",
};

// Task types that don't require SportAI API (processed client-side)
const CLIENT_SIDE_TASKS = ["technique"];

/**
 * Check if a presigned URL has expired or is about to expire
 * Returns true if URL should be refreshed
 */
function isUrlExpiredOrExpiring(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get("X-Amz-Expires");
    const dateParam = urlObj.searchParams.get("X-Amz-Date");
    
    if (!expiresParam || !dateParam) {
      // Not a presigned URL, or missing params - assume it might be expired
      return true;
    }
    
    // Parse the X-Amz-Date (format: 20231215T120000Z)
    const year = parseInt(dateParam.substring(0, 4));
    const month = parseInt(dateParam.substring(4, 6)) - 1;
    const day = parseInt(dateParam.substring(6, 8));
    const hour = parseInt(dateParam.substring(9, 11));
    const minute = parseInt(dateParam.substring(11, 13));
    const second = parseInt(dateParam.substring(13, 15));
    
    const signedAt = new Date(Date.UTC(year, month, day, hour, minute, second));
    const expiresInSeconds = parseInt(expiresParam);
    const expiresAt = new Date(signedAt.getTime() + expiresInSeconds * 1000);
    
    // Refresh if expires within 1 hour
    const refreshBuffer = 60 * 60 * 1000; // 1 hour in ms
    return Date.now() > expiresAt.getTime() - refreshBuffer;
  } catch {
    // If we can't parse, assume expired to be safe
    return true;
  }
}

/**
 * GET /api/tasks
 * List all tasks for the authenticated user
 * Query params:
 * - taskType: filter by task type (optional)
 */
export async function GET(request: NextRequest) {
  const requestId = `tasks_list_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType");
    
    logger.info(`[${requestId}] Listing tasks for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from("sportai_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (taskType) {
      query = query.eq("task_type", taskType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error(`[${requestId}] Error fetching tasks:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Refresh expired video and thumbnail URLs for tasks that have S3 keys
    const tasksWithRefreshedUrls = await Promise.all(
      (data || []).map(async (task) => {
        let updatedTask = { ...task };
        const dbUpdates: { video_url?: string; thumbnail_url?: string } = {};
        
        // Refresh video URL if needed
        if (task.video_s3_key && isUrlExpiredOrExpiring(task.video_url)) {
          try {
            const freshUrl = await generatePresignedDownloadUrl(task.video_s3_key, 7 * 24 * 3600);
            logger.debug(`[${requestId}] Refreshed video URL for task ${task.id}`);
            updatedTask.video_url = freshUrl;
            dbUpdates.video_url = freshUrl;
          } catch (refreshError) {
            logger.warn(`[${requestId}] Failed to refresh video URL for task ${task.id}:`, refreshError);
          }
        }
        
        // Refresh thumbnail URL if needed
        if (task.thumbnail_s3_key && task.thumbnail_url && isUrlExpiredOrExpiring(task.thumbnail_url)) {
          try {
            const freshUrl = await generatePresignedDownloadUrl(task.thumbnail_s3_key, 7 * 24 * 3600);
            logger.debug(`[${requestId}] Refreshed thumbnail URL for task ${task.id}`);
            updatedTask.thumbnail_url = freshUrl;
            dbUpdates.thumbnail_url = freshUrl;
          } catch (refreshError) {
            logger.warn(`[${requestId}] Failed to refresh thumbnail URL for task ${task.id}:`, refreshError);
          }
        }
        
        // Update database if any URLs were refreshed
        if (Object.keys(dbUpdates).length > 0) {
          await supabase
            .from("sportai_tasks")
            .update(dbUpdates)
            .eq("id", task.id);
        }
        
        return updatedTask;
      })
    );
    
    return NextResponse.json({ tasks: tasksWithRefreshedUrls });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new SportAI task
 * 
 * Body:
 * - taskType: string (required) - e.g., "statistics", "activity_detection"
 * - videoUrl: string (required)
 * - params: object (optional) - task-specific parameters
 */
export async function POST(request: NextRequest) {
  const requestId = `tasks_create_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    const body = await request.json();
    const { taskType, sport = "padel", videoUrl, thumbnailUrl, thumbnailS3Key, videoLength, params = {} } = body;
    
    if (!taskType) {
      return NextResponse.json(
        { error: "taskType is required" },
        { status: 400 }
      );
    }
    
    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }
    
    const validSports = ["tennis", "padel", "pickleball", "all"];
    if (!validSports.includes(sport)) {
      return NextResponse.json(
        { error: `Invalid sport: ${sport}. Must be one of: ${validSports.join(", ")}` },
        { status: 400 }
      );
    }
    
    // "all" sport is only valid for technique tasks (client-side processing)
    if (sport === "all" && !CLIENT_SIDE_TASKS.includes(taskType)) {
      return NextResponse.json(
        { error: `Sport "all" is only valid for technique tasks, not ${taskType}` },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Creating ${taskType} task for video: ${videoUrl}`);
    
    const supabase = getSupabaseAdmin();
    
    // Extract S3 key from video URL if it's an S3 URL
    const videoS3Key = extractS3KeyFromUrl(videoUrl);
    if (videoS3Key) {
      logger.debug(`[${requestId}] Extracted S3 key from video URL: ${videoS3Key}`);
    }
    
    // Handle client-side tasks (like technique) - no SportAI API call needed
    if (CLIENT_SIDE_TASKS.includes(taskType)) {
      logger.info(`[${requestId}] Creating client-side ${taskType} task (no SportAI API call)`);
      
      const { data: task, error: dbError } = await supabase
        .from("sportai_tasks")
        .insert({
          user_id: userId,
          task_type: taskType,
          sport,
          sportai_task_id: null, // No SportAI task ID for client-side tasks
          video_url: videoUrl,
          video_s3_key: videoS3Key || null,
          thumbnail_url: thumbnailUrl || null,
          thumbnail_s3_key: thumbnailS3Key || null,
          video_length: videoLength || null,
          status: "completed", // Client-side tasks are immediately "completed"
          estimated_compute_time: 0,
          request_params: params,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (dbError) {
        logger.error(`[${requestId}] Database error:`, dbError);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
      
      return NextResponse.json({ task }, { status: 201 });
    }
    
    // Server-side tasks require SportAI API
    const endpoint = TASK_ENDPOINTS[taskType];
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown task type: ${taskType}` },
        { status: 400 }
      );
    }
    
    const SPORTAI_API_URL = getSportAIApiUrl();
    const SPORTAI_API_KEY = getSportAIApiKey();
    
    if (!SPORTAI_API_KEY) {
      logger.error(`[${requestId}] SPORTAI_API_KEY not configured for ${getEnvironmentLabel()}`);
      return NextResponse.json(
        { error: "SportAI API not configured" },
        { status: 503 }
      );
    }
    
    logger.info(`[${requestId}] Using SportAI API: ${SPORTAI_API_URL} (${getEnvironmentLabel()})`);
    
    // Build request body for SportAI API
    const sportaiBody: Record<string, unknown> = {
      video_url: videoUrl,
      version: params.version || "latest",
      onlyInRally: true,
      ...params,
    };
    
    // Call SportAI API to register the task
    // API endpoint format: 
    // - Padel (default): /api/statistics
    // - Tennis: /api/statistics/tennis
    // Padel is the default sport, so no suffix needed
    const sportSuffix = sport === "padel" ? "" : `/${sport}`;
    const sportaiResponse = await fetch(`${SPORTAI_API_URL}${endpoint}${sportSuffix}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SPORTAI_API_KEY}`,
      },
      body: JSON.stringify(sportaiBody),
    });
    
    if (!sportaiResponse.ok) {
      const errorData = await sportaiResponse.json().catch(() => ({}));
      logger.error(`[${requestId}] SportAI API error:`, errorData);
      return NextResponse.json(
        { error: errorData.message || errorData.error || `SportAI API returned ${sportaiResponse.status}` },
        { status: sportaiResponse.status }
      );
    }
    
    const sportaiResult = await sportaiResponse.json();
    const { task_id: sportaiTaskId, estimated_compute_time } = sportaiResult.data;
    
    logger.info(`[${requestId}] SportAI task created: ${sportaiTaskId}`);
    
    // Save task to database
    const { data: task, error: dbError } = await supabase
      .from("sportai_tasks")
      .insert({
        user_id: userId,
        task_type: taskType,
        sport,
        sportai_task_id: sportaiTaskId,
        video_url: videoUrl,
        video_s3_key: videoS3Key || null,
        thumbnail_url: thumbnailUrl || null,
        thumbnail_s3_key: thumbnailS3Key || null,
        video_length: videoLength || null,
        status: "processing",
        estimated_compute_time,
        request_params: params,
      })
      .select()
      .single();
    
    if (dbError) {
      logger.error(`[${requestId}] Database error:`, dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 }
    );
  }
}

