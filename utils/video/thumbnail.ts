/**
 * Video Utilities - Thumbnail Upload
 * 
 * Functions for uploading video thumbnails to S3.
 */

import { videoLogger } from "@/lib/logger";
import type { ThumbnailUploadResult } from "./types";

/**
 * Upload a thumbnail blob to S3
 * Reusable utility for uploading video thumbnails
 * 
 * @param frameBlob - JPEG blob of the thumbnail
 * @returns Promise with thumbnailUrl and thumbnailS3Key, or null on failure
 */
export async function uploadThumbnailToS3(
  frameBlob: Blob
): Promise<ThumbnailUploadResult | null> {
  try {
    videoLogger.debug("[uploadThumbnailToS3] Uploading thumbnail to S3...");
    const thumbnailFile = new File([frameBlob], `thumbnail_${Date.now()}.jpg`, { type: "image/jpeg" });
    
    // Get presigned upload URL
    const urlResponse = await fetch("/api/s3/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: thumbnailFile.name,
        contentType: thumbnailFile.type,
      }),
    });
    
    if (!urlResponse.ok) {
      videoLogger.warn("[uploadThumbnailToS3] Failed to get upload URL for thumbnail");
      return null;
    }
    
    const { url: presignedUrl, downloadUrl, key: s3Key } = await urlResponse.json();
    
    // Upload to S3
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Thumbnail upload failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Thumbnail upload failed")));
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", thumbnailFile.type);
      xhr.send(thumbnailFile);
    });
    
    videoLogger.debug("[uploadThumbnailToS3] ✅ Thumbnail uploaded to S3:", s3Key);
    return { thumbnailUrl: downloadUrl, thumbnailS3Key: s3Key };
  } catch (err) {
    videoLogger.warn("[uploadThumbnailToS3] Thumbnail upload failed (non-blocking):", err);
    return null;
  }
}
