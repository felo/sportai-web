import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

const SPORTAI_API_URL = "https://api.sportai.com";
const SPORTAI_API_KEY = process.env.SPORTAI_API_KEY;

// S3 Configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "sportai-llm-uploads";
const BUCKET_REGION = process.env.AWS_REGION || "eu-north-1";

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

function getS3Client(): S3Client | null {
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!hasCredentials) {
    logger.warn("AWS credentials not configured - results will not be saved to S3");
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

async function uploadResultToS3(taskId: string, result: unknown): Promise<string | null> {
  const s3Client = getS3Client();
  if (!s3Client) {
    return null;
  }
  
  const key = `task-results/${taskId}.json`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(result, null, 2),
    ContentType: "application/json",
  });
  
  await s3Client.send(command);
  logger.info(`Uploaded task result to S3: ${key}`);
  
  return key;
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
    
    if (!SPORTAI_API_KEY) {
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
    const statusResponse = await fetch(
      `${SPORTAI_API_URL}${baseEndpoint}/${task.sportai_task_id}/status`,
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
    
    // Update task based on SportAI response
    let updates: Partial<Database["public"]["Tables"]["sportai_tasks"]["Update"]> = {
      updated_at: new Date().toISOString(),
    };
    
    const resultStatus = statusResult.status || statusResult.data?.status;
    
    if (resultStatus === "completed") {
      // Upload result to S3
      const resultData = statusResult.result || statusResult.data?.result;
      let resultS3Key: string | null = null;
      
      if (resultData) {
        try {
          resultS3Key = await uploadResultToS3(taskId, resultData);
        } catch (s3Error) {
          logger.error(`[${requestId}] Failed to upload result to S3:`, s3Error);
          // Continue without S3 upload - we'll still mark as completed
        }
      }
      
      updates = {
        ...updates,
        status: "completed",
        result_s3_key: resultS3Key,
        completed_at: new Date().toISOString(),
      };
    } else if (resultStatus === "failed") {
      updates = {
        ...updates,
        status: "failed",
        error_message: statusResult.error || statusResult.data?.error || "Task failed",
      };
    } else if (resultStatus === "processing") {
      updates.status = "processing";
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
