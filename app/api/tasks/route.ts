import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

const SPORTAI_API_URL = "https://api.sportai.com";
const SPORTAI_API_KEY = process.env.SPORTAI_API_KEY;

// Task type to API endpoint mapping
const TASK_ENDPOINTS: Record<string, string> = {
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
 * GET /api/tasks
 * List all tasks for the authenticated user
 * Query params:
 * - taskType: filter by task type (optional)
 */
export async function GET(request: NextRequest) {
  const requestId = `tasks_list_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType");
    
    logger.info(`[${requestId}] Listing tasks for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
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
    
    return NextResponse.json({ tasks: data });
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
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    
    if (!SPORTAI_API_KEY) {
      logger.error(`[${requestId}] SPORTAI_API_KEY not configured`);
      return NextResponse.json(
        { error: "SportAI API not configured" },
        { status: 503 }
      );
    }
    
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
    
    const validSports = ["tennis", "padel", "pickleball"];
    if (!validSports.includes(sport)) {
      return NextResponse.json(
        { error: `Invalid sport: ${sport}. Must be one of: ${validSports.join(", ")}` },
        { status: 400 }
      );
    }
    
    const endpoint = TASK_ENDPOINTS[taskType];
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown task type: ${taskType}` },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Creating ${taskType} task for video: ${videoUrl}`);
    
    const supabase = getSupabaseClient();
    
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

