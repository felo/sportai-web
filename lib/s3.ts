import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

// Check if we're on the server-side (where env vars are available)
const isServer = typeof window === "undefined";

// Check if AWS credentials are configured (only on server-side)
const hasCredentials = isServer && !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// Only log warnings on server-side
if (isServer && !hasCredentials) {
  console.warn("[S3] ⚠️ AWS credentials not configured. S3 uploads will not work.");
  console.warn("[S3] Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.");
}

// Initialize S3 client (only used server-side)
let s3Client: S3Client | null = null;

// Bucket configuration (defaults for client-side, actual values from env on server)
const BUCKET_NAME = (isServer && process.env.AWS_S3_BUCKET_NAME) || "sportai-llm-uploads";
const BUCKET_REGION = (isServer && process.env.AWS_REGION) || "eu-north-1";

if (isServer) {
  s3Client = new S3Client({
    region: BUCKET_REGION,
    credentials: hasCredentials
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
  });

  console.log("[S3] Server-side configuration:", {
    hasCredentials,
    region: BUCKET_REGION,
    bucket: BUCKET_NAME,
    accessKeyId: hasCredentials ? `${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...` : "not set",
  });
}

export interface PresignedUrlResponse {
  url: string;
  key: string;
  publicUrl: string;
  downloadUrl?: string; // Presigned download URL
}

/**
 * Generate a presigned URL for downloading a file from S3
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns Presigned download URL
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 7 * 24 * 3600 // 7 days default
): Promise<string> {
  const requestId = `s3_dl_url_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // This function should only be called server-side
  if (!isServer) {
    throw new Error("generatePresignedDownloadUrl can only be called server-side");
  }
  
  if (!s3Client) {
    throw new Error("S3 client not initialized");
  }
  
  // Check credentials first
  if (!hasCredentials) {
    const errorMsg = "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.";
    logger.error(`[${requestId}] ${errorMsg}`);
    console.error(`[S3] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  logger.info(`[${requestId}] Generating presigned download URL for: ${key}`);
  console.log(`[S3] Generating presigned download URL for key: ${key}`);
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    logger.info(`[${requestId}] Presigned download URL generated successfully`);
    logger.debug(`[${requestId}] Download URL expires in ${expiresIn} seconds`);
    console.log(`[S3] ✅ Presigned download URL generated successfully`);
    
    return url;
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned download URL:`, error);
    console.error(`[S3] ❌ Failed to generate presigned download URL:`, error);
    
    throw new Error(
      error instanceof Error
        ? `Failed to generate download URL: ${error.message}`
        : "Failed to generate download URL"
    );
  }
}

/**
 * Generate a presigned URL for uploading a file to S3
 * @param fileName - Original file name
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL and file key
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<PresignedUrlResponse> {
  const requestId = `s3_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // This function should only be called server-side
  if (!isServer) {
    throw new Error("generatePresignedUploadUrl can only be called server-side");
  }
  
  if (!s3Client) {
    throw new Error("S3 client not initialized");
  }
  
  // Check credentials first
  if (!hasCredentials) {
    const errorMsg = "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.";
    logger.error(`[${requestId}] ${errorMsg}`);
    console.error(`[S3] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  // Generate a unique key with timestamp and random string
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 11);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `test/${timestamp}_${randomStr}_${sanitizedFileName}`;
  
  logger.info(`[${requestId}] Generating presigned URL for: ${key}`);
  logger.debug(`[${requestId}] Content type: ${contentType}`);
  console.log(`[S3] Generating presigned URL for key: ${key}`);
  
  try {
    // Build the command - try without ACL first (some buckets have ACL disabled)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // Note: ACL "public-read" may not work if bucket has ACLs disabled
      // If you get errors, remove the ACL line or configure bucket to allow public access
    });

    console.log(`[S3] Creating presigned URL with command:`, {
      bucket: BUCKET_NAME,
      key,
      contentType,
      region: BUCKET_REGION,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
    
    // Generate presigned download URL (valid for 7 days)
    let downloadUrl: string | undefined;
    try {
      downloadUrl = await generatePresignedDownloadUrl(key, 7 * 24 * 3600);
    } catch (error) {
      logger.error(`[${requestId}] Failed to generate presigned download URL, will use public URL:`, error);
      console.warn(`[S3] ⚠️ Failed to generate presigned download URL, will use public URL`);
    }
    
    logger.info(`[${requestId}] Presigned URL generated successfully`);
    logger.debug(`[${requestId}] Public URL: ${publicUrl}`);
    if (downloadUrl) {
      logger.debug(`[${requestId}] Download URL: ${downloadUrl.substring(0, 100)}...`);
    }
    console.log(`[S3] ✅ Presigned URL generated successfully`);
    
    return {
      url,
      key,
      publicUrl,
      downloadUrl,
    };
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned URL:`, error);
    console.error(`[S3] ❌ Failed to generate presigned URL:`, error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error(`[S3] Error details:`, {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    
    throw new Error(
      error instanceof Error
        ? `Failed to generate upload URL: ${error.message}`
        : "Failed to generate upload URL"
    );
  }
}

/**
 * Upload a file directly to S3 using a presigned URL
 * @param presignedUrl - Presigned URL from generatePresignedUploadUrl
 * @param file - File to upload
 * @param onProgress - Optional progress callback
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  console.log("[S3 Upload] Starting upload to S3...", {
    fileName: file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    contentType: file.type,
    presignedUrlLength: presignedUrl.length,
    presignedUrlPreview: presignedUrl.substring(0, 100) + "...",
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
          // Log progress at key milestones
          if (progress === 0 || progress >= 25 && progress < 26 || progress >= 50 && progress < 51 || progress >= 75 && progress < 76 || progress >= 99) {
            console.log(`[S3 Upload] Progress: ${progress.toFixed(1)}% (${(e.loaded / (1024 * 1024)).toFixed(2)} MB / ${(e.total / (1024 * 1024)).toFixed(2)} MB)`);
          }
        }
      });
    }

    xhr.addEventListener("load", () => {
      console.log("[S3 Upload] Response received", {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText.substring(0, 200),
        headers: xhr.getAllResponseHeaders(),
      });

      if (xhr.status === 200 || xhr.status === 204) {
        console.log("[S3 Upload] ✅ Upload completed successfully!", {
          status: xhr.status,
          fileName: file.name,
        });
        resolve();
      } else {
        console.error("[S3 Upload] ❌ Upload failed", {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          fileName: file.name,
        });
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText || "Unknown error"}`));
      }
    });

    xhr.addEventListener("error", (e) => {
      console.error("[S3 Upload] ❌ Upload failed due to network error", {
        fileName: file.name,
        error: e,
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText,
      });
      
      // Check if it's a CORS error
      if (xhr.status === 0 && xhr.readyState === 0) {
        reject(new Error("Upload failed due to CORS or network error. Please check your S3 bucket CORS configuration."));
      } else {
        reject(new Error(`Upload failed due to network error: ${xhr.statusText || "Unknown error"}`));
      }
    });

    xhr.addEventListener("abort", () => {
      console.warn("[S3 Upload] ⚠️ Upload was aborted", {
        fileName: file.name,
      });
      reject(new Error("Upload was aborted"));
    });

    xhr.addEventListener("loadend", () => {
      console.log("[S3 Upload] Request completed", {
        status: xhr.status,
        readyState: xhr.readyState,
      });
    });

    try {
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      console.log("[S3 Upload] Sending file to S3...", {
        method: "PUT",
        urlLength: presignedUrl.length,
        contentType: file.type,
      });
      xhr.send(file);
    } catch (error) {
      console.error("[S3 Upload] ❌ Exception while sending request:", error);
      reject(new Error(`Failed to send request: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  });
}

/**
 * Download a file from S3 using AWS SDK (server-side only)
 * @param url - Public S3 URL (we'll extract key from it)
 * @returns File buffer and content type
 */
