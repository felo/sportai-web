import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getSportAIApiUrl, getSportAIApiKey, getEnvironmentLabel } from "@/lib/sportai-api";
import { generatePresignedDownloadUrl } from "@/lib/s3";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

// Task type to status endpoint mapping
const STATUS_ENDPOINTS: Record<string, string> = {
  statistics: "/api/statistics",
  activity_detection: "/api/activity_detection",
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Missing Supabase environment variables: ${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`
    );
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Check if a presigned URL has expired or is about to expire
 */
function isUrlExpiredOrExpiring(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get("X-Amz-Expires");
    const dateParam = urlObj.searchParams.get("X-Amz-Date");
    
    if (!expiresParam || !dateParam) {
      return true;
    }
    
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
    const refreshBuffer = 60 * 60 * 1000;
    return Date.now() > expiresAt.getTime() - refreshBuffer;
  } catch {
    return true;
  }
}

/**
 * Refresh video and thumbnail URLs if expired and update database
 */
async function refreshTaskUrls(
  task: Database["public"]["Tables"]["sportai_tasks"]["Row"],
  supabase: ReturnType<typeof getSupabaseClient>,
  requestId: string
): Promise<Database["public"]["Tables"]["sportai_tasks"]["Row"]> {
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
}

/**
 * GET /api/tasks/[taskId]/status
 * Poll the status of a task from SportAI API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = `task_status_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    
    const SPORTAI_API_URL = getSportAIApiUrl();
    const SPORTAI_API_KEY = getSportAIApiKey();
    
    if (!SPORTAI_API_KEY) {
      logger.error(`[${requestId}] SPORTAI_API_KEY not configured for ${getEnvironmentLabel()}`);
      return NextResponse.json(
        { error: "SportAI API not configured" },
        { status: 503 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Get the task from database
    const { data: task, error: fetchError } = await supabase
      .from("sportai_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();
    
    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    
    // If task is already completed or failed, return current status
    // Also refresh video URL if needed
    if (task.status === "completed" || task.status === "failed") {
      const refreshedTask = await refreshTaskUrls(task, supabase, requestId);
      return NextResponse.json({ task: refreshedTask });
    }
    
    // Get the appropriate status endpoint for this task type
    const baseEndpoint = STATUS_ENDPOINTS[task.task_type];
    if (!baseEndpoint) {
      // Technique tasks and other client-side tasks don't have SportAI endpoints
      // Just refresh video URL if needed and return
      logger.debug(`[${requestId}] No status endpoint for task type: ${task.task_type}`);
      const refreshedTask = await refreshTaskUrls(task, supabase, requestId);
      return NextResponse.json({ task: refreshedTask });
    }
    
    // Poll SportAI API for status
    // Padel is the default sport, so no suffix needed. Other sports need /{sport} before task_id
    const sportSuffix = task.sport === "padel" ? "" : `/${task.sport}`;
    const statusResponse = await fetch(
      `${SPORTAI_API_URL}${baseEndpoint}${sportSuffix}/${task.sportai_task_id}/status`,
      {
        headers: {
          "Authorization": `Bearer ${SPORTAI_API_KEY}`,
        },
      }
    );
    
    if (!statusResponse.ok) {
      logger.error(`[${requestId}] SportAI status check failed: ${statusResponse.status}`);
      return NextResponse.json({ task }); // Return current task state
    }
    
    const statusResult = await statusResponse.json();
    
    logger.info(`[${requestId}] SportAI status response:`, JSON.stringify(statusResult, null, 2));
    
    // Update task based on SportAI response
    let updates: Partial<Database["public"]["Tables"]["sportai_tasks"]["Update"]> = {
      updated_at: new Date().toISOString(),
    };
    
    // SportAI API returns status at data.task_status
    const resultStatus = statusResult.data?.task_status;
    const taskProgress = statusResult.data?.task_progress;
    
    logger.info(`[${requestId}] Parsed status: ${resultStatus}, progress: ${taskProgress}`);
    
    if (resultStatus === "completed") {
      // Only update status - don't store results here
      // The result will be fetched and stored properly via /api/tasks/[taskId]/result
      // when the user clicks to view/download
      updates = {
        ...updates,
        status: "completed",
        completed_at: new Date().toISOString(),
      };
      logger.info(`[${requestId}] Task completed - result will be fetched on demand via /result endpoint`);
    } else if (resultStatus === "failed" || resultStatus === "error") {
      updates = {
        ...updates,
        status: "failed",
        error_message: statusResult.data?.error || statusResult.error || "Task failed",
      };
    } else if (resultStatus === "processing" || resultStatus === "pending") {
      // Map pending to processing in our system
      updates.status = resultStatus === "pending" ? "pending" : "processing";
    }
    
    const { data: updatedTask, error: updateError } = await supabase
      .from("sportai_tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();
    
    if (updateError) {
      logger.error(`[${requestId}] Failed to update task:`, updateError);
      const refreshedTask = await refreshTaskUrls(task, supabase, requestId);
      return NextResponse.json({ task: refreshedTask }); // Return original task on update failure
    }
    
    // Refresh video URL if needed before returning
    const refreshedTask = await refreshTaskUrls(updatedTask, supabase, requestId);
    return NextResponse.json({ task: refreshedTask });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
