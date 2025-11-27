import { useState, useCallback, useRef } from "react";
import type { ProgressStage, Message } from "@/types/chat";
import { getConversationContext, trimMessagesByTokens, formatMessagesForGemini } from "@/utils/context-utils";
import { uploadToS3 } from "@/lib/s3";
import { estimateTextTokens, estimateVideoTokens } from "@/lib/token-utils";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";

// Rough estimate for system prompt token count (server-side prompt is not exposed to client)
// This includes base system prompt + potential domain expertise enhancement
const ESTIMATED_SYSTEM_PROMPT_TOKENS = 500;

/**
 * Calculate thinking budget based on query complexity
 * Matches the server-side logic in lib/llm.ts
 */
function calculateThinkingBudget(
  thinkingMode: ThinkingMode,
  hasVideo: boolean,
  promptTokens: number,
  historyLength: number
): number {
  if (thinkingMode === "deep") {
    return 8192; // Always high for deep mode
  }
  
  // In fast mode, adapt based on query complexity
  if (hasVideo) {
    // Video analysis needs more thinking even in fast mode
    return 1024;
  } else if (promptTokens > 50 || historyLength > 5) {
    // Complex text queries benefit from moderate thinking
    // 50 tokens ≈ a detailed question or paragraph
    return 256;
  } else {
    // Simple queries need minimal thinking
    // <50 tokens = greetings, short questions
    return 64;
  }
}

interface UseAIApiOptions {
  onProgressUpdate?: (stage: ProgressStage, progress: number) => void;
}

