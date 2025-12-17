import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { extractS3KeyFromUrl } from "@/lib/s3";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";
import { checkRateLimit, getRateLimitIdentifier, rateLimitedResponse } from "@/lib/rate-limit";
import type { Database } from "@/types/supabase";

type SportType = Database["public"]["Tables"]["sportai_tasks"]["Insert"]["sport"];

export const runtime = "nodejs";
export const maxDuration = 30;

interface BatchTaskInput {
  taskType: string;
  sport: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  thumbnailS3Key?: string | null;
  videoLength?: number | null;
}

/**
 * POST /api/tasks/batch
 * Create multiple technique tasks in a single database call
 * 
 * Body:
 * - tasks: Array of task objects
 * 
 * Note: Only supports technique tasks (client-side processing, no SportAI API)
 */
export async function POST(request: NextRequest) {
  const requestId = `tasks_batch_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Apply rate limiting (veryExpensive tier for batch operations)
    const rateLimitResult = await checkRateLimit(getRateLimitIdentifier(request, userId), "veryExpensive");
    if (!rateLimitResult.success) {
      logger.warn(`[${requestId}] Rate limit exceeded for user: ${userId}`);
      return rateLimitedResponse(rateLimitResult);
    }
    
    const body = await request.json();
    const { tasks } = body as { tasks: BatchTaskInput[] };
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "tasks array is required and must not be empty" },
        { status: 400 }
      );
    }
    
    // Limit batch size to prevent abuse
    if (tasks.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 tasks per batch" },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Creating ${tasks.length} tasks in batch for user: ${userId}`);
    
    // Validate all tasks are technique type (only client-side tasks supported in batch)
    const invalidTasks = tasks.filter(t => t.taskType !== "technique");
    if (invalidTasks.length > 0) {
      return NextResponse.json(
        { error: "Batch insert only supports technique tasks" },
        { status: 400 }
      );
    }
    
    const validSports = ["tennis", "padel", "pickleball", "all"];
    const invalidSports = tasks.filter(t => !validSports.includes(t.sport));
    if (invalidSports.length > 0) {
      return NextResponse.json(
        { error: `Invalid sport. Must be one of: ${validSports.join(", ")}` },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    
    // Prepare records for batch insert
    const records = tasks.map(task => ({
      user_id: userId,
      task_type: task.taskType,
      sport: task.sport as SportType,
      sportai_task_id: null,
      video_url: task.videoUrl,
      video_s3_key: extractS3KeyFromUrl(task.videoUrl) || null,
      thumbnail_url: task.thumbnailUrl || null,
      thumbnail_s3_key: task.thumbnailS3Key || null,
      video_length: task.videoLength || null,
      status: "completed" as const, // Technique tasks are immediately completed
      estimated_compute_time: 0,
      request_params: null,
      completed_at: now,
    }));
    
    // Single database call for all records
    const { data: createdTasks, error: dbError } = await supabase
      .from("sportai_tasks")
      .insert(records)
      .select();
    
    if (dbError) {
      logger.error(`[${requestId}] Database error:`, dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Successfully created ${createdTasks?.length || 0} tasks`);
    
    return NextResponse.json({ 
      tasks: createdTasks,
      count: createdTasks?.length || 0 
    }, { status: 201 });
    
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tasks" },
      { status: 500 }
    );
  }
}
