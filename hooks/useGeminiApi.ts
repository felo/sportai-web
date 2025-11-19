import { useState, useCallback, useRef } from "react";
import type { ProgressStage, Message } from "@/types/chat";
import { getConversationContext, trimMessagesByTokens, formatMessagesForGemini } from "@/utils/context-utils";

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
      conversationHistory?: Message[]
    ) => {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("video", videoFile);

      // Add conversation history if provided and not empty
      // Note: With video uploads, we need to be more conservative with history size
      // For first message, conversationHistory should be empty, so we skip this
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const context = getConversationContext(conversationHistory);
        if (context.length > 0) {
          const historyJson = JSON.stringify(context);
          // With video, be more conservative - limit to 15MB for history (leaves 5MB for video)
          const MAX_HISTORY_SIZE_WITH_VIDEO = 15 * 1024 * 1024; // 15MB
          if (historyJson.length <= MAX_HISTORY_SIZE_WITH_VIDEO) {
            formData.append("history", historyJson);
          } else {
            console.warn(`Conversation history too large for video upload (${historyJson.length} bytes), skipping`);
            // Don't send history if too large with video
          }
        }
      }

      setStage("uploading");

      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = {
              ok: true,
              status: xhr.status,
              statusText: xhr.statusText,
              json: async () => JSON.parse(xhr.responseText),
              text: async () => xhr.responseText,
            } as Response;
            resolve(response);
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(
                new Error(
                  errorData.error || `HTTP ${xhr.status}: ${xhr.statusText}`
                )
              );
            } catch {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Request aborted"));
        });

        xhr.open("POST", "/api/gemini");
        xhr.send(formData);
      });

      setStage("processing");
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      setStage("analyzing");
      const estimatedSeconds = Math.max(
        5,
        Math.min(30, (videoFile.size / (1024 * 1024)) * 1.5)
      );
      const analysisStartTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - analysisStartTime) / 1000;
        if (elapsed < estimatedSeconds) {
          const fakeProgress = Math.min(95, 50 + (elapsed / estimatedSeconds) * 45);
          setProgress(fakeProgress);
        }
      }, 200);

      const data = await res.json();
      clearInterval(progressInterval);

      updateMessage(assistantMessageId, data.response);
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