export function useAIApi(options: UseAIApiOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendTextOnlyQuery = useCallback(
    async (
      prompt: string,
      assistantMessageId: string,
      updateMessage: (id: string, updates: Partial<Message>) => void,
      conversationHistory?: Message[],
      abortController?: AbortController,
      thinkingMode: ThinkingMode = "fast",
      mediaResolution: MediaResolution = "medium",
      domainExpertise: DomainExpertise = "all-sports"
    ): Promise<void> => {
      optionsRef.current.onProgressUpdate?.("generating", 0);

      const requestStartTime = Date.now();

      // Calculate input tokens for this request
      // Note: System prompt is constructed server-side and not exposed to client
      let inputTokens = ESTIMATED_SYSTEM_PROMPT_TOKENS + estimateTextTokens(prompt);
      
      // Add tokens from conversation history
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const historyTokens = conversationHistory.reduce(
          (sum, msg) => sum + estimateTextTokens(msg.content || ""),
          0
        );
        inputTokens += historyTokens;
      }

      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("thinkingMode", thinkingMode);
      formData.append("mediaResolution", mediaResolution);
      formData.append("domainExpertise", domainExpertise);

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

      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "x-stream": "true",
        },
        body: formData,
        signal: abortController?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let timeToFirstToken: number | undefined;

      if (reader) {
        try {
          // Mark as streaming when we start
          updateMessage(assistantMessageId, { isStreaming: true });
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // Capture time to first token on first chunk
            if (!timeToFirstToken && chunk.length > 0) {
              timeToFirstToken = Date.now() - requestStartTime;
            }
            
            accumulatedText += chunk;
            // Estimate output tokens as we accumulate text
            const outputTokens = estimateTextTokens(accumulatedText);
            updateMessage(assistantMessageId, { 
              content: accumulatedText,
              inputTokens: inputTokens,
              outputTokens: outputTokens,
              isStreaming: true, // Keep streaming flag active
            });
          }
          
          // Calculate duration and add settings after streaming completes
          const duration = Date.now() - requestStartTime;
          const promptTokens = estimateTextTokens(prompt);
          const historyLength = conversationHistory?.length || 0;
          const thinkingBudget = calculateThinkingBudget(thinkingMode, false, promptTokens, historyLength);
          
          updateMessage(assistantMessageId, {
            responseDuration: duration,
            timeToFirstToken: timeToFirstToken,
            isStreaming: false, // Mark as complete
            modelSettings: {
              thinkingMode,
              mediaResolution,
              domainExpertise,
              thinkingBudget,
            },
          });
        } catch (error) {
          // Also set streaming to false on error
          updateMessage(assistantMessageId, { isStreaming: false });
          // Handle abort errors gracefully
          if (error instanceof Error && error.name === "AbortError") {
            reader.cancel();
            throw error;
          }
          throw error;
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
      updateMessage: (id: string, updates: Partial<Message>) => void,
      setProgress: (progress: number) => void,
      setStage: (stage: ProgressStage) => void,
      conversationHistory?: Message[],
      onVideoUploaded?: (s3Url: string, s3Key: string) => void,
      abortController?: AbortController,
      thinkingMode: ThinkingMode = "fast",
      mediaResolution: MediaResolution = "medium",
      domainExpertise: DomainExpertise = "all-sports",
      needsServerConversion: boolean = false
    ): Promise<void> => {
      const requestStartTime = Date.now();
      
      // Check video size IMMEDIATELY before any upload - aligned with Gemini's 100MB limit
      const isVideo = videoFile.type.startsWith("video/");
      if (isVideo) {
        const sizeMB = videoFile.size / (1024 * 1024);
        const LARGE_VIDEO_LIMIT_MB = 100;
        
        if (sizeMB > LARGE_VIDEO_LIMIT_MB) {
          console.log(`[Client] Video size (${sizeMB.toFixed(2)} MB) exceeds limit, showing natural response immediately`);
          
          // Generate the natural response immediately without uploading
          const naturalResponse = `## 📹 Video Size Issue

I can see you've uploaded a video that's **${sizeMB.toFixed(1)} MB** in size. Unfortunately, that's quite large for me to process effectively - I work best with videos under **${LARGE_VIDEO_LIMIT_MB} MB**.

<details>
<summary>📊 Why This Matters</summary>

This size limitation helps ensure I can analyze your video thoroughly and provide you with detailed, accurate coaching insights. Larger files can cause processing issues and may not complete successfully.

Video analysis requires significant processing power, and keeping files under 100 MB ensures:
- Faster processing times
- More reliable analysis
- Better quality insights
- Consistent performance across different video types

</details>

<details>
<summary>💡 How to Fix This</summary>

Here are a few ways you can help me analyze your video:

**1. Trim the video**
- Focus on the most important moments or rallies you'd like me to review
- Even a 30-60 second clip can provide valuable insights!
- Most video editing apps allow you to easily cut specific sections

**2. Compress the video**
- Use a video compression tool to reduce the file size while maintaining good quality
- Many free tools are available online (e.g., HandBrake, Adobe Express, CloudConvert)
- Target a lower bitrate while keeping the resolution

**3. Adjust media resolution**
- You can change the media resolution setting to **Low** in the chat input below
- This helps me process larger videos more efficiently
- Low resolution is often sufficient for technique analysis

**4. Split into clips**
- Break your video into shorter segments and submit them separately
- I can analyze multiple clips and provide focused feedback on each
- This approach often leads to more detailed, actionable insights

</details>

---

I'm here to help you improve, so please feel free to try again with a smaller file. I'm excited to analyze your performance once you're ready! 🎾`;

          // Stream the response gradually for natural feel
          setStage("generating");
          setProgress(100);
          
          // Stream character by character with realistic typing speed
          let accumulatedText = "";
          const charsPerChunk = 3; // Characters to add per update
          const delayMs = 5; // Milliseconds between updates (realistic typing speed)
          
          for (let i = 0; i < naturalResponse.length; i += charsPerChunk) {
            const chunk = naturalResponse.slice(i, i + charsPerChunk);
            accumulatedText += chunk;
            
            updateMessage(assistantMessageId, { 
              content: accumulatedText,
              isVideoSizeLimitError: true, // Flag this as a size limit error
            });
            
            // Add delay for realistic typing effect
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // Final update with complete metadata
          const outputTokens = estimateTextTokens(naturalResponse);
          const promptTokens = estimateTextTokens(prompt);
          const historyLength = conversationHistory?.length || 0;
          const thinkingBudget = calculateThinkingBudget(thinkingMode, true, promptTokens, historyLength);
          
          updateMessage(assistantMessageId, { 
            content: naturalResponse,
            inputTokens: 0, // No API call made
            outputTokens: outputTokens,
            responseDuration: Date.now() - requestStartTime,
            isVideoSizeLimitError: true,
            modelSettings: {
              thinkingMode,
              mediaResolution,
              domainExpertise,
              thinkingBudget,
            },
          });
          
          // Exit early - no upload or API call needed
          return;
        }
      }
      
      // Calculate input tokens for this request
      // Note: System prompt is constructed server-side and not exposed to client
      let inputTokens = ESTIMATED_SYSTEM_PROMPT_TOKENS + estimateTextTokens(prompt);
      
      // Add video tokens
      const isImage = videoFile.type.startsWith("image/");
      let videoTokens: number;
      if (isImage) {
        // Images: base 257 tokens + ~85 tokens per 100KB
        const imageSizeKB = videoFile.size / 1024;
        videoTokens = 257 + Math.ceil((imageSizeKB / 100) * 85);
      } else {
        videoTokens = estimateVideoTokens(videoFile.size, videoFile.type);
      }
      inputTokens += videoTokens;
      
      // Add tokens from conversation history
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const historyTokens = conversationHistory.reduce(
          (sum, msg) => sum + estimateTextTokens(msg.content || ""),
          0
        );
        inputTokens += historyTokens;
      }
      
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
        const s3Key = key;

        console.log("[S3] ✅ Presigned URL received", {
          key: s3Key,
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
        }, abortController?.signal);

        console.log("[S3] ✅ File uploaded successfully to S3!", {
          s3Url: s3Url,
          s3Key: s3Key,
          fileName: videoFile.name,
        });

        // Notify that video has been uploaded with S3 URL and key
        if (onVideoUploaded) {
          onVideoUploaded(s3Url, s3Key);
        }

        setProgress(80);
        
        // Step 2.5: Convert video on server if needed (for Apple QuickTime/MOV on iOS)
        if (needsServerConversion) {
          console.log("[Convert] Starting server-side video conversion...");
          setStage("processing");
          updateMessage(assistantMessageId, { 
            content: "Converting video format for analysis...",
            isStreaming: true 
          });
          
          try {
            const convertResponse = await fetch("/api/convert-video", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ key: s3Key }),
              signal: abortController?.signal,
            });
            
            if (!convertResponse.ok) {
              const errorData = await convertResponse.json();
              console.error("[Convert] ❌ Conversion failed:", errorData);
              // Continue with original file - Gemini might still work
              console.log("[Convert] Proceeding with original file...");
            } else {
              const convertResult = await convertResponse.json();
              if (convertResult.success && convertResult.downloadUrl) {
                console.log("[Convert] ✅ Video converted successfully!", {
                  originalKey: s3Key,
                  convertedKey: convertResult.convertedKey,
                });
                // Update S3 URL to use converted file
                s3Url = convertResult.downloadUrl;
                // Update the video message with converted URL
                if (onVideoUploaded) {
                  onVideoUploaded(s3Url, convertResult.convertedKey);
                }
              }
            }
          } catch (convertError) {
            if ((convertError as Error).name === "AbortError") {
              throw convertError; // Re-throw abort errors
            }
            console.error("[Convert] ❌ Conversion error:", convertError);
            // Continue with original file
            console.log("[Convert] Proceeding with original file...");
          }
          
          // Clear the "converting" message
          updateMessage(assistantMessageId, { content: "", isStreaming: true });
        }
        
        // Step 3: Send S3 URL to Gemini API - backend will download it efficiently
        setStage("processing");
        console.log("[S3] Sending S3 URL to AI API (backend will download)...", {
          s3Url: s3Url,
          promptLength: prompt.length,
        });

        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("videoUrl", s3Url);
        formData.append("thinkingMode", thinkingMode);
        formData.append("mediaResolution", mediaResolution);
        formData.append("domainExpertise", domainExpertise);

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

        console.log("[AI API] Sending request to /api/llm with S3 URL...");
        let res: Response;
        try {
          res = await fetch("/api/llm", {
            method: "POST",
            headers: {
              "x-stream": "true",
            },
            body: formData,
            signal: abortController?.signal,
          });
          console.log("[AI API] Response received:", {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
            hasBody: !!res.body,
          });
        } catch (fetchError) {
          console.error("[AI API] ❌ Fetch error:", fetchError);
          throw fetchError;
        }

        setProgress(90);
        setStage("analyzing");

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[AI API] ❌ Request failed:", {
            status: res.status,
            statusText: res.statusText,
            errorText,
          });
          throw new Error(errorText || "Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let timeToFirstToken: number | undefined;

        if (!reader) {
          console.error("[AI API] ❌ Response body is null or undefined");
          throw new Error("Response body is null");
        }

        console.log("[AI API] Starting to read stream...");
        try {
          // Mark as streaming when we start
          updateMessage(assistantMessageId, { isStreaming: true });
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("[AI API] Stream completed. Total length:", accumulatedText.length);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            
            // Capture time to first token on first chunk
            if (!timeToFirstToken && chunk.length > 0) {
              timeToFirstToken = Date.now() - requestStartTime;
            }
            
            accumulatedText += chunk;
            console.log("[AI API] Received chunk:", {
              chunkLength: chunk.length,
              totalLength: accumulatedText.length,
              preview: chunk.substring(0, 50),
            });
            // Estimate output tokens as we accumulate text
            const outputTokens = estimateTextTokens(accumulatedText);
            updateMessage(assistantMessageId, { 
              content: accumulatedText,
              inputTokens: inputTokens,
              outputTokens: outputTokens,
              isStreaming: true, // Keep streaming flag active
            });
          }
            
          // Calculate duration and add settings after streaming completes
          const duration = Date.now() - requestStartTime;
          const promptTokens = estimateTextTokens(prompt);
          const historyLength = conversationHistory?.length || 0;
          const thinkingBudget = calculateThinkingBudget(thinkingMode, true, promptTokens, historyLength);
          
          updateMessage(assistantMessageId, {
            responseDuration: duration,
            timeToFirstToken: timeToFirstToken,
            isStreaming: false, // Mark as complete
            modelSettings: {
              thinkingMode,
              mediaResolution,
              domainExpertise,
              thinkingBudget,
            },
          });
        } catch (error) {
          // Also set streaming to false on error
          updateMessage(assistantMessageId, { isStreaming: false });
          // Handle abort errors gracefully
          if (error instanceof Error && error.name === "AbortError") {
            reader.cancel();
            throw error;
          }
          throw error;
        }
      } catch (error) {
        // Check if this is an error from the S3 upload phase or from the API call phase
        // If we got past S3 upload, this is likely an API error, not an S3 error
        const isS3UploadError = error instanceof Error && 
          (error.message.includes("S3") || error.message.includes("upload") || error.message.includes("presigned"));
        
        if (isS3UploadError) {
          // If S3 upload fails, log the error and check if we should fall back
          console.error("[S3] ❌ S3 upload failed:", error);
          console.error("[S3] Error details:", {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            errorStack: error instanceof Error ? error.stack : undefined,
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
        } else {
          // This is an API error, not an S3 error - rethrow it
          console.error("[AI API] ❌ API call failed:", error);
          console.error("[AI API] Error details:", {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            errorStack: error instanceof Error ? error.stack : undefined,
          });
          throw error;
        }

        // Fall back to direct upload with streaming
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("video", videoFile);
        formData.append("thinkingMode", thinkingMode);
        formData.append("mediaResolution", mediaResolution);
        formData.append("domainExpertise", domainExpertise);

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
        const res = await fetch("/api/llm", {
          method: "POST",
          headers: {
            "x-stream": "true",
          },
          body: formData,
          signal: abortController?.signal,
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
        let timeToFirstToken: number | undefined;

        if (reader) {
          try {
            // Mark as streaming when we start
            updateMessage(assistantMessageId, { isStreaming: true });
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              
              // Capture time to first token on first chunk
              if (!timeToFirstToken && chunk.length > 0) {
                timeToFirstToken = Date.now() - requestStartTime;
              }
              
              accumulatedText += chunk;
              // Estimate output tokens as we accumulate text
              const outputTokens = estimateTextTokens(accumulatedText);
              updateMessage(assistantMessageId, { 
                content: accumulatedText,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                isStreaming: true, // Keep streaming flag active
              });
            }
            
            // Calculate duration and add settings after streaming completes (fallback path)
            const duration = Date.now() - requestStartTime;
            const promptTokens = estimateTextTokens(prompt);
            const historyLength = conversationHistory?.length || 0;
            const thinkingBudget = calculateThinkingBudget(thinkingMode, true, promptTokens, historyLength);
            
            updateMessage(assistantMessageId, {
              responseDuration: duration,
              timeToFirstToken: timeToFirstToken,
              isStreaming: false, // Mark as complete
              modelSettings: {
                thinkingMode,
                mediaResolution,
                domainExpertise,
                thinkingBudget,
              },
            });
          } catch (error) {
            // Also set streaming to false on error
            updateMessage(assistantMessageId, { isStreaming: false });
            // Handle abort errors gracefully
            if (error instanceof Error && error.name === "AbortError") {
              reader.cancel();
              throw error;
            }
            throw error;
          }
        }
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

