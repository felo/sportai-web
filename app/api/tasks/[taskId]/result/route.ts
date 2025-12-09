import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";
import { getSportAIApiUrl, getSportAIApiKey, getEnvironmentLabel } from "@/lib/sportai-api";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow more time for downloading large files

// S3 Configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "sportai-llm-uploads";
const BUCKET_REGION = process.env.AWS_REGION || "eu-north-1";

// Task type to API endpoint mapping
const RESULT_ENDPOINTS: Record<string, string> = {
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
 * POST /api/tasks/[taskId]/result
 * Fetch result from SportAI, store in our S3, and return download URL
 * 
 * Query params:
 * - force: If "true", bypass cache and re-fetch from SportAI API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = `task_result_${Date.now()}`;
  
  // Check for force refresh
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("force") === "true";
  
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
    
    // If we already have the result stored AND not forcing refresh, return cached URL
    if (task.result_s3_key && !forceRefresh) {
      const s3Client = getS3Client();
      if (s3Client) {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: task.result_s3_key,
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return NextResponse.json({ 
          url: presignedUrl,
          filename: `${task.task_type}-${task.sportai_task_id || taskId}.json`,
          cached: true,
        });
      }
    }
    
    if (forceRefresh) {
      logger.info(`[${requestId}] Force refresh requested for task ${taskId}`);
    }
    
    if (!task.sportai_task_id) {
      return NextResponse.json(
        { error: "Task has no SportAI task ID" },
        { status: 400 }
      );
    }
    
    // Get the appropriate endpoint for this task type
    const baseEndpoint = RESULT_ENDPOINTS[task.task_type];
    if (!baseEndpoint) {
      return NextResponse.json(
        { error: `Unknown task type: ${task.task_type}` },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Fetching result from SportAI for task ${task.sportai_task_id}`);
    
    // Call SportAI API to get the result URL
    // Padel is the default sport, so no suffix needed. Other sports need /{sport} before task_id
    const sportSuffix = task.sport === "padel" ? "" : `/${task.sport}`;
    const sportaiResponse = await fetch(
      `${SPORTAI_API_URL}${baseEndpoint}${sportSuffix}/${task.sportai_task_id}`,
      {
        headers: {
          "Authorization": `Bearer ${SPORTAI_API_KEY}`,
        },
      }
    );
    
    if (sportaiResponse.status === 202) {
      return NextResponse.json(
        { error: "Task is still being processed" },
        { status: 202 }
      );
    }
    
    if (sportaiResponse.status === 422) {
      const errorData = await sportaiResponse.json();
      const errorMessage = errorData.error?.error_message || "Task could not be processed";
      
      // Update task as failed
      await supabase
        .from("sportai_tasks")
        .update({ 
          status: "failed", 
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      
      return NextResponse.json({ error: errorMessage }, { status: 422 });
    }
    
    if (!sportaiResponse.ok) {
      const errorData = await sportaiResponse.json().catch(() => ({}));
      logger.error(`[${requestId}] SportAI API error:`, errorData);
      return NextResponse.json(
        { error: errorData.error || `SportAI API returned ${sportaiResponse.status}` },
        { status: sportaiResponse.status }
      );
    }
    
    const sportaiResult = await sportaiResponse.json();
    const resultUrl = sportaiResult.data?.result_url;
    
    if (!resultUrl) {
      logger.error(`[${requestId}] No result_url in SportAI response:`, sportaiResult);
      return NextResponse.json(
        { error: "No result URL in response" },
        { status: 500 }
      );
    }
    
    logger.info(`[${requestId}] Got result URL, downloading...`);
    
    // Download the result from SportAI's S3
    const resultResponse = await fetch(resultUrl);
    if (!resultResponse.ok) {
      return NextResponse.json(
        { error: "Failed to download result from SportAI" },
        { status: 500 }
      );
    }
    
    const resultData = await resultResponse.json();
    
    // Upload to our S3
    const s3Client = getS3Client();
    let resultS3Key: string | null = null;
    
    if (s3Client) {
      resultS3Key = `task-results/${taskId}.json`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: resultS3Key,
        Body: JSON.stringify(resultData, null, 2),
        ContentType: "application/json",
      });
      
      await s3Client.send(uploadCommand);
      logger.info(`[${requestId}] Uploaded result to S3: ${resultS3Key}`);
      
      // Update database with S3 key
      await supabase
        .from("sportai_tasks")
        .update({ 
          result_s3_key: resultS3Key,
          status: "completed",
          completed_at: task.completed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      
      // Generate presigned URL for download
      const downloadCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: resultS3Key,
      });
      const presignedUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: 3600 });
      
      return NextResponse.json({ 
        url: presignedUrl,
        filename: `${task.task_type}-${task.sportai_task_id || taskId}.json`,
        cached: false,
      });
    } else {
      // No S3 configured, just return the SportAI URL
      return NextResponse.json({ 
        url: resultUrl,
        filename: `${task.task_type}-${task.sportai_task_id || taskId}.json`,
        cached: false,
      });
    }
  } catch (error) {
    logger.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch result" },
      { status: 500 }
    );
  }
}

