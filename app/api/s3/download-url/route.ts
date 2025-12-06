import { NextRequest, NextResponse } from "next/server";
import { generatePresignedDownloadUrl } from "@/lib/s3";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = `s3_dl_url_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Received request for presigned download URL`);
  
  // Check AWS credentials
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  
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
    const { key, expiresIn } = body;

    if (!key) {
      logger.error(`[${requestId}] Missing required field: key`);
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    // Default to 7 days if not specified
    const expirationSeconds = expiresIn || 7 * 24 * 3600;

    logger.debug(`[${requestId}] Generating presigned download URL for: ${key} (expires in ${expirationSeconds}s)`);
    
    const downloadUrl = await generatePresignedDownloadUrl(key, expirationSeconds);
    
    logger.info(`[${requestId}] Presigned download URL generated successfully`);
    
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned download URL:`, error);
    
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate download URL";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

