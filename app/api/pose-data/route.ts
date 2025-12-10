/**
 * API Route for saving/loading pose data keyed by video S3 key
 * 
 * This allows pose data to be shared between Chat and TechniqueViewer
 * since the same video will have the same S3 key regardless of context.
 * 
 * POST /api/pose-data - Save pose data to S3
 * GET /api/pose-data?videoS3Key=... - Load pose data from S3
 * HEAD /api/pose-data?videoS3Key=... - Check if pose data exists
 * DELETE /api/pose-data?videoS3Key=... - Delete pose data
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import { logger } from "@/lib/logger";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const runtime = "nodejs";

// S3 Configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "sportai-llm-uploads";
const BUCKET_REGION = process.env.AWS_REGION || "eu-north-1";

const s3Client = new S3Client({
  region: BUCKET_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

/**
 * Generate the S3 key for pose data based on the video's S3 key
 * The video key is sanitized to create a valid path
 */
function getPoseDataKey(videoS3Key: string): string {
  // Sanitize the video key to use as a folder name
  // Replace slashes with underscores to flatten the path
  const sanitizedKey = videoS3Key.replace(/\//g, "_");
  return `pose-data/videos/${sanitizedKey}/poses.json.gz`;
}

/**
 * POST - Save pose data to S3
 */
export async function POST(request: NextRequest) {
  const requestId = `pose_save_${Date.now()}`;
  
  try {
    const body = await request.json();
    const { videoS3Key, ...data } = body;

    if (!videoS3Key) {
      return NextResponse.json(
        { error: "videoS3Key is required" },
        { status: 400 }
      );
    }

    logger.info(`[${requestId}] Saving pose data for video ${videoS3Key}`);

    const key = getPoseDataKey(videoS3Key);

    // Minify: remove undefined/null values, then compress with gzip
    const jsonString = JSON.stringify(data, (key, value) => {
      if (value === undefined || value === null) return undefined;
      return value;
    });
    const compressed = await gzipAsync(jsonString);
    
    const originalSize = Buffer.byteLength(jsonString);
    const compressedSize = compressed.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: compressed,
      ContentType: "application/gzip",
      ContentEncoding: "gzip",
    });

    await s3Client.send(command);

    logger.info(`[${requestId}] Pose data saved to ${key} (${(originalSize/1024).toFixed(1)}KB → ${(compressedSize/1024).toFixed(1)}KB, ${compressionRatio}% reduction)`);

    return NextResponse.json({
      success: true,
      s3Key: key,
    });
  } catch (error) {
    logger.error(`[${requestId}] Failed to save pose data:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save pose data" },
      { status: 500 }
    );
  }
}

/**
 * GET - Load pose data from S3
 */
export async function GET(request: NextRequest) {
  const requestId = `pose_load_${Date.now()}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const videoS3Key = searchParams.get("videoS3Key");

    if (!videoS3Key) {
      return NextResponse.json(
        { error: "videoS3Key query parameter is required" },
        { status: 400 }
      );
    }

    logger.info(`[${requestId}] Loading pose data for video ${videoS3Key}`);

    const key = getPoseDataKey(videoS3Key);

    // Download from S3
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Convert stream to buffer and decompress
    const compressedBuffer = Buffer.from(await response.Body.transformToByteArray());
    const decompressed = await gunzipAsync(compressedBuffer);
    const data = JSON.parse(decompressed.toString());

    logger.info(`[${requestId}] Pose data loaded from ${key} (${(compressedBuffer.length/1024).toFixed(1)}KB compressed)`);

    return NextResponse.json(data);
  } catch (error: unknown) {
    // Check for NoSuchKey or AccessDenied errors (treat both as "not found")
    const errorCode = error && typeof error === 'object' && 'Code' in error ? (error as { Code: string }).Code : '';
    const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name: string }).name : '';
    
    if (errorName === "NoSuchKey" || errorCode === "NoSuchKey" || 
        errorName === "AccessDenied" || errorCode === "AccessDenied") {
      return NextResponse.json({ error: "No pose data found" }, { status: 404 });
    }

    logger.error(`[${requestId}] Failed to load pose data:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load pose data" },
      { status: 500 }
    );
  }
}

/**
 * HEAD - Check if pose data exists
 */
export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoS3Key = searchParams.get("videoS3Key");

    if (!videoS3Key) {
      return new NextResponse(null, { status: 400 });
    }
    
    const key = getPoseDataKey(videoS3Key);

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    
    return new NextResponse(null, { status: 200 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === "NotFound") {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * DELETE - Delete pose data
 */
export async function DELETE(request: NextRequest) {
  const requestId = `pose_delete_${Date.now()}`;
  
  try {
    const { searchParams } = new URL(request.url);
    const videoS3Key = searchParams.get("videoS3Key");

    if (!videoS3Key) {
      return NextResponse.json(
        { error: "videoS3Key query parameter is required" },
        { status: 400 }
      );
    }

    logger.info(`[${requestId}] Deleting pose data for video ${videoS3Key}`);

    const key = getPoseDataKey(videoS3Key);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    logger.info(`[${requestId}] Pose data deleted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`[${requestId}] Failed to delete pose data:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete pose data" },
      { status: 500 }
    );
  }
}
