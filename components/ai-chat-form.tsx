"use client";

import { useState, useEffect, useRef } from "react";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useAIChat } from "@/hooks/useAIChat";
import { useAIApi } from "@/hooks/useAIApi";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { useAuth } from "@/components/auth/AuthProvider";
import { MessageList } from "@/components/chat/messages/MessageList";
import { ChatInput } from "@/components/chat/input/ChatInput";
import { ChatHeader } from "@/components/chat/header/ChatHeader";
import { DragOverlay } from "@/components/chat/overlays/DragOverlay";
import { ScrollToBottom } from "@/components/chat/navigation/ScrollToBottom";
import { ScrollToVideo } from "@/components/chat/navigation/ScrollToVideo";
import { AudioStopButton } from "@/components/chat/input/AudioStopButton";
// VideoCompatibilityModal removed - now auto-converting HEVC videos
import { ErrorToast } from "@/components/ui/Toast";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";
import { FloatingVideoProvider } from "@/components/chat/viewers/FloatingVideoContext";
import { FloatingVideoPortal } from "@/components/chat/viewers/FloatingVideoPortal";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { StarterPrompts } from "@/components/StarterPrompts";
import { PICKLEBALL_COACH_PROMPT, type StarterPromptConfig } from "@/utils/prompts";
import { type ThinkingMode, type MediaResolution, type DomainExpertise, generateAIChatTitle, updateChatSettings } from "@/utils/storage";
import { getCurrentChatId, setCurrentChatId, createNewChat, updateExistingChat, loadChat } from "@/utils/storage-unified";
import type { Message, VideoPreAnalysis } from "@/types/chat";
import { estimateTextTokens, estimateVideoTokens } from "@/lib/token-utils";
import { uploadToS3 } from "@/lib/s3";
import { getMediaType, downloadVideoFromUrl, extractFirstFrame, extractFirstFrameFromUrl, extractFirstFrameWithDuration, isImageFile, uploadThumbnailToS3, estimateProAnalysisTime } from "@/utils/video-utils";
import {
  sharedSwings,
  tennisSwings,
  pickleballSwings,
  padelSwings,
  sharedTerminology,
  tennisTerminology,
  pickleballTerminology,
  padelTerminology,
  sharedTechnique,
  tennisCourts,
  pickleballCourts,
  padelCourts,
} from "@/database";

/**
 * Generate a UUID v4 for message IDs (Supabase compatible)
 */
function generateMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Strip stream metadata from response text
 * The API sends metadata at the end of streams prefixed with __STREAM_META__
 */
function stripStreamMetadata(text: string): string {
  const metaIndex = text.indexOf("__STREAM_META__");
  if (metaIndex !== -1) {
    return text.slice(0, metaIndex);
  }
  return text;
}

