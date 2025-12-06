import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

// Check if we're on the server-side (where env vars are available)
const isServer = typeof window === "undefined";

// Check if AWS credentials are configured (only on server-side)
const hasCredentials = isServer && !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// Only log warnings on server-side
if (isServer && !hasCredentials) {
  logger.warn("AWS credentials not configured. S3 uploads will not work.");
}

// Initialize S3 client (only used server-side)
let s3Client: S3Client | null = null;

// Bucket configuration (defaults for client-side, actual values from env on server)
const BUCKET_NAME = (isServer && process.env.AWS_S3_BUCKET_NAME) || "sportai-llm-uploads";
// Default to eu-north-1 (Europe). Override via AWS_REGION environment variable if needed.
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

  logger.debug("Server-side S3 configuration:", { hasCredentials, region: BUCKET_REGION, bucket: BUCKET_NAME });
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
    throw new Error(errorMsg);
  }
  
  logger.info(`[${requestId}] Generating presigned download URL for: ${key}`);
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    logger.info(`[${requestId}] Presigned download URL generated successfully`);
    logger.debug(`[${requestId}] Download URL expires in ${expiresIn} seconds`);
    
    return url;
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned download URL:`, error);
    
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
    throw new Error(errorMsg);
  }
  
  // Generate a unique key with timestamp and random string
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 11);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `test/${timestamp}_${randomStr}_${sanitizedFileName}`;
  
  logger.info(`[${requestId}] Generating presigned URL for: ${key}`);
  logger.debug(`[${requestId}] Content type: ${contentType}`);
  
  try {
    // Build the command - try without ACL first (some buckets have ACL disabled)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // Note: ACL "public-read" may not work if bucket has ACLs disabled
      // If you get errors, remove the ACL line or configure bucket to allow public access
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${key}`;
    
    // Generate presigned download URL (valid for 7 days)
    let downloadUrl: string | undefined;
    try {
      downloadUrl = await generatePresignedDownloadUrl(key, 7 * 24 * 3600);
    } catch (error) {
      logger.error(`[${requestId}] Failed to generate presigned download URL, will use public URL:`, error);
    }
    
    logger.info(`[${requestId}] Presigned URL generated successfully`);
    logger.debug(`[${requestId}] Public URL: ${publicUrl}`);
    
    return {
      url,
      key,
      publicUrl,
      downloadUrl,
    };
  } catch (error) {
    logger.error(`[${requestId}] Failed to generate presigned URL:`, error);
    
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
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  logger.debug("Starting upload to S3...", {
    fileName: file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status === 200 || xhr.status === 204) {
        logger.debug("Upload completed successfully!", { status: xhr.status, fileName: file.name });
        resolve();
      } else {
        // Parse XML error response from S3
        let errorMessage = `Upload failed with status ${xhr.status}: ${xhr.statusText}`;
        let errorCode = "";
        let errorDetails = "";
        
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");
          const errorCodeElement = xmlDoc.querySelector("Code");
          const errorMessageElement = xmlDoc.querySelector("Message");
          
          if (errorCodeElement) {
            errorCode = errorCodeElement.textContent || "";
          }
          if (errorMessageElement) {
            errorDetails = errorMessageElement.textContent || "";
            errorMessage = `S3 Upload Failed (${errorCode}): ${errorDetails}`;
          }
        } catch (e) {
          // If XML parsing fails, use the raw response
          errorDetails = xhr.responseText.substring(0, 500);
        }
        
        logger.error("Upload failed", { status: xhr.status, errorCode, errorDetails, fileName: file.name });
        
        // Provide helpful error message based on error code
        if (errorCode === "AccessDenied" || xhr.status === 403) {
          const helpfulMessage = `${errorMessage}\n\n` +
            `This is a permissions issue. Please check:\n` +
            `1. Your IAM user has 's3:PutObject' permission for the bucket\n` +
            `2. The bucket policy allows uploads\n` +
            `3. The AWS credentials in Vercel are correct and have the right permissions\n` +
            `4. The bucket region matches AWS_REGION environment variable (currently: eu-north-1)`;
          reject(new Error(helpfulMessage));
        } else {
          reject(new Error(errorMessage));
        }
      }
    });

    xhr.addEventListener("error", () => {
      logger.error("Upload failed due to network error", { fileName: file.name, status: xhr.status });
      
      // Check if it's a CORS error
      if (xhr.status === 0) {
        const currentOrigin = typeof window !== "undefined" ? window.location.origin : "unknown";
        const errorMsg = `Upload failed due to CORS error. The S3 bucket must allow requests from: ${currentOrigin}`;
        reject(new Error(errorMsg));
      } else {
        reject(new Error(`Upload failed due to network error: ${xhr.statusText || "Unknown error"}`));
      }
    });

    xhr.addEventListener("abort", () => {
      logger.warn("Upload was aborted", { fileName: file.name });
      reject(new Error("Upload was aborted"));
    });

    try {
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    } catch (error) {
      logger.error("Exception while sending request:", error);
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
    
    logger.info(`[${requestId}] Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)} MB, Content-Type: ${contentType}`);
    
    return {
      data: buffer,
      mimeType: contentType,
    };
  } catch (error) {
    logger.error(`[${requestId}] Failed to download from S3:`, error);
    throw error;
  }
}

