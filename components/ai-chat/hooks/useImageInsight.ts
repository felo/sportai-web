"use client";

/**
 * Hook for handling Image Insight requests from VideoPoseViewer
 */

import { useEffect, useCallback } from "react";
import { chatLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";
import { generateMessageId, stripStreamMetadata } from "../utils";
import type { ProgressStage } from "../types";

interface UseImageInsightOptions {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setProgressStage: (stage: ProgressStage) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  scrollToBottom: () => void;
  setApiError: (error: string | null) => void;
}

export function useImageInsight({
  loading,
  setLoading,
  setProgressStage,
  addMessage,
  updateMessage,
  scrollToBottom,
  setApiError,
}: UseImageInsightOptions): void {
  const handleImageInsightRequest = useCallback(async (event: CustomEvent<{
    imageBlob: Blob;
    domainExpertise: string;
    timestamp: number;
  }>) => {
    const { imageBlob, domainExpertise: insightDomainExpertise, timestamp } = event.detail;
    
    chatLogger.info("Received Image Insight request");
    
    if (loading) {
      chatLogger.warn("Image Insight - already loading, ignoring request");
      return;
    }

    setLoading(true);
    setProgressStage("uploading");

    try {
      const imageFile = new File([imageBlob], `frame_${timestamp}.jpg`, { type: "image/jpeg" });
      
      // Upload image to S3
      chatLogger.info("Image Insight - uploading to S3...");
      
      const urlResponse = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: imageFile.name,
          contentType: imageFile.type,
        }),
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { url: presignedUrl, downloadUrl, key: s3Key } = await urlResponse.json();
      chatLogger.info("Image Insight - got presigned URL, uploading...");

      // Upload to S3 using XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener("load", () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", imageFile.type);
        xhr.send(imageFile);
      });

      const s3Url = downloadUrl;
      chatLogger.info("Image Insight - image uploaded to S3:", s3Key);

      setProgressStage("analyzing");

      // Create image message
      const imageMessageId = generateMessageId();
      const imageMessage: Message = {
        id: imageMessageId,
        role: "user",
        content: "",
        videoUrl: s3Url,
        videoS3Key: s3Key,
      };
      addMessage(imageMessage);

      // Create text message
      const textMessageId = generateMessageId();
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: "Please analyse this moment in the video for me.",
      };
      addMessage(textMessage);

      setTimeout(() => scrollToBottom(), 100);

      // Add assistant placeholder message
      const assistantMessageId = generateMessageId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };
      addMessage(assistantMessage);

      // Send to LLM API
      const formData = new FormData();
      formData.append("prompt", "Analyze this frame from my sports video. The image shows my body position with pose detection overlay and joint angle measurements. Please provide detailed biomechanical feedback on my technique, body positioning, and the joint angles visible.");
      formData.append("videoUrl", s3Url);
      formData.append("promptType", "frame");
      formData.append("thinkingMode", "deep");
      formData.append("mediaResolution", "high");
      formData.append("domainExpertise", insightDomainExpertise);

      const response = await fetch("/api/llm", {
        method: "POST",
        body: formData,
        headers: {
          "x-stream": "true",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (reader) {
        let fullResponse = "";
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          updateMessage(assistantMessageId, { 
            content: stripStreamMetadata(fullResponse), 
            isStreaming: true 
          });
        }
        
        updateMessage(assistantMessageId, { 
          content: stripStreamMetadata(fullResponse), 
          isStreaming: false 
        });
        chatLogger.info("Image Insight complete, response length:", stripStreamMetadata(fullResponse).length);
      }

    } catch (error) {
      chatLogger.error("Image Insight error:", error);
      setApiError(error instanceof Error ? error.message : "Failed to analyze frame");
    } finally {
      setLoading(false);
      setProgressStage("idle");
    }
  }, [loading, addMessage, updateMessage, scrollToBottom, setLoading, setProgressStage, setApiError]);

  useEffect(() => {
    window.addEventListener("image-insight-request", handleImageInsightRequest as unknown as EventListener);
    
    return () => {
      window.removeEventListener("image-insight-request", handleImageInsightRequest as unknown as EventListener);
    };
  }, [handleImageInsightRequest]);
}

