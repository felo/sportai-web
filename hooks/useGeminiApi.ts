import { useState, useCallback, useRef } from "react";
import type { ProgressStage } from "@/types/chat";

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
      updateMessage: (id: string, content: string) => void
    ) => {
      optionsRef.current.onProgressUpdate?.("generating", 0);

      const formData = new FormData();
      formData.append("prompt", prompt);

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
      setStage: (stage: ProgressStage) => void
    ) => {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("video", videoFile);

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

