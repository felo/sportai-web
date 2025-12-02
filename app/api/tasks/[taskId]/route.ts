import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

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
 * DELETE /api/tasks/[taskId]
 * Delete a task from the database (not from S3)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = `task_delete_${Date.now()}`;
  
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authHeader.replace("Bearer ", "");
    
    logger.info(`[${requestId}] Deleting task: ${taskId} for user: ${userId}`);
    
    const supabase = getSupabaseClient();
    
    // First verify the task belongs to the user
    const { data: task, error: fetchError } = await supabase
      .from("sportai_tasks")
      .select("id, user_id")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();
    
    if (fetchError || !task) {
      logger.warn(`[${requestId}] Task not found or unauthorized: ${taskId}`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    
    // Delete the task
    const { error: deleteError } = await supabase
      .from("sportai_tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);
    
    if (deleteError) {
      logger.error(`[${requestId}] Failed to delete task:`, deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    logger.info(`[${requestId}] Successfully deleted task: ${taskId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete task" },
      { status: 500 }
    );
  }
}


