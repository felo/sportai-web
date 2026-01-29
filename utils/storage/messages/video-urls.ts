import { storageLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";

/**
 * Check if a presigned S3 URL is expired or about to expire
 * AWS presigned URLs contain an X-Amz-Expires parameter (in seconds) and X-Amz-Date
 * We consider a URL expired if it has less than 1 hour remaining
 */
function isUrlExpiredOrExpiringSoon(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check for X-Amz-Date and X-Amz-Expires (AWS presigned URL format)
    const amzDate = urlObj.searchParams.get("X-Amz-Date");
    const amzExpires = urlObj.searchParams.get("X-Amz-Expires");

    if (amzDate && amzExpires) {
      // Parse X-Amz-Date format: YYYYMMDDTHHMMSSZ
      const year = parseInt(amzDate.slice(0, 4));
      const month = parseInt(amzDate.slice(4, 6)) - 1; // months are 0-indexed
      const day = parseInt(amzDate.slice(6, 8));
      const hour = parseInt(amzDate.slice(9, 11));
      const minute = parseInt(amzDate.slice(11, 13));
      const second = parseInt(amzDate.slice(13, 15));

      const signedAt = new Date(Date.UTC(year, month, day, hour, minute, second));
      const expiresInSeconds = parseInt(amzExpires);
      const expiresAt = new Date(signedAt.getTime() + expiresInSeconds * 1000);

      // Consider expired if less than 1 hour remaining
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      return expiresAt <= oneHourFromNow;
    }

    // If we can't parse the URL, assume it might be expired (safer to refresh)
    return true;
  } catch {
    // If URL parsing fails, assume expired
    return true;
  }
}

/**
 * Refresh video URLs from S3 keys for messages that have expired URLs
 * This is called asynchronously after loading messages
 *
 * Only refreshes URLs that are:
 * - Missing (no videoUrl but has videoS3Key)
 * - Expired or expiring within 1 hour
 */
export async function refreshVideoUrls(messages: Message[]): Promise<Message[]> {
  // Filter messages that need URL refresh
  const messagesNeedingRefresh = messages.filter((msg) => {
    if (!msg.videoS3Key) return false;
    if (!msg.videoUrl) return true; // No URL, needs refresh
    return isUrlExpiredOrExpiringSoon(msg.videoUrl); // Has URL, check if expired
  });

  if (messagesNeedingRefresh.length === 0) {
    storageLogger.debug("No video URLs need refreshing");
    return messages;
  }

  storageLogger.info(`Refreshing ${messagesNeedingRefresh.length} video URL(s) from S3 keys...`);

  // Create a set of message IDs that need refresh for quick lookup
  const idsNeedingRefresh = new Set(messagesNeedingRefresh.map(m => m.id));

  const refreshedMessages = await Promise.all(
    messages.map(async (msg) => {
      // Only refresh if this message needs it
      if (!idsNeedingRefresh.has(msg.id)) {
        return msg;
      }

      try {
        const response = await fetch("/api/s3/download-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: msg.videoS3Key,
            expiresIn: 7 * 24 * 3600, // 7 days
          }),
        });

        if (response.ok) {
          const { downloadUrl } = await response.json();
          storageLogger.info(`Refreshed video URL for key: ${msg.videoS3Key}`);
          return { ...msg, videoUrl: downloadUrl };
        } else {
          storageLogger.warn(`Failed to refresh video URL for key: ${msg.videoS3Key}`);
          return msg;
        }
      } catch (error) {
        storageLogger.error(`Error refreshing video URL for key: ${msg.videoS3Key}`, error);
        return msg;
      }
    })
  );

  return refreshedMessages;
}
