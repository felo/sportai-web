import { storageLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";

/**
 * Refresh video URLs from S3 keys for messages that have expired URLs
 * This is called asynchronously after loading messages
 */
export async function refreshVideoUrls(messages: Message[]): Promise<Message[]> {
  const messagesWithKeys = messages.filter((msg) => msg.videoS3Key && !msg.videoUrl);
  
  if (messagesWithKeys.length === 0) {
    return messages;
  }

  storageLogger.info(`Refreshing ${messagesWithKeys.length} video URL(s) from S3 keys...`);

  const refreshedMessages = await Promise.all(
    messages.map(async (msg) => {
      // Refresh if we have an S3 key (presigned URLs expire, so always refresh)
      if (msg.videoS3Key) {
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
      }
      return msg;
    })
  );

  return refreshedMessages;
}







