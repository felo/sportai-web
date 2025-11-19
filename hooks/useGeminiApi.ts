import { useState, useCallback, useRef } from "react";
import type { ProgressStage, Message } from "@/types/chat";
import { getConversationContext, trimMessagesByTokens, formatMessagesForGemini } from "@/utils/context-utils";
import { uploadToS3 } from "@/lib/s3";

interface UseGeminiApiOptions {
  onProgressUpdate?: (stage: ProgressStage, progress: number) => void;
}

export function useGeminiApi(options: UseGeminiApiOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendTextOnlyQuery = useCallback(
    async (
      prompt: string,
      assistantMessageId: string,
      updateMessage: (id: string, content: string) => void,
      conversationHistory?: Message[]
    ) => {
      optionsRef.current.onProgressUpdate?.("generating", 0);

      const formData = new FormData();
      formData.append("prompt", prompt);

      // Add conversation history if provided and not empty
      // Skip if empty array to avoid sending unnecessary data
      // For first message, conversationHistory should be empty, so we skip this
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const context = getConversationContext(conversationHistory);
        if (context.length > 0) {
          const historyJson = JSON.stringify(context);
          // Check size - allow up to 20MB total payload
          // Leave room for prompt and other data (reserve 2MB for prompt/video/overhead)
          const MAX_HISTORY_SIZE = 18 * 1024 * 1024; // 18MB to leave room for prompt and other data
          if (historyJson.length > MAX_HISTORY_SIZE) {
            console.warn(`Conversation history too large (${historyJson.length} bytes), trimming more aggressively`);
            // Trim more aggressively by reducing token limit
            const trimmedMessages = trimMessagesByTokens(conversationHistory, 2000); // Reduce to 2000 tokens
            const trimmedContext = formatMessagesForGemini(trimmedMessages);
            const trimmedJson = JSON.stringify(trimmedContext);
            if (trimmedJson.length <= MAX_HISTORY_SIZE) {
              formData.append("history", trimmedJson);
            } else {
              // If still too large, don't send history
              console.warn("Conversation history still too large after trimming, skipping");
            }
          } else {
            formData.append("history", historyJson);
          }
        }
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "x-stream": "true",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          updateMessage(assistantMessageId, accumulatedText);
        }
      }
    },
    []
  );

  const sendVideoQuery = useCallback(
    async (
      prompt: string,
      videoFile: File,
      assistantMessageId: string,
      updateMessage: (id: string, content: string) => void,
      setProgress: (progress: number) => void,
      setStage: (stage: ProgressStage) => void,
      conversationHistory?: Message[],
      onVideoUploaded?: (s3Url: string) => void
    ) => {
      setStage("uploading");
      setProgress(0);

      // Step 1: Get presigned URL for S3 upload
      let s3Url: string;
      try {
        console.log("[S3] Requesting presigned URL for upload...", {
          fileName: videoFile.name,
          fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
          contentType: videoFile.type,
        });

        const urlResponse = await fetch("/api/s3/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: videoFile.name,
            contentType: videoFile.type,
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          console.error("[S3] ❌ Failed to get presigned URL", errorData);
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const { url: presignedUrl, publicUrl, downloadUrl, key } = await urlResponse.json();
        // Use presigned download URL if available (for secure access), otherwise fall back to public URL
        s3Url = downloadUrl || publicUrl;

        console.log("[S3] ✅ Presigned URL received", {
          key,
          publicUrl: publicUrl,
          downloadUrl: downloadUrl ? `${downloadUrl.substring(0, 50)}...` : "none",
          usingUrl: downloadUrl ? "presigned download URL" : "public URL",
          fileName: videoFile.name,
        });

        // Step 2: Upload file to S3 using presigned URL
        console.log("[S3] Starting file upload to S3...");
        await uploadToS3(presignedUrl, videoFile, (progress) => {
          // Scale upload progress to 0-80% (leaving 20% for processing)
          setProgress(progress * 0.8);
        });

        console.log("[S3] ✅ File uploaded successfully to S3!", {
          s3Url: s3Url,
          fileName: videoFile.name,
        });

        // Notify that video has been uploaded with S3 URL
        if (onVideoUploaded) {
          onVideoUploaded(s3Url);
        }

        setProgress(80);
        
        // Step 2: Send S3 URL to Gemini API - backend will download it efficiently
        setStage("processing");
        console.log("[S3] Sending S3 URL to Gemini API (backend will download)...", {
          s3Url: s3Url,
          promptLength: prompt.length,
        });

        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("videoUrl", s3Url);

        // Add conversation history if provided
        if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          const context = getConversationContext(conversationHistory);
          if (context.length > 0) {
            const historyJson = JSON.stringify(context);
            // With S3 URL, we have more room for history since video isn't in the payload
            const MAX_HISTORY_SIZE_WITH_S3 = 18 * 1024 * 1024; // 18MB
            if (historyJson.length <= MAX_HISTORY_SIZE_WITH_S3) {
              formData.append("history", historyJson);
            } else {
              console.warn(`Conversation history too large (${historyJson.length} bytes), skipping`);
            }
          }
        }

        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "x-stream": "true",
          },
          body: formData,
        });

        setProgress(90);
        setStage("analyzing");

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            updateMessage(assistantMessageId, accumulatedText);
          }
        }

        return;
      } catch (error) {
        // If S3 upload fails, log the error and check if we should fall back
        console.error("[S3] ❌ S3 upload failed:", error);
        console.error("[S3] Error details:", {
          error: error instanceof Error ? error.message : String(error),
          fileName: videoFile.name,
          fileSize: `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
        });
        
        // Check file size - if too large, fail with error (don't fall back)
        const fileSizeMB = videoFile.size / (1024 * 1024);
        if (fileSizeMB > 4.5) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          throw new Error(
            `S3 upload failed: ${errorMessage}. File is too large (${fileSizeMB.toFixed(2)} MB) for direct upload. Please check your S3 configuration or compress your video.`
          );
        }
        
        console.warn("[S3] ⚠️ Falling back to direct upload (file is small enough)");

        // Fall back to direct upload with streaming
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("video", videoFile);

        // Add conversation history
        if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          const context = getConversationContext(conversationHistory);
          if (context.length > 0) {
            const historyJson = JSON.stringify(context);
            const MAX_HISTORY_SIZE_WITH_VIDEO = 15 * 1024 * 1024; // 15MB
            if (historyJson.length <= MAX_HISTORY_SIZE_WITH_VIDEO) {
              formData.append("history", historyJson);
            }
          }
        }

        setStage("processing");
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "x-stream": "true",
          },
          body: formData,
        });

        setProgress(90);
        setStage("analyzing");

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            updateMessage(assistantMessageId, accumulatedText);
          }
        }

        return;
      }

    },
    []
  );

  return {
    error,
    setError,
    sendTextOnlyQuery,
    sendVideoQuery,
  };
}

