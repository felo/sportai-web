import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getSportAIApiUrl, getSportAIApiKey, getEnvironmentLabel } from "@/lib/sportai-api";
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
    if (task.status === "completed" || task.status === "failed") {
      return NextResponse.json({ task });
    }
    
    // Get the appropriate status endpoint for this task type
    const baseEndpoint = STATUS_ENDPOINTS[task.task_type];
    if (!baseEndpoint) {
      logger.error(`[${requestId}] Unknown task type: ${task.task_type}`);
      return NextResponse.json({ task });
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
      return NextResponse.json({ task }); // Return original task on update failure
    }
    
    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