export async function downloadFromS3(
  url: string
): Promise<{ data: Buffer; mimeType: string }> {
  const requestId = `s3_dl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Downloading from S3: ${url}`);
  
  // This function should only be called server-side
  if (!isServer) {
    throw new Error("downloadFromS3 can only be called server-side");
  }
  
  if (!s3Client) {
    throw new Error("S3 client not initialized");
  }
  
  if (!hasCredentials) {
    throw new Error("AWS credentials not configured");
  }
  
  try {
    // Extract bucket and key from URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/key or presigned URL with query params
    // For presigned URLs, we need to extract the key before the query parameters
    let urlMatch = url.match(/https:\/\/([^\.]+)\.s3\.([^\.]+)\.amazonaws\.com\/([^?]+)/);
    if (!urlMatch) {
      // Try alternative S3 URL formats
      urlMatch = url.match(/https:\/\/([^\.]+)\.s3-([^\.]+)\.amazonaws\.com\/([^?]+)/);
    }
    if (!urlMatch) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }
    
    const [, bucketFromUrl, , keyWithPath] = urlMatch;
    // Decode the key (it might be URL encoded)
    const key = decodeURIComponent(keyWithPath);
    
    // Verify bucket matches (or use from URL)
    const bucket = bucketFromUrl || BUCKET_NAME;
    
    logger.debug(`[${requestId}] Extracted bucket: ${bucket}, key: ${key}`);
    
    // Download using AWS SDK
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error("Empty response body from S3");
    }
    
    // Convert stream to buffer
    // AWS SDK v3 returns a Readable stream
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    
    // Handle both Node.js Readable stream and web stream
    if (typeof stream.transformToWebStream === 'function') {
      // Web stream
      const webStream = stream.transformToWebStream();
      const reader = webStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
    } else {
      // Node.js Readable stream
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
    }
    
    // Combine chunks into single buffer
    const buffer = Buffer.concat(chunks);
    
    const contentType = response.ContentType || "application/octet-stream";
    
    logger.info(`[${requestId}] Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`[S3 Download] ✅ Successfully downloaded: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    
    return {
      data: buffer,
      mimeType: contentType,
    };
  } catch (error) {
    logger.error(`[${requestId}] Failed to download from S3:`, error);
    console.error(`[S3 Download] ❌ Failed to download:`, error);
    throw error;
  }
}

