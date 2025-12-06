import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from "@/lib/s3";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = `s3_url_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Received request for presigned URL`);
  
  // Check AWS credentials
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  logger.debug(`[${requestId}] AWS credentials check: hasCredentials=${hasCredentials}`);
  
  if (!hasCredentials) {
    const errorMsg = "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.";
    logger.error(`[${requestId}] ${errorMsg}`);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
  
  try {
    const body = await request.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      logger.error(`[${requestId}] Missing required fields: fileName or contentType`);
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    logger.debug(`[${requestId}] Generating presigned URL for: ${fileName} (${contentType})`);
    
    const result = await generatePresignedUploadUrl(fileName, contentType);
    
    logger.info(`[${requestId}] Presigned URL generated successfully`, { key: result.key });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned URL:`, error);
    
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate upload URL";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

