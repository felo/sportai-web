import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin, getAuthenticatedUser, unauthorizedResponse } from "@/lib/supabase-server";

export const runtime = "nodejs";

// S3 Configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "sportai-llm-uploads";
const BUCKET_REGION = process.env.AWS_REGION || "eu-north-1";

function getS3Client(): S3Client | null {
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!hasCredentials) {
    return null;
  }
  
  return new S3Client({
    region: BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * GET /api/tasks/[taskId]/download
 * Generate a presigned URL to download the task result
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = `task_download_${Date.now()}`;
  
  try {
    // Validate JWT and get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    
    const userId = user.id;
    const supabase = getSupabaseAdmin();
    
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
    
    if (!task.result_s3_key) {
      return NextResponse.json(
        { error: "No result available for this task" },
        { status: 404 }
      );
    }
    
    const s3Client = getS3Client();
    if (!s3Client) {
      return NextResponse.json(
        { error: "S3 not configured" },
        { status: 503 }
      );
    }
    
    // Generate presigned URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: task.result_s3_key,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    logger.info(`[${requestId}] Generated presigned URL for task ${taskId}`);
    
    return NextResponse.json({ 
      url: presignedUrl,
      filename: `${task.task_type}-${task.sportai_task_id || taskId}.json`,
    });
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
