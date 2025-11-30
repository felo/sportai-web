import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Initialize S3 client
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "sportai-llm-uploads";
const BUCKET_REGION = process.env.AWS_REGION || "eu-north-1";

const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let s3Client: S3Client | null = null;

if (hasCredentials) {
  s3Client = new S3Client({
    region: BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload a profile avatar to S3
 * This endpoint downloads the image from the OAuth provider and re-uploads it to our S3 bucket
 */
export async function POST(request: NextRequest) {
  const requestId = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Received avatar upload request`);
  
  if (!hasCredentials || !s3Client) {
    const errorMsg = "AWS credentials not configured";
    logger.error(`[${requestId}] ${errorMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { userId, avatarUrl } = body;
    
    if (!userId || !avatarUrl) {
      return NextResponse.json(
        { error: "userId and avatarUrl are required" },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Downloading avatar from: ${avatarUrl}`);
    console.log(`[Avatar API] Downloading avatar for user: ${userId}`);
    
    // Download the image from the OAuth provider
    const response = await fetch(avatarUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download avatar: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Determine file extension from content type
    let extension = "jpg";
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("webp")) extension = "webp";
    else if (contentType.includes("gif")) extension = "gif";
    
    // Generate a unique key for the avatar
    const timestamp = Date.now();
    const key = `avatars/${userId}/${timestamp}.${extension}`;
    
    logger.info(`[${requestId}] Uploading avatar to S3: ${key}`);
    console.log(`[Avatar API] Uploading to S3: ${key} (${imageBuffer.length} bytes)`);
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    
    // Generate the public URL
    const s3Url = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
    
    logger.info(`[${requestId}] Avatar uploaded successfully: ${s3Url}`);
    console.log(`[Avatar API] ✅ Avatar uploaded: ${s3Url}`);
    
    return NextResponse.json({ 
      success: true, 
      avatarUrl: s3Url,
      key 
    });
  } catch (error) {
    logger.error(`[${requestId}] Failed to upload avatar:`, error);
    console.error(`[Avatar API] ❌ Failed to upload avatar:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}