export function AIChatForm() {
  const [authKey, setAuthKey] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("fast");
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>("medium");
  const [domainExpertise, setDomainExpertise] = useState<DomainExpertise>("all-sports");
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = useState<number>(1.0);
  const [poseData, setPoseData] = useState<StarterPromptConfig["poseSettings"] | undefined>(undefined);
  const [showingVideoSizeError, setShowingVideoSizeError] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  // Video sport auto-detection state
  const [videoSportDetected, setVideoSportDetected] = useState<DomainExpertise | null>(null);
  const [isDetectingSport, setIsDetectingSport] = useState(false);
  // Video URL detection state (when user pastes a video URL instead of uploading)
  const [detectedVideoUrl, setDetectedVideoUrl] = useState<string | null>(null);
  // Video pre-analysis state (sport detection, camera angle, PRO eligibility)
  const [videoPreAnalysis, setVideoPreAnalysis] = useState<VideoPreAnalysis | null>(null);
  const lastAnalyzedUrlRef = useRef<string | null>(null);
  const isAnalyzingUrlRef = useRef(false); // Track if URL analysis is in progress
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastDetectedVideoRef = useRef<File | null>(null);
  const { isCollapsed: isSidebarCollapsed, isInitialLoad: isSidebarInitialLoad } = useSidebar();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const {
    videoFile,
    videoPreview,
    error: videoError,
    setError: setVideoError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
    // Server-side conversion flag (for HEVC/Apple QuickTime)
    needsServerConversion,
  } = useVideoUpload();

  const {
    messages,
    loading,
    progressStage,
    uploadProgress,
    messagesEndRef,
    setLoading,
    setProgressStage,
    setUploadProgress,
    scrollToBottom,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    isHydrated,
  } = useAIChat();

  const {
    error: apiError,
    setError: setApiError,
    sendTextOnlyQuery,
    sendVideoQuery,
  } = useAIApi({
    onProgressUpdate: (stage, progress) => {
      setProgressStage(stage);
      setUploadProgress(progress);
    },
  });

  const { confirmNavigation, dialogOpen, handleConfirm, handleCancel } = useNavigationWarning({
    isLoading: loading,
    progressStage,
  });

  const { isDragging, hasJustDropped, handlers: dragHandlers } = useDragAndDrop({
    onFileDrop: (file) => {
      processVideoFile(file);
    },
    onError: (error) => {
      setVideoError(error);
    },
  });

  // Load settings from current chat after hydration
  useEffect(() => {
    if (isHydrated) {
      (async () => {
        const currentChatId = getCurrentChatId();
        if (currentChatId) {
          const chatData = await loadChat(currentChatId);
          if (chatData) {
            // Restore settings from chat, fallback to hardcoded defaults
            setThinkingMode(chatData.thinkingMode ?? "fast");
            setMediaResolution(chatData.mediaResolution ?? "medium");
            setDomainExpertise(chatData.domainExpertise ?? "all-sports");
            return;
          }
        }
        // No chat found, use hardcoded defaults (no global settings)
        setThinkingMode("fast");
        setMediaResolution("medium");
        setDomainExpertise("all-sports");
      })();
    }
  }, [isHydrated]);

  // Intelligent preloading: When user uploads a video, preload pose detection components
  // This ensures they're ready if user wants to use pose detection, with zero perceived delay
  useEffect(() => {
    if (videoFile) {
      // Preload in background while user is reviewing the video or typing
      import("@/components/chat/viewers/VideoPoseViewer");
      import("@/components/chat/viewers/Pose3DViewer");
    }
  }, [videoFile]);

  // Ensure there's always a chat - create one on mount if none exists
  useEffect(() => {
    if (isHydrated) {
      const currentChatId = getCurrentChatId();
      if (!currentChatId) {
        console.log("[AIChatForm] No chat exists, creating default chat");
        createNewChat([], undefined).then((newChat) => {
          setCurrentChatId(newChat.id);
          console.log("[AIChatForm] Created default chat:", newChat.id, "with settings:", {
            thinkingMode: newChat.thinkingMode,
            mediaResolution: newChat.mediaResolution,
            domainExpertise: newChat.domainExpertise,
          });
          // Explicitly set settings from the new chat (which has hardcoded defaults)
          setThinkingMode(newChat.thinkingMode ?? "fast");
          setMediaResolution(newChat.mediaResolution ?? "medium");
          setDomainExpertise(newChat.domainExpertise ?? "all-sports");
        });
      } else {
        console.log("[AIChatForm] Using existing chat:", currentChatId);
      }
    }
  }, [isHydrated]);

  // Restore settings when switching chats
  useEffect(() => {
    if (!isHydrated) return;

    const handleChatChange = async () => {
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        const chatData = await loadChat(currentChatId);
        if (chatData) {
          console.log("[AIChatForm] Chat changed, restoring settings:", {
            chatId: currentChatId,
            thinkingMode: chatData.thinkingMode,
            mediaResolution: chatData.mediaResolution,
            domainExpertise: chatData.domainExpertise,
          });
          // Restore settings from the chat (with hardcoded defaults as fallback)
          setThinkingMode(chatData.thinkingMode ?? "fast");
          setMediaResolution(chatData.mediaResolution ?? "medium");
          setDomainExpertise(chatData.domainExpertise ?? "all-sports");
        } else {
          // Chat not found, reset to defaults
          console.log("[AIChatForm] Chat not found, resetting to defaults");
          setThinkingMode("fast");
          setMediaResolution("medium");
          setDomainExpertise("all-sports");
        }
      }
    };

    const handleAuthChange = () => {
      console.log("[AIChatForm] Auth state changed, forcing re-render");
      setAuthKey(prev => prev + 1);
    };

    // Listen for chat changes (triggered when new chat is created or chat is switched)
    window.addEventListener("chat-storage-change", handleChatChange);
    window.addEventListener("auth-state-change", handleAuthChange);
    
    return () => {
      window.removeEventListener("chat-storage-change", handleChatChange);
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, [isHydrated]);

  // Handle Image Insight requests from VideoPoseViewer
  useEffect(() => {
    const handleImageInsightRequest = async (event: CustomEvent<{
      imageBlob: Blob;
      domainExpertise: string;
      timestamp: number;
    }>) => {
      const { imageBlob, domainExpertise: insightDomainExpertise, timestamp } = event.detail;
      
      console.log("📸 [AIChatForm] Received Image Insight request");
      
      // Don't process if already loading
      if (loading) {
        console.warn("[AIChatForm] Already loading, ignoring Image Insight request");
        return;
      }

      setLoading(true);
      setProgressStage("uploading");

      try {
        // Convert blob to File for S3 upload
        const imageFile = new File([imageBlob], `frame_${timestamp}.jpg`, { type: "image/jpeg" });
        
        // Step 1: Upload image to S3
        console.log("[Image Insight] Uploading image to S3...");
        
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
        console.log("[Image Insight] ✅ Got presigned URL, uploading...");

        // Upload to S3 using XHR (from lib/s3.ts pattern)
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
        console.log("[Image Insight] ✅ Image uploaded to S3:", s3Key);

        setProgressStage("analyzing");

        // Create two separate messages like video uploads:
        // 1. First message: image only (in its own frame)
        const imageMessageId = generateMessageId();
        const imageMessage: Message = {
          id: imageMessageId,
          role: "user",
          content: "",  // Empty content - image only
          videoUrl: s3Url,      // S3 URL for display
          videoS3Key: s3Key,    // S3 key for persistence
        };
        addMessage(imageMessage);
        console.log("[AIChatForm] Added Image Insight image message:", imageMessageId);

        // 2. Second message: text only (as user dialog bubble)
        const textMessageId = generateMessageId();
        const textMessage: Message = {
          id: textMessageId,
          role: "user",
          content: "Please analyse this moment in the video for me.",
        };
        addMessage(textMessage);
        console.log("[AIChatForm] Added Image Insight text message:", textMessageId);

        // Scroll to bottom
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

        // Create form data for the API - send S3 URL instead of blob
        const formData = new FormData();
        formData.append("prompt", "Analyze this frame from my sports video. The image shows my body position with pose detection overlay and joint angle measurements. Please provide detailed biomechanical feedback on my technique, body positioning, and the joint angles visible.");
        formData.append("videoUrl", s3Url);  // Use S3 URL
        formData.append("promptType", "frame");
        formData.append("thinkingMode", "deep");
        formData.append("mediaResolution", "high");
        formData.append("domainExpertise", insightDomainExpertise);

        // Send to LLM API with streaming
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
            
            // Update the assistant message with streamed content (strip metadata)
            updateMessage(assistantMessageId, { content: stripStreamMetadata(fullResponse), isStreaming: true });
          }
          
          // Mark streaming as complete (strip any metadata from final content)
          updateMessage(assistantMessageId, { content: stripStreamMetadata(fullResponse), isStreaming: false });
          console.log("✅ [AIChatForm] Image Insight complete, response length:", stripStreamMetadata(fullResponse).length);
        }

      } catch (error) {
        console.error("❌ [AIChatForm] Image Insight error:", error);
        setApiError(error instanceof Error ? error.message : "Failed to analyze frame");
      } finally {
        setLoading(false);
        setProgressStage("idle");
      }
    };

    window.addEventListener("image-insight-request", handleImageInsightRequest as unknown as EventListener);
    
    return () => {
      window.removeEventListener("image-insight-request", handleImageInsightRequest as unknown as EventListener);
    };
  }, [loading, addMessage, updateMessage, scrollToBottom, setLoading, setProgressStage, setApiError]);

  // Auto-populate prompt when video is added and prompt is empty
  useEffect(() => {
    if (videoFile && !prompt.trim()) {
      const mediaType = getMediaType(videoFile);
      setPrompt(`Please analyse this ${mediaType} for me.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]); // Only depend on videoFile to avoid loops

  // Auto-detect sport and eligibility from video first frame (for uploaded files)
  useEffect(() => {
    // Skip if no video, already detecting, or same video as last detection
    if (!videoFile || isDetectingSport || videoFile === lastDetectedVideoRef.current) {
      // Clear pre-analysis if video file is removed (but NOT if we have a URL - that has its own analysis)
      if (!videoFile && videoPreAnalysis && !detectedVideoUrl) {
        setVideoPreAnalysis(null);
      }
      return;
    }
    
    // Skip for images - they don't need eligibility detection
    if (isImageFile(videoFile)) {
      return;
    }
    
    // Mark this video as being processed
    lastDetectedVideoRef.current = videoFile;
    
    const analyzeVideoFile = async () => {
      setIsDetectingSport(true);
      setVideoSportDetected(null);
      
      // Set analyzing state
      setVideoPreAnalysis({
        sport: "other",
        cameraAngle: "other",
        fullCourtVisible: false,
        confidence: 0,
        isProEligible: false,
        isAnalyzing: true,
      });
      
      try {
        console.log("[VideoFileAnalysis] Extracting first frame and duration from video...");
        const { frameBlob, durationSeconds } = await extractFirstFrameWithDuration(videoFile, 640, 0.7);
        
        if (!frameBlob) {
          console.log("[VideoFileAnalysis] Failed to extract frame");
          setVideoPreAnalysis({
            sport: "other",
            cameraAngle: "other",
            fullCourtVisible: false,
            confidence: 0,
            isProEligible: false,
            isAnalyzing: false,
            proEligibilityReason: "Could not extract frame from video",
            durationSeconds: durationSeconds,
            isTechniqueLiteEligible: false,
            techniqueLiteEligibilityReason: "Could not analyze video.",
          });
          return;
        }
        
        console.log("[VideoFileAnalysis] Frame extracted, duration:", durationSeconds, "s, sending to eligibility API...");
        
        // Upload thumbnail to S3 in parallel with eligibility analysis
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;
        
        const uploadThumbnail = async () => {
          const result = await uploadThumbnailToS3(frameBlob);
          if (result) {
            thumbnailUrl = result.thumbnailUrl;
            thumbnailS3Key = result.thumbnailS3Key;
          }
        };
        
        // Send to eligibility analysis API
        const formData = new FormData();
        formData.append("image", frameBlob, "frame.jpg");
        
        // Run eligibility analysis and thumbnail upload in parallel
        const [response] = await Promise.all([
          fetch("/api/analyze-video-eligibility", {
            method: "POST",
            body: formData,
          }),
          uploadThumbnail(),
        ]);
        
        if (!response.ok) {
          throw new Error("Eligibility analysis API failed");
        }
        
        const data = await response.json();
        console.log("[VideoFileAnalysis] Analysis result:", data);
        
        // Calculate Technique LITE eligibility (ground-level camera + < 20 seconds)
        // Ground-level angles: side, ground_behind, diagonal (not elevated_back_court or overhead)
        const isGroundLevelCamera = ["side", "ground_behind", "diagonal"].includes(data.cameraAngle);
        const isTechniqueLiteEligible = 
          isGroundLevelCamera && 
          durationSeconds !== null && 
          durationSeconds < 20;
        
        console.log("[VideoFileAnalysis] Technique LITE check:", {
          cameraAngle: data.cameraAngle,
          isGroundLevelCamera,
          durationSeconds,
          isTechniqueLiteEligible,
        });
        
        let techniqueLiteEligibilityReason: string | undefined;
        if (isTechniqueLiteEligible) {
          techniqueLiteEligibilityReason = "Perfect for technique analysis! Ground-level camera with short clip.";
        } else if (!isGroundLevelCamera) {
          techniqueLiteEligibilityReason = "Technique LITE requires a ground-level camera angle (side, behind, or diagonal).";
        } else if (durationSeconds === null || durationSeconds >= 20) {
          techniqueLiteEligibilityReason = "Technique LITE requires videos under 20 seconds.";
        }
        
        // Update pre-analysis state with thumbnail info
        setVideoPreAnalysis({
          sport: data.sport,
          cameraAngle: data.cameraAngle,
          fullCourtVisible: data.fullCourtVisible,
          confidence: data.confidence,
          isProEligible: data.isProEligible,
          proEligibilityReason: data.proEligibilityReason,
          isAnalyzing: false,
          durationSeconds: durationSeconds,
          isTechniqueLiteEligible,
          techniqueLiteEligibilityReason,
          thumbnailUrl,
          thumbnailS3Key,
        });
        
        // Also update domain expertise if a specific sport was detected
        if (data.sport !== "other" && data.sport !== domainExpertise) {
          setDomainExpertise(data.sport);
          const currentChatId = getCurrentChatId();
          if (currentChatId) {
            updateChatSettings(currentChatId, { domainExpertise: data.sport });
          }
          
          // Signal glow effect
          setVideoSportDetected(data.sport);
          setTimeout(() => setVideoSportDetected(null), 2500);
        }
        
      } catch (err) {
        console.error("[VideoFileAnalysis] Failed:", err);
        setVideoPreAnalysis({
          sport: "other",
          cameraAngle: "other",
          fullCourtVisible: false,
          confidence: 0,
          isProEligible: false,
          isAnalyzing: false,
          proEligibilityReason: "Analysis failed",
          isTechniqueLiteEligible: false,
          techniqueLiteEligibilityReason: "Analysis failed.",
        });
      } finally {
        setIsDetectingSport(false);
      }
    };
    
    analyzeVideoFile();
  }, [videoFile, isDetectingSport, domainExpertise, videoPreAnalysis, detectedVideoUrl]);

  // Auto-detect sport and PRO eligibility from pasted video URL
  useEffect(() => {
    // Skip if no URL
    if (!detectedVideoUrl) {
      // Clear pre-analysis if URL is removed (but NOT if we have a video file - that has its own analysis)
      // Use a callback to read current state without adding to deps
      setVideoPreAnalysis(prev => {
        if (prev && !videoFile) {
          console.log("[VideoUrlAnalysis] Clearing - URL removed");
          return null;
        }
        return prev;
      });
      // Reset the ref so the same URL can be re-analyzed if pasted again
      lastAnalyzedUrlRef.current = null;
      isAnalyzingUrlRef.current = false;
      return;
    }
    
    // Skip if already analyzing
    if (isAnalyzingUrlRef.current) {
      console.log("[VideoUrlAnalysis] Skipping - already analyzing");
      return;
    }
    
    // Skip if same URL as last analysis
    if (detectedVideoUrl === lastAnalyzedUrlRef.current) {
      console.log("[VideoUrlAnalysis] Skipping - same URL as last analysis");
      return;
    }
    
    lastAnalyzedUrlRef.current = detectedVideoUrl;
    isAnalyzingUrlRef.current = true;
    console.log("[VideoUrlAnalysis] Starting analysis for URL:", detectedVideoUrl);
    
    const analyzeVideoUrl = async () => {
      // Set analyzing state
      setVideoPreAnalysis({
        sport: "other",
        cameraAngle: "other",
        fullCourtVisible: false,
        confidence: 0,
        isProEligible: false,
        isAnalyzing: true,
      });
      
      try {
        console.log("[VideoUrlAnalysis] Analyzing video URL:", detectedVideoUrl);
        
        // Try to extract first frame and duration client-side
        const { frameBlob, durationSeconds } = await extractFirstFrameFromUrl(detectedVideoUrl, 640, 0.7);
        
        if (!frameBlob) {
          console.log("[VideoUrlAnalysis] Client-side extraction failed (CORS), using fallback analysis");
          // For now, just set as unknown - we'll analyze when user submits
          // In future: could add server-side frame extraction
          setVideoPreAnalysis({
            sport: "other",
            cameraAngle: "other",
            fullCourtVisible: false,
            confidence: 0,
            isProEligible: false,
            isAnalyzing: false,
            proEligibilityReason: "Could not preview video due to access restrictions",
            durationSeconds: durationSeconds, // May have duration even if frame extraction failed
            isTechniqueLiteEligible: false,
            techniqueLiteEligibilityReason: "Could not analyze video due to access restrictions.",
          });
          return;
        }
        
        console.log("[VideoUrlAnalysis] Frame extracted, duration:", durationSeconds, "s, sending to eligibility API...");
        
        // Upload thumbnail to S3 in parallel with eligibility analysis
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;
        
        const uploadThumbnail = async () => {
          try {
            console.log("[VideoUrlAnalysis] Uploading thumbnail to S3...");
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
              console.warn("[VideoUrlAnalysis] Failed to get upload URL for thumbnail");
              return;
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
            
            thumbnailUrl = downloadUrl;
            thumbnailS3Key = s3Key;
            console.log("[VideoUrlAnalysis] ✅ Thumbnail uploaded to S3:", s3Key);
          } catch (err) {
            console.warn("[VideoUrlAnalysis] Thumbnail upload failed (non-blocking):", err);
          }
        };
        
        // Send to eligibility analysis API
        const formData = new FormData();
        formData.append("image", frameBlob, "frame.jpg");
        
        // Run eligibility analysis and thumbnail upload in parallel
        const [response] = await Promise.all([
          fetch("/api/analyze-video-eligibility", {
            method: "POST",
            body: formData,
          }),
          uploadThumbnail(),
        ]);
        
        if (!response.ok) {
          throw new Error("Eligibility analysis API failed");
        }
        
        const data = await response.json();
        console.log("[VideoUrlAnalysis] Analysis result:", data);
        
        // Calculate Technique LITE eligibility (ground-level camera + < 20 seconds)
        // Ground-level angles: side, ground_behind, diagonal (not elevated_back_court or overhead)
        const isGroundLevelCamera = ["side", "ground_behind", "diagonal"].includes(data.cameraAngle);
        const isTechniqueLiteEligible = 
          isGroundLevelCamera && 
          durationSeconds !== null && 
          durationSeconds < 20;
        
        console.log("[VideoUrlAnalysis] Technique LITE check:", {
          cameraAngle: data.cameraAngle,
          isGroundLevelCamera,
          durationSeconds,
          isTechniqueLiteEligible,
        });
        
        let techniqueLiteEligibilityReason: string | undefined;
        if (isTechniqueLiteEligible) {
          techniqueLiteEligibilityReason = "Perfect for technique analysis! Ground-level camera with short clip.";
        } else if (!isGroundLevelCamera) {
          techniqueLiteEligibilityReason = "Technique LITE requires a ground-level camera angle (side, behind, or diagonal).";
        } else if (durationSeconds === null || durationSeconds >= 20) {
          techniqueLiteEligibilityReason = "Technique LITE requires videos under 20 seconds.";
        }
        
        // Update pre-analysis state with thumbnail info
        setVideoPreAnalysis({
          sport: data.sport,
          cameraAngle: data.cameraAngle,
          fullCourtVisible: data.fullCourtVisible,
          confidence: data.confidence,
          isProEligible: data.isProEligible,
          proEligibilityReason: data.proEligibilityReason,
          isAnalyzing: false,
          durationSeconds: durationSeconds,
          isTechniqueLiteEligible,
          techniqueLiteEligibilityReason,
          thumbnailUrl,
          thumbnailS3Key,
        });
        
        // Also update domain expertise if a specific sport was detected
        if (data.sport !== "other" && data.sport !== domainExpertise) {
          setDomainExpertise(data.sport);
          const currentChatId = getCurrentChatId();
          if (currentChatId) {
            updateChatSettings(currentChatId, { domainExpertise: data.sport });
          }
          
          // Signal glow effect
          setVideoSportDetected(data.sport);
          setTimeout(() => setVideoSportDetected(null), 2500);
        }
        
        isAnalyzingUrlRef.current = false;
        
      } catch (err) {
        console.error("[VideoUrlAnalysis] Failed:", err);
        setVideoPreAnalysis({
          sport: "other",
          cameraAngle: "other",
          fullCourtVisible: false,
          confidence: 0,
          isProEligible: false,
          isAnalyzing: false,
          proEligibilityReason: "Analysis failed",
          isTechniqueLiteEligible: false,
          techniqueLiteEligibilityReason: "Analysis failed.",
        });
        isAnalyzingUrlRef.current = false;
      }
    };
    
    analyzeVideoUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedVideoUrl, videoFile]);

  const error = videoError || apiError;

  // Note: Removed auto-scroll to bottom on initial load to preserve scroll position on refresh

  // Only auto-scroll if shouldAutoScroll is true (disabled during response generation)
  // Also don't auto-scroll if the last message is a video size limit error
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isVideoSizeLimitError = lastMessage?.isVideoSizeLimitError;
    
    if (shouldAutoScroll && !isVideoSizeLimitError) {
      scrollToBottom();
    }
    
    // Update showingVideoSizeError based on whether last message is a size error
    // This keeps the state in sync with the actual messages
    if (isVideoSizeLimitError !== showingVideoSizeError) {
      setShowingVideoSizeError(!!isVideoSizeLimitError);
    }
  }, [messages, scrollToBottom, shouldAutoScroll, showingVideoSizeError]);

  // Generate AI title after first exchange completes
  useEffect(() => {
    if (!isHydrated) return;
    
    // Only generate title for first exchange (user + assistant)
    // Note: might be multiple user messages if video + text were sent separately
    const userMessages = messages.filter(m => m.role === "user");
    const assistantMessages = messages.filter(m => m.role === "assistant");
    
    // Check if we have at least one user message and exactly one assistant message
    // And the assistant message is complete (we're not loading anymore)
    if (userMessages.length >= 1 && 
        assistantMessages.length === 1 && 
        assistantMessages[0].content.trim().length > 0 &&
        !loading) { 
      
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        // Check if title is still the default/generated one (not manually edited)
        (async () => {
          const chat = await loadChat(currentChatId);
          const firstUserContent = userMessages[0].content.trim().slice(0, 50);
          
          // Only regenerate if title looks auto-generated (matches "New Chat", "Video Analysis", or starts with user content)
          if (chat && (chat.title === "New Chat" || chat.title === "Video Analysis" || (firstUserContent && chat.title.startsWith(firstUserContent)))) {
            // Generate title asynchronously (don't block UI)
            generateAIChatTitle(messages).then(title => {
              // Double-check chat hasn't changed
              const stillCurrentChatId = getCurrentChatId();
              if (stillCurrentChatId === currentChatId) {
                updateExistingChat(currentChatId, { title }, false);
              }
            }).catch(error => {
              console.error("Failed to generate AI title:", error);
            });
          }
        })();
      }
    }
  }, [messages, isHydrated, loading]);

  const handlePickleballCoachPrompt = () => {
    setPrompt(PICKLEBALL_COACH_PROMPT);
  };

  const handleStarterPromptSelect = async (
    prompt: string, 
    videoUrl: string,
    settings?: {
      thinkingMode?: ThinkingMode;
      mediaResolution?: MediaResolution;
      domainExpertise?: DomainExpertise;
      playbackSpeed?: number;
      poseSettings?: StarterPromptConfig["poseSettings"];
    }
  ) => {
    try {
      setVideoError(null);
      
      // Apply settings if provided
      if (settings) {
        const currentChatId = getCurrentChatId();
        const chatSettingsToUpdate: {
          thinkingMode?: ThinkingMode;
          mediaResolution?: MediaResolution;
          domainExpertise?: DomainExpertise;
        } = {};

        if (settings.thinkingMode) {
          setThinkingMode(settings.thinkingMode);
          chatSettingsToUpdate.thinkingMode = settings.thinkingMode;
        }
        if (settings.mediaResolution) {
          setMediaResolution(settings.mediaResolution);
          chatSettingsToUpdate.mediaResolution = settings.mediaResolution;
        }
        if (settings.domainExpertise) {
          setDomainExpertise(settings.domainExpertise);
          chatSettingsToUpdate.domainExpertise = settings.domainExpertise;
        }
        if (settings.playbackSpeed !== undefined) {
          setVideoPlaybackSpeed(settings.playbackSpeed);
        }
        if (settings.poseSettings) {
          setPoseData(settings.poseSettings);
        } else {
          setPoseData(undefined);
        }

        // Update chat settings
        if (currentChatId && Object.keys(chatSettingsToUpdate).length > 0) {
          updateChatSettings(currentChatId, chatSettingsToUpdate);
        }
      }
      
      // Load the video first
      const videoFile = await downloadVideoFromUrl(videoUrl);
      processVideoFile(videoFile);
      // Then set the prompt
      setPrompt(prompt);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load demo video";
      setVideoError(errorMessage);
      // Still set the prompt even if video loading fails
      setPrompt(prompt);
      throw error;
    }
  };

  // Wrapper functions to update both state and current chat settings
  const handleThinkingModeChange = (mode: ThinkingMode) => {
    setThinkingMode(mode);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { thinkingMode: mode });
    }
  };

  const handleMediaResolutionChange = (resolution: MediaResolution) => {
    setMediaResolution(resolution);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { mediaResolution: resolution });
    }
  };

  const handleDomainExpertiseChange = (expertise: DomainExpertise) => {
    setDomainExpertise(expertise);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { domainExpertise: expertise });
    }
  };

  const handleClearConversation = () => {
    clearMessages();
    setPrompt("");
    clearVideo();
    setVideoError(null);
    setApiError(null);
    setPoseData(undefined);
    setShowingVideoSizeError(false);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgressStage("idle");
    setUploadProgress(0);
    setShowingVideoSizeError(false);
  };

  /**
   * Retry handler for incomplete/failed messages.
   * Finds the previous user message and regenerates the assistant response.
   */
  const handleRetryMessage = async (assistantMessageId: string) => {
    if (loading || retryingMessageId) return;
    
    // Find the assistant message to retry
    const assistantMessageIndex = messages.findIndex(m => m.id === assistantMessageId);
    if (assistantMessageIndex === -1) {
      console.error("[AIChatForm] Cannot find assistant message to retry:", assistantMessageId);
      return;
    }
    
    // Find the previous user message(s) - look backwards until we find user messages
    let userPrompt = "";
    let userVideoUrl: string | null = null;
    let userVideoS3Key: string | null = null;
    
    for (let i = assistantMessageIndex - 1; i >= 0; i--) {
      const prevMessage = messages[i];
      if (prevMessage.role === "assistant") {
        break; // Stop at the previous assistant message
      }
      if (prevMessage.role === "user") {
        // Collect user content (there might be multiple user messages: one for video, one for text)
        if (prevMessage.content.trim()) {
          userPrompt = prevMessage.content;
        }
        if (prevMessage.videoUrl || prevMessage.videoS3Key) {
          userVideoUrl = prevMessage.videoUrl || null;
          userVideoS3Key = prevMessage.videoS3Key || null;
        }
      }
    }
    
    if (!userPrompt && !userVideoUrl) {
      console.error("[AIChatForm] Cannot find user message to retry from");
      return;
    }
    
    const requestChatId = getCurrentChatId();
    if (!requestChatId) return;
    
    console.log("[AIChatForm] Retrying message:", {
      assistantMessageId,
      userPrompt: userPrompt.substring(0, 50) + "...",
      hasVideo: !!userVideoUrl,
      chatId: requestChatId,
    });
    
    // Get conversation history BEFORE this exchange
    // Always load fresh from storage - it's the source of truth
    const currentChat = await loadChat(requestChatId);
    const messagesToUse = currentChat?.messages ?? [];
    
    if (messagesToUse.length === 0) {
      console.warn("[AIChatForm] ⚠️ Retry: No messages found in storage for chat", requestChatId);
    }
    
    // Find the assistant message index in the storage messages
    const storageAssistantIndex = messagesToUse.findIndex(m => m.id === assistantMessageId);
    if (storageAssistantIndex === -1) {
      console.error("[AIChatForm] Cannot find assistant message in storage:", assistantMessageId);
      return;
    }
    
    const conversationHistory = messagesToUse.slice(0, storageAssistantIndex).filter((m, idx) => {
      // Find user messages before the current exchange
      for (let i = storageAssistantIndex - 1; i >= 0; i--) {
        if (messagesToUse[i].id === m.id) {
          return false; // Exclude messages that are part of the current exchange
        }
        if (messagesToUse[i].role === "assistant") {
          return true; // Include if before the previous assistant message
        }
      }
      return true;
    });
    
    setRetryingMessageId(assistantMessageId);
    setLoading(true);
    setApiError(null);
    
    // Clear the incomplete message content and reset its flags
    updateMessage(assistantMessageId, { 
      content: "", 
      isIncomplete: false, 
      isStreaming: true 
    });
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      if (!userVideoUrl) {
        // Text-only retry
        setProgressStage("generating");
        await sendTextOnlyQuery(
          userPrompt,
          assistantMessageId,
          (id, updates) => {
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, updates);
            }
          },
          conversationHistory,
          abortController,
          thinkingMode,
          mediaResolution,
          domainExpertise
        );
      } else {
        // Video retry - we need to re-send with the stored video URL
        setProgressStage("processing");
        
        // For video retries, we need to call the API directly with the S3 URL
        // The sendVideoQuery expects a File, but we have an S3 URL
        // We'll use fetch directly to the API with the video URL
        const formData = new FormData();
        formData.append("prompt", userPrompt);
        formData.append("videoUrl", userVideoUrl);
        formData.append("thinkingMode", thinkingMode);
        formData.append("mediaResolution", mediaResolution);
        formData.append("domainExpertise", domainExpertise);
        
        if (conversationHistory.length > 0) {
          const { getConversationContext } = await import("@/utils/context-utils");
          const context = getConversationContext(conversationHistory);
          if (context.length > 0) {
            formData.append("history", JSON.stringify(context));
          }
        }
        
        const response = await fetch("/api/llm", {
          method: "POST",
          headers: { "x-stream": "true" },
          body: formData,
          signal: abortController.signal,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to get response");
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        if (reader) {
          setProgressStage("analyzing");
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(assistantMessageId, { 
                content: stripStreamMetadata(accumulatedText),
                isStreaming: true,
              });
            }
          }
          
          // Mark as complete
          const chatId = getCurrentChatId();
          if (chatId === requestChatId) {
            updateMessage(assistantMessageId, {
              isStreaming: false,
              isIncomplete: false,
            });
          }
        }
      }
    } catch (err) {
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[AIChatForm] Retry was cancelled");
        } else {
          const errorMessage = err instanceof Error ? err.message : "An error occurred";
          setApiError(errorMessage);
          // Mark as still incomplete so user can try again
          updateMessage(assistantMessageId, {
            isStreaming: false,
            isIncomplete: true,
          });
        }
      }
    } finally {
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        setLoading(false);
        setProgressStage("idle");
        setRetryingMessageId(null);
      }
      abortControllerRef.current = null;
    }
  };

  /**
   * Handle user selecting "PRO + Quick Chat" analysis option
   * Starts both PRO analysis task and quick chat analysis
   */
  const handleSelectProPlusQuick = async (messageId: string) => {
    console.log("[AIChatForm] PRO + Quick selected for message:", messageId);
    
    // Find the analysis options message
    const optionsMessage = messages.find(m => m.id === messageId);
    if (!optionsMessage?.analysisOptions) {
      console.error("[AIChatForm] Could not find analysis options message");
      return;
    }
    
    const { preAnalysis, videoUrl: storedVideoUrl, userPrompt: storedUserPrompt } = optionsMessage.analysisOptions;
    
    // Update the message to show selection
    updateMessage(messageId, {
      analysisOptions: {
        ...optionsMessage.analysisOptions,
        selectedOption: "pro_plus_quick",
      },
    });
    
    // Use stored video URL directly (avoids stale closure issues)
    const videoUrl = storedVideoUrl || null;
    
    if (!videoUrl) {
      console.error("[AIChatForm] Could not find video URL for PRO analysis");
      // Still start quick analysis with stored values
      await startQuickAnalysis(messageId, preAnalysis.sport, undefined, storedUserPrompt);
      return;
    }
    
    // Get estimated time for PRO analysis
    const estimatedTime = estimateProAnalysisTime(preAnalysis.durationSeconds ?? null);
    
    // Create PRO analysis task in background (requires authenticated user)
    let taskCreated = false;
    if (user) {
      try {
        console.log("[AIChatForm] Creating PRO analysis task for URL:", videoUrl);
        
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            taskType: "statistics",
            sport: preAnalysis.sport,
            videoUrl: videoUrl,
            thumbnailUrl: preAnalysis.thumbnailUrl || null,
            thumbnailS3Key: preAnalysis.thumbnailS3Key || null,
            videoLength: preAnalysis.durationSeconds || null,
          }),
        });
        
        if (response.ok) {
          const { task } = await response.json();
          console.log("[AIChatForm] ✅ PRO analysis task created:", task.id);
          taskCreated = true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[AIChatForm] Failed to create PRO analysis task:", errorData);
        }
      } catch (err) {
        console.error("[AIChatForm] Error creating PRO analysis task:", err);
      }
    } else {
      console.warn("[AIChatForm] User not authenticated, skipping PRO task creation");
    }
    
    // Add an AI message informing the user about the library addition
    if (taskCreated) {
      const libraryMessageId = generateMessageId();
      const libraryMessage: Message = {
        id: libraryMessageId,
        role: "assistant",
        content: `🎯 I've added this video to your **Library** for PRO Analysis. You can find the detailed results there in approximately **${estimatedTime}**.\n\nIn the meantime, let me give you some instant feedback...`,
        isStreaming: false,
      };
      addMessage(libraryMessage);
      
      // Small delay to let the message render
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Start quick analysis with stored values
    await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, storedUserPrompt);
  };

  /**
   * Handle user selecting "Quick Chat Only" analysis option
   */
  const handleSelectQuickOnly = async (messageId: string) => {
    console.log("[AIChatForm] Quick Only selected for message:", messageId);
    
    // Find the analysis options message
    const optionsMessage = messages.find(m => m.id === messageId);
    if (!optionsMessage?.analysisOptions) {
      console.error("[AIChatForm] Could not find analysis options message");
      return;
    }
    
    const { preAnalysis, videoUrl, userPrompt } = optionsMessage.analysisOptions;
    
    // Update the message to show selection
    updateMessage(messageId, {
      analysisOptions: {
        ...optionsMessage.analysisOptions,
        selectedOption: "quick_only",
      },
    });
    
    // Start quick analysis with stored values
    await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, userPrompt);
  };

  /**
   * Start quick AI analysis after user selects an option
   * @param optionsMessageId - ID of the analysis options message
   * @param sport - Detected sport type
   * @param storedVideoUrl - Video URL stored in analysisOptions (preferred, avoids stale closure)
   * @param storedUserPrompt - User prompt stored in analysisOptions (preferred, avoids stale closure)
   */
  const startQuickAnalysis = async (
    optionsMessageId: string, 
    sport: string,
    storedVideoUrl?: string,
    storedUserPrompt?: string
  ) => {
    // Use stored values directly if available (avoids stale closure issues)
    let videoUrl: string | null = storedVideoUrl || null;
    let userPrompt = storedUserPrompt || "";
    
    // Fallback: search through messages if stored values not available (backwards compatibility)
    if (!videoUrl) {
      const msgIndex = messages.findIndex(m => m.id === optionsMessageId);
      
      for (let i = msgIndex - 1; i >= 0; i--) {
        const prevMsg = messages[i];
        if (prevMsg.role === "assistant") break;
        if (prevMsg.role === "user") {
          if (prevMsg.videoUrl && !videoUrl) {
            videoUrl = prevMsg.videoUrl;
          }
          if (prevMsg.content && !userPrompt) {
            userPrompt = prevMsg.content;
          }
        }
      }
    }
    
    if (!videoUrl) {
      console.error("[AIChatForm] Could not find video URL for quick analysis");
      // Reset the selection state so user can try again
      const optionsMessage = messages.find(m => m.id === optionsMessageId);
      if (optionsMessage?.analysisOptions) {
        updateMessage(optionsMessageId, {
          analysisOptions: {
            ...optionsMessage.analysisOptions,
            selectedOption: null, // Reset selection so user can try again
          },
        });
      }
      return;
    }
    
    if (!userPrompt) {
      userPrompt = "Please analyse this video for me.";
    }
    
    // Create a new assistant message for the actual analysis
    const assistantMessageId = generateMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    addMessage(assistantMessage);
    
    setLoading(true);
    setProgressStage("analyzing");
    
    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      // Build form data with video URL
      const formData = new FormData();
      formData.append("prompt", userPrompt);
      formData.append("videoUrl", videoUrl);
      formData.append("thinkingMode", thinkingMode);
      formData.append("mediaResolution", mediaResolution);
      formData.append("domainExpertise", sport as DomainExpertise);
      
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "x-stream": "true" },
        body: formData,
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to analyze video");
      }
      
      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          updateMessage(assistantMessageId, { 
            content: stripStreamMetadata(accumulatedText),
            isStreaming: true,
          });
        }
        
        // Mark as complete (strip any metadata from final content)
        updateMessage(assistantMessageId, {
          content: stripStreamMetadata(accumulatedText),
          isStreaming: false,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("[AIChatForm] Quick analysis was cancelled");
      } else {
        console.error("[AIChatForm] Quick analysis failed:", err);
        updateMessage(assistantMessageId, {
          content: "Sorry, I encountered an error analyzing your video. Please try again.",
          isStreaming: false,
          isIncomplete: true,
        });
      }
    } finally {
      setLoading(false);
      setProgressStage("idle");
      abortControllerRef.current = null;
    }
  };

  const handleAskForHelp = (termName: string, swing?: { name: string; sport: string; description: string }) => {
    let question = '';
    const lowerTermName = termName.toLowerCase();
    
    // Check if it's a swing
    const isSwing = Object.keys({
      ...sharedSwings,
      ...tennisSwings,
      ...pickleballSwings,
      ...padelSwings,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's a technique term
    const isTechnique = Object.keys(sharedTechnique).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's a court
    const isCourt = Object.keys({
      ...tennisCourts,
      ...pickleballCourts,
      ...padelCourts,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's terminology (anything else)
    const isTerminology = Object.keys({
      ...sharedTerminology,
      ...tennisTerminology,
      ...pickleballTerminology,
      ...padelTerminology,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Generate context-appropriate questions
    if (isSwing) {
      question = `Can you give me tips for improving my ${termName.toLowerCase()} swing?`;
    } else if (isTechnique) {
      question = `Can you explain how to improve my ${termName.toLowerCase()} technique?`;
    } else if (isCourt) {
      question = `What strategies should I use when playing on a ${termName.toLowerCase()}?`;
    } else if (isTerminology) {
      question = `Can you explain more about ${termName.toLowerCase()} and how to use it effectively in my game?`;
    } else {
      // Fallback for any unmatched terms
      question = `Can you give me tips about ${termName.toLowerCase()} in game?`;
    }
    
    // Update the prompt in the UI
    setPrompt(question);
    
    // Submit with the question directly to avoid race conditions with state updates
    // Use a small timeout to allow the UI to update first
    setTimeout(() => {
      const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as any;
      handleSubmit(fakeEvent, question);
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string) => {
    e.preventDefault();
    
    // Use override prompt if provided (e.g., from "Ask AI for help"), otherwise use state prompt
    const effectivePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    
    // Allow submission if: has text, has file, or has a detected video URL
    const hasValidInput = effectivePrompt.trim() || videoFile || detectedVideoUrl;
    if (!hasValidInput || loading) return;

    // Capture the video URL before clearing
    const currentVideoUrl = detectedVideoUrl;

    // Use prompt if provided, otherwise use default prompt for video/URL submissions
    // Update prompt state if we're using the default so UI reflects what will be sent
    let currentPrompt = effectivePrompt.trim();
    if (!currentPrompt && (videoFile || currentVideoUrl)) {
      currentPrompt = "Please analyse this video for me.";
      setPrompt(currentPrompt); // Update state so UI shows the prompt
    }
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

    // Get the current chat ID - there should always be one (created on mount)
    const requestChatId = getCurrentChatId();
    console.log("[AIChatForm] Using chat:", requestChatId);
    
    if (!requestChatId) {
      console.error("[AIChatForm] No chat ID available! This should not happen - chat should be created on mount.");
      return;
    }

    // Get conversation history BEFORE adding new messages
    // Strategy: Compare storage vs React state and use the most complete/appropriate one
    let conversationHistory: Message[] = [];
    
    // Load from storage to check what's persisted
    const currentChat = await loadChat(requestChatId);
    const storageMessages = currentChat?.messages ?? [];
    const stateMessages = messages;
    
    // Determine which history to use:
    // 1. If storage has messages and state is empty/different chat → use storage (prevents context bleeding)
    // 2. If state has MORE messages than storage → use state (storage save may be pending)
    // 3. If both empty → new chat, use empty
    
    if (storageMessages.length > 0 && stateMessages.length === 0) {
      // State was cleared (new chat) but storage has old data - don't use old data
      console.log("[AIChatForm] State empty, storage has data - using empty history (new chat)", {
        storageMessages: storageMessages.length,
        chatId: requestChatId,
      });
      conversationHistory = [];
    } else if (stateMessages.length > storageMessages.length) {
      // State has more messages - storage save may still be pending
      // Verify state messages belong to this chat by checking if storage messages are a prefix
      const storageIds = storageMessages.map(m => m.id).join(',');
      const statePrefix = stateMessages.slice(0, storageMessages.length).map(m => m.id).join(',');
      
      if (storageMessages.length === 0 || storageIds === statePrefix) {
        // State is a superset of storage - use state (more current)
        console.log("[AIChatForm] Using React state (more current than storage)", {
          stateMessages: stateMessages.length,
          storageMessages: storageMessages.length,
          chatId: requestChatId,
        });
        conversationHistory = stateMessages;
      } else {
        // State and storage have different messages - context bleeding!
        console.warn("[AIChatForm] ⚠️ Context mismatch - using storage", {
          stateMessages: stateMessages.length,
          storageMessages: storageMessages.length,
          chatId: requestChatId,
        });
        conversationHistory = storageMessages;
      }
    } else if (storageMessages.length > 0) {
      // Storage has messages (and state has same or fewer) - use storage
      conversationHistory = storageMessages;
      
      if (stateMessages.length !== storageMessages.length) {
        console.log("[AIChatForm] Using storage messages", {
          stateMessages: stateMessages.length,
          storageMessages: storageMessages.length,
          chatId: requestChatId,
        });
      }
    } else {
      // Both empty - new chat
      conversationHistory = [];
    }
    
    console.log("🔍 [DEBUG] ========== CONVERSATION HISTORY DEBUG ==========");
    console.log("🔍 [DEBUG] Chat ID:", requestChatId);
    console.log("🔍 [DEBUG] State messages:", stateMessages.length);
    console.log("🔍 [DEBUG] Storage messages:", storageMessages.length);
    console.log("🔍 [DEBUG] Using history from:", conversationHistory === stateMessages ? "STATE" : "STORAGE");
    console.log("🔍 [DEBUG] History length being sent:", conversationHistory.length);
    console.log("🔍 [DEBUG] History messages:");
    conversationHistory.forEach((msg, i) => {
      const hasVideo = !!(msg.videoUrl || msg.videoS3Key || msg.videoFile);
      console.log(`🔍 [DEBUG]   [${i}] ${msg.role}: "${msg.content.slice(0, 80)}${msg.content.length > 80 ? '...' : ''}" ${hasVideo ? '📹 HAS VIDEO' : ''}`);
    });
    console.log("🔍 [DEBUG] ================================================");

    // Set loading state
    console.log("[AIChatForm] Setting loading state to true");
    setLoading(true);
    setUploadProgress(0);
    // Set appropriate progress stage based on input type
    if (currentVideoFile) {
      setProgressStage("uploading");
    } else if (currentVideoUrl) {
      setProgressStage("processing"); // Will update to analyzing after validation
    } else {
      setProgressStage("processing");
    }

    let videoMessageId: string | null = null;
    
    // Calculate input tokens for user messages
    const calculateUserMessageTokens = (content: string, videoFile: File | null): number => {
      let tokens = estimateTextTokens(content);
      if (videoFile) {
        const isImage = videoFile.type.startsWith("image/");
        if (isImage) {
          const imageSizeKB = videoFile.size / 1024;
          tokens += 257 + Math.ceil((imageSizeKB / 100) * 85);
        } else {
          tokens += estimateVideoTokens(videoFile.size, videoFile.type);
        }
      }
      return tokens;
    };
    
    console.log("[AIChatForm] Creating user messages...", {
      hasVideo: !!currentVideoFile,
      hasVideoUrl: !!currentVideoUrl,
      hasPrompt: !!currentPrompt.trim(),
    });
    
    // If both video (file or URL) and text are present, create two separate messages
    if ((currentVideoFile || currentVideoUrl) && currentPrompt.trim()) {
      console.log("[AIChatForm] Creating two messages: video/URL + text");
      // First message: video only
      videoMessageId = generateMessageId();
      const videoTokens = calculateUserMessageTokens("", currentVideoFile);
      const videoMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: "",
        videoFile: currentVideoFile || null,
        videoPreview: currentVideoPreview,
        videoUrl: currentVideoUrl || undefined, // Store the URL directly if it's a URL submission
        thumbnailUrl: videoPreAnalysis?.thumbnailUrl || undefined,
        thumbnailS3Key: videoPreAnalysis?.thumbnailS3Key || undefined,
        videoPlaybackSpeed: videoPlaybackSpeed,
        inputTokens: videoTokens,
        poseData: poseData,
        isTechniqueLiteEligible: videoPreAnalysis?.isTechniqueLiteEligible ?? false,
      };
      console.log("[AIChatForm] Adding video message:", videoMessageId, {
        isTechniqueLiteEligible: videoMessage.isTechniqueLiteEligible,
        videoPreAnalysisEligible: videoPreAnalysis?.isTechniqueLiteEligible,
        videoPreAnalysisState: videoPreAnalysis,
      });
      addMessage(videoMessage);
      
      // Second message: text only
      const textMessageId = generateMessageId();
      const textTokens = calculateUserMessageTokens(currentPrompt, null);
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: null,
        videoPreview: null,
        inputTokens: textTokens,
      };
      console.log("[AIChatForm] Adding text message:", textMessageId);
      addMessage(textMessage);
    } else if (currentVideoUrl && !currentVideoFile) {
      // Video URL only (no file uploaded)
      console.log("[AIChatForm] Creating single message with video URL");
      videoMessageId = generateMessageId();
      const userMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: currentPrompt,
        videoUrl: currentVideoUrl,
        thumbnailUrl: videoPreAnalysis?.thumbnailUrl || undefined,
        thumbnailS3Key: videoPreAnalysis?.thumbnailS3Key || undefined,
        inputTokens: estimateTextTokens(currentPrompt),
        isTechniqueLiteEligible: videoPreAnalysis?.isTechniqueLiteEligible ?? false,
      };
      console.log("[AIChatForm] Adding video URL message:", videoMessageId);
      addMessage(userMessage);
    } else {
      // Single message: either video file or text only
      console.log("[AIChatForm] Creating single message");
      const userMessageId = generateMessageId();
      if (currentVideoFile) {
        videoMessageId = userMessageId;
      }
      const userTokens = calculateUserMessageTokens(currentPrompt, currentVideoFile);
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: currentVideoFile,
        videoPreview: currentVideoPreview,
        thumbnailUrl: currentVideoFile ? (videoPreAnalysis?.thumbnailUrl || undefined) : undefined,
        thumbnailS3Key: currentVideoFile ? (videoPreAnalysis?.thumbnailS3Key || undefined) : undefined,
        videoPlaybackSpeed: currentVideoFile ? videoPlaybackSpeed : undefined,
        inputTokens: userTokens,
        poseData: currentVideoFile ? poseData : undefined,
        isTechniqueLiteEligible: currentVideoFile ? (videoPreAnalysis?.isTechniqueLiteEligible ?? false) : undefined,
      };
      console.log("[AIChatForm] Adding user message:", userMessageId, {
        hasVideo: !!userMessage.videoFile,
        hasPreview: !!userMessage.videoPreview,
        contentLength: userMessage.content.length,
        isTechniqueLiteEligible: userMessage.isTechniqueLiteEligible,
        videoPreAnalysisEligible: videoPreAnalysis?.isTechniqueLiteEligible,
      });
      addMessage(userMessage);
    }

    console.log("[AIChatForm] User messages added, current messages state length:", messages.length);

    // Clear input
    setPrompt("");
    // Don't revoke blob URL yet - it's still referenced in the message
    // It will be revoked when S3 URL is available or when message is removed
    clearVideo(true); // Keep blob URL since it's in the message
    setDetectedVideoUrl(null); // Clear detected video URL
    setVideoPreAnalysis(null); // Clear video pre-analysis
    lastAnalyzedUrlRef.current = null; // Reset URL tracking
    setVideoError(null);
    setApiError(null);
    setPoseData(undefined); // Reset pose data after sending
    // Loading state already set above before chat creation
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add placeholder assistant message
    const assistantMessageId = generateMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };
    console.log("[AIChatForm] Adding assistant placeholder message:", assistantMessageId);
    addMessage(assistantMessage);
    console.log("[AIChatForm] All messages added, waiting for state update...");

    // Wait a tick for React to update state, then save messages to chat
    setTimeout(() => {
      // Get current messages from state (they should be updated by now)
      const currentChatId = getCurrentChatId();
      console.log("[AIChatForm] Saving messages to chat:", {
        requestChatId,
        currentChatId,
        match: currentChatId === requestChatId,
      });
      
      if (requestChatId && currentChatId === requestChatId) {
        // Messages will be saved by useAIChat useEffect, but we can also save here explicitly
        console.log("[AIChatForm] Chat IDs match, messages should be saved by useEffect");
      } else {
        console.warn("[AIChatForm] Chat ID mismatch:", { requestChatId, currentChatId });
      }
    }, 0);

    // Scroll to bottom immediately after adding messages, then disable auto-scroll
    // Use requestAnimationFrame to ensure DOM is updated
    // Skip initial scroll if we're about to show a video size limit error
    const willShowSizeLimitError = !!(currentVideoFile && 
                                      currentVideoFile.type.startsWith("video/") && 
                                      (currentVideoFile.size / (1024 * 1024)) > 100);
    
    // Update state to hide disclaimer if showing size error
    setShowingVideoSizeError(willShowSizeLimitError);
    
    requestAnimationFrame(() => {
      if (!willShowSizeLimitError) {
        scrollToBottom();
      }
      setShouldAutoScroll(false); // Disable auto-scroll during response generation
    });

    try {
      // Check if chat changed before starting request
      const currentChatId = getCurrentChatId();
      if (currentChatId !== requestChatId) {
        console.warn("[AIChatForm] Chat changed before request started, aborting");
        removeMessage(assistantMessageId);
        return;
      }

      if (currentVideoUrl && !currentVideoFile) {
        // Video URL analysis
        console.log("[AIChatForm] Processing video URL:", currentVideoUrl);
        
        // Check if we have pre-analysis data and video is eligible for PRO analysis
        if (videoPreAnalysis && (videoPreAnalysis.isProEligible || videoPreAnalysis.isTechniqueLiteEligible)) {
          // Show analysis options message instead of immediately starting analysis
          console.log("[AIChatForm] Showing analysis options for eligible video", { isProEligible: videoPreAnalysis.isProEligible, isTechniqueLiteEligible: videoPreAnalysis.isTechniqueLiteEligible });
          
          // Update the assistant message to be an analysis options message
          // Store videoUrl and userPrompt directly to avoid stale closure issues when user clicks button later
          updateMessage(assistantMessageId, {
            messageType: "analysis_options",
            content: "", // No text content for options message
            analysisOptions: {
              preAnalysis: videoPreAnalysis,
              selectedOption: null,
              videoUrl: currentVideoUrl, // Store URL directly
              userPrompt: currentPrompt, // Store prompt directly
            },
            isStreaming: false,
          });
          
          // Don't start analysis yet - wait for user to select an option
          setLoading(false);
          setProgressStage("idle");
          return;
        }
        
        // No PRO eligibility or not padel - proceed with quick analysis directly
        console.log("[AIChatForm] Starting quick analysis for video URL:", currentVideoUrl);
        setProgressStage("analyzing");
        
        // Build form data with video URL
        const formData = new FormData();
        formData.append("prompt", currentPrompt);
        formData.append("videoUrl", currentVideoUrl);
        formData.append("thinkingMode", thinkingMode);
        formData.append("mediaResolution", mediaResolution);
        formData.append("domainExpertise", domainExpertise);
        
        // Add conversation history if available
        if (conversationHistory.length > 0) {
          const { getConversationContext } = await import("@/utils/context-utils");
          const context = getConversationContext(conversationHistory);
          if (context.length > 0) {
            formData.append("history", JSON.stringify(context));
          }
        }
        
        const response = await fetch("/api/llm", {
          method: "POST",
          headers: { "x-stream": "true" },
          body: formData,
          signal: abortController.signal,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to analyze video");
        }
        
        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(assistantMessageId, { 
                content: stripStreamMetadata(accumulatedText),
                isStreaming: true,
              });
            }
          }
          
          // Mark as complete
          const chatId = getCurrentChatId();
          if (chatId === requestChatId) {
            updateMessage(assistantMessageId, {
              isStreaming: false,
            });
          }
        }
      } else if (!currentVideoFile) {
        // Streaming for text-only
        await sendTextOnlyQuery(
          currentPrompt,
          assistantMessageId,
          (id, updates) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, updates);
            } else {
              console.warn("[AIChatForm] Chat changed during streaming, stopping updates");
            }
          },
          conversationHistory,
          abortController,
          thinkingMode,
          mediaResolution,
          domainExpertise
        );
      } else {
        // Check if we have pre-analysis data and video is eligible for PRO analysis
        if (videoPreAnalysis && (videoPreAnalysis.isProEligible || videoPreAnalysis.isTechniqueLiteEligible)) {
          console.log("[AIChatForm] Showing analysis options for eligible uploaded video", { isProEligible: videoPreAnalysis.isProEligible, isTechniqueLiteEligible: videoPreAnalysis.isTechniqueLiteEligible });
          
          // Upload video to S3 first so it persists even if user leaves
          setProgressStage("uploading");
          setUploadProgress(0);
          
          let s3Url: string | undefined;
          
          try {
            // Get presigned URL for S3 upload
            console.log("[AIChatForm] Getting presigned URL for PRO-eligible video...");
            const urlResponse = await fetch("/api/s3/upload-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: currentVideoFile.name,
                contentType: currentVideoFile.type,
              }),
            });

            if (!urlResponse.ok) {
              const errorData = await urlResponse.json();
              throw new Error(errorData.error || "Failed to get upload URL");
            }

            const { url: presignedUrl, downloadUrl, publicUrl, key: s3Key } = await urlResponse.json();
            s3Url = downloadUrl || publicUrl;

            // Upload to S3
            console.log("[AIChatForm] Uploading PRO-eligible video to S3...");
            await uploadToS3(presignedUrl, currentVideoFile, (progress) => {
              setUploadProgress(progress * 100);
            }, abortController.signal);

            console.log("[AIChatForm] Video uploaded successfully to S3:", s3Url);

            // Update the video message with S3 URL (so it persists)
            if (videoMessageId) {
              updateMessage(videoMessageId, { 
                videoUrl: s3Url, 
                videoS3Key: s3Key, 
                videoPreview: null // Clear blob URL
              });
            }
          } catch (uploadError) {
            console.error("[AIChatForm] Failed to upload video:", uploadError);
            // If upload fails, don't show the analysis options dialog
            // Instead, fall through to the normal video analysis flow
          }
          
          // Only show the analysis options dialog if we have a valid S3 URL
          if (s3Url) {
            // Now show the analysis options dialog
            // Store videoUrl and userPrompt directly to avoid stale closure issues when user clicks button later
            updateMessage(assistantMessageId, {
              messageType: "analysis_options",
              content: "",
              analysisOptions: {
                preAnalysis: videoPreAnalysis,
                selectedOption: null,
                videoUrl: s3Url, // Store the S3 URL directly
                userPrompt: currentPrompt, // Store prompt directly
              },
              isStreaming: false,
            });
            
            setLoading(false);
            setProgressStage("idle");
            setUploadProgress(0);
            return;
          }
          // If upload failed, fall through to normal video analysis below
        }

        // Video upload with progress (not eligible for PRO)
        await sendVideoQuery(
          currentPrompt,
          currentVideoFile,
          assistantMessageId,
          (id, updates) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, updates);
            } else {
              console.warn("[AIChatForm] Chat changed during streaming, stopping updates");
            }
          },
          setUploadProgress,
          setProgressStage,
          conversationHistory,
          (s3Url, s3Key) => {
            // Check if chat changed before updating video message
            const chatId = getCurrentChatId();
            if (chatId === requestChatId && videoMessageId) {
              // Clear blob URL when S3 URL is available to prevent revoked blob URL errors
              updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key, videoPreview: null });
            }
          },
          abortController,
          thinkingMode,
          mediaResolution,
          domainExpertise,
          needsServerConversion
        );
      }
    } catch (err) {
      // Only handle error if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        // Don't show error if request was aborted (user clicked stop)
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[AIChatForm] Request was cancelled by user");
          // Optionally update the message to indicate it was stopped
          const currentContent = messages.find(m => m.id === assistantMessageId)?.content || "";
          if (currentContent.trim()) {
            updateMessage(assistantMessageId, { content: currentContent + "\n\n[Stopped by user]" });
          } else {
            removeMessage(assistantMessageId);
          }
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          setApiError(errorMessage);
          // Remove assistant message
          removeMessage(assistantMessageId);
          // Also remove user video message if it exists (upload failed)
          // Revoke blob URL from the captured preview before removing
          if (videoMessageId && currentVideoPreview) {
            URL.revokeObjectURL(currentVideoPreview);
            removeMessage(videoMessageId);
          }
          // Clear video on error so user can try again with a new file
          clearVideo();
        }
      }
    } finally {
      // Only reset loading state if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        setLoading(false);
        setProgressStage("idle");
        setUploadProgress(0);
        // Clear video size error state after completion (unless it was actually a size error)
        // The flag will stay true if it was a size error, ensuring banner stays hidden
      }
      // Clean up abort controller
      abortControllerRef.current = null;
      // Re-enable auto-scroll after response completes (user can manually scroll if needed)
      // setShouldAutoScroll(true); // Commented out - keep auto-scroll disabled
    }
  };

  const handleNewChat = async () => {
    // Check if chat is thinking before creating new chat
    const result = await Promise.resolve(confirmNavigation());
    if (!result) {
      return; // User cancelled
    }
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    setShowingVideoSizeError(false);
    // Explicitly set settings from the new chat (which has defaults)
    setThinkingMode(newChat.thinkingMode ?? "fast");
    setMediaResolution(newChat.mediaResolution ?? "medium");
    setDomainExpertise(newChat.domainExpertise ?? "all-sports");
  };

  return (
    <AudioPlayerProvider>
      <FloatingVideoProvider scrollContainerRef={scrollContainerRef}>
      {/* Loading spinner during hydration */}
      <div className={`hydration-spinner ${isHydrated ? 'hidden' : ''}`}>
        <div className="spinner" />
      </div>
      
      <div className={`h-screen flex flex-col overflow-hidden hydration-guard ${isHydrated ? 'hydrated' : ''}`}>
        {/* Header - visible on both mobile and desktop */}
        <ChatHeader messageCount={messages.length} onNewChat={handleNewChat} />

        {/* Sidebar */}
        <Sidebar 
          onClearChat={handleClearConversation}
          messageCount={messages.length}
          onChatSwitchAttempt={confirmNavigation}
        />

      {/* Content wrapper - accounts for sidebar width and centers content */}
      <div
        className={`content-wrapper ${!isSidebarCollapsed ? 'sidebar-expanded' : ''} ${isSidebarInitialLoad ? 'no-transition' : ''}`}
      >
        {/* Scrollable content area - centered and responsive */}
        <div
          ref={containerRef}
          className={`flex flex-col max-w-4xl w-full h-full transition-all ${
            isDragging ? "bg-blue-50 dark:bg-blue-900/10" : ""
          }`}
          style={{
            position: "relative",
            overflow: "hidden",
          }}
          {...dragHandlers}
        >
          {/* Drag overlay */}
          {isDragging && <DragOverlay />}

          {/* Messages area - this is the scrolling container with fade overlay */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <div ref={scrollContainerRef} style={{ height: "100%", overflowY: "auto", minHeight: 0 }}>
              {messages.length === 0 && !loading ? (
                <StarterPrompts 
                  onPromptSelect={handleStarterPromptSelect}
                />
              ) : (
                <MessageList
                  messages={messages}
                  loading={loading}
                  videoFile={videoFile}
                  progressStage={progressStage}
                  uploadProgress={uploadProgress}
                  messagesEndRef={messagesEndRef}
                  scrollContainerRef={scrollContainerRef}
                  onAskForHelp={handleAskForHelp}
                  onUpdateMessage={updateMessage}
                  onRetryMessage={handleRetryMessage}
                  retryingMessageId={retryingMessageId}
                  onSelectProPlusQuick={handleSelectProPlusQuick}
                  onSelectQuickOnly={handleSelectQuickOnly}
                />
              )}
            </div>
            
            {/* Scroll to video button */}
            {messages.length > 0 && (
              <ScrollToVideo 
                scrollContainerRef={scrollContainerRef}
              />
            )}
            
            {/* Scroll to bottom button */}
            {messages.length > 0 && (
              <ScrollToBottom 
                scrollContainerRef={scrollContainerRef}
                onScrollToBottom={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            )}
            
            {/* Audio stop button */}
            <AudioStopButton 
              scrollContainerRef={scrollContainerRef}
              scrollButtonVisible={messages.length > 0}
            />
            
            {/* Bottom fade overlay - fades content at bottom - only show when there are messages */}
            {messages.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "60px",
                  background: `linear-gradient(to top, var(--gray-1, #1C1C1C) 0%, transparent 100%)`,
                  pointerEvents: "none",
                  zIndex: 1000,
                }}
              />
            )}
          </div>

          {/* Input area - docked at bottom */}
          <ChatInput
            prompt={prompt}
            videoFile={videoFile}
            videoPreview={videoPreview}
            error={null}
            loading={loading}
            progressStage={progressStage}
            thinkingMode={thinkingMode}
            mediaResolution={mediaResolution}
            domainExpertise={domainExpertise}
            onPromptChange={setPrompt}
            onVideoRemove={clearVideo}
            onVideoChange={handleVideoChange}
            onSubmit={handleSubmit}
            onStop={handleStop}
            onPickleballCoachClick={handlePickleballCoachPrompt}
            onThinkingModeChange={handleThinkingModeChange}
            onMediaResolutionChange={handleMediaResolutionChange}
            onDomainExpertiseChange={handleDomainExpertiseChange}
            disableTooltips={hasJustDropped}
            hideDisclaimer={showingVideoSizeError}
            videoSportDetected={videoSportDetected}
            onVideoUrlDetected={setDetectedVideoUrl}
            videoPreAnalysis={videoPreAnalysis}
          />
        </div>
      </div>

      {/* Toast for error notifications */}
      <ErrorToast error={error} />

      {/* Alert Dialog for navigation warning */}
      <AlertDialog.Root open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Leave this page?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A response is being generated. Are you sure you want to leave?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" onClick={handleCancel}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleConfirm}>
                Leave
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Floating video portal - renders at document root */}
      <FloatingVideoPortal />
      </div>
      </FloatingVideoProvider>
    </AudioPlayerProvider>
  );
}
