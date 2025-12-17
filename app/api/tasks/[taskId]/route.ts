import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

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
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    
    logger.info(`[${requestId}] Deleting task: ${taskId} for user: ${userId}`);
    
    const supabase = getSupabaseAdmin();
    
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
