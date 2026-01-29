"use client";

/**
 * Hook for video pre-analysis (sport detection, camera angle, PRO eligibility)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { videoLogger } from "@/lib/logger";
import type { VideoPreAnalysis } from "@/types/chat";
import type { DomainExpertise } from "@/utils/storage";
import { updateChatSettings } from "@/utils/storage";
import { getCurrentChatId } from "@/utils/storage-unified";
import {
  isImageFile,
  extractFirstFrameWithDuration,
  extractFirstFrameFromUrl,
  uploadThumbnailToS3,
  validateVideoUrl,
} from "@/utils/video-utils";

interface UseVideoPreAnalysisOptions {
  videoFile: File | null;
  domainExpertise: DomainExpertise;
  setDomainExpertise: (expertise: DomainExpertise) => void;
}

interface UseVideoPreAnalysisReturn {
  videoPreAnalysis: VideoPreAnalysis | null;
  setVideoPreAnalysis: React.Dispatch<React.SetStateAction<VideoPreAnalysis | null>>;
  isDetectingSport: boolean;
  videoSportDetected: DomainExpertise | null;
  detectedVideoUrl: string | null;
  setDetectedVideoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  resetAnalysis: () => void;
  /** True when a pasted video URL exceeds the 100MB size limit */
  urlFileSizeTooLarge: boolean;
  setUrlFileSizeTooLarge: React.Dispatch<React.SetStateAction<boolean>>;
  /** Call this before setting video file to skip the next auto-analysis (for pending submissions) */
  skipNextAnalysis: () => void;
}

export function useVideoPreAnalysis({
  videoFile,
  domainExpertise,
  setDomainExpertise,
}: UseVideoPreAnalysisOptions): UseVideoPreAnalysisReturn {
  const [videoPreAnalysis, setVideoPreAnalysis] = useState<VideoPreAnalysis | null>(null);
  const [isDetectingSport, setIsDetectingSport] = useState(false);
  const [videoSportDetected, setVideoSportDetected] = useState<DomainExpertise | null>(null);
  const [detectedVideoUrl, setDetectedVideoUrl] = useState<string | null>(null);
  const [urlFileSizeTooLarge, setUrlFileSizeTooLarge] = useState(false);

  const lastDetectedVideoRef = useRef<File | null>(null);
  const lastAnalyzedUrlRef = useRef<string | null>(null);
  const isAnalyzingUrlRef = useRef(false);
  // Ref to skip the next analysis (used for pending submissions where pre-analysis is already done)
  const skipNextAnalysisRef = useRef(false);

  const resetAnalysis = useCallback(() => {
    setVideoPreAnalysis(null);
    setDetectedVideoUrl(null);
    lastAnalyzedUrlRef.current = null;
    isAnalyzingUrlRef.current = false;
    skipNextAnalysisRef.current = false;
  }, []);

  // Function to skip the next auto-analysis (call before setting video file for pending submissions)
  const skipNextAnalysis = useCallback(() => {
    skipNextAnalysisRef.current = true;
  }, []);

  // Calculate Technique LITE eligibility
  const calculateTechniqueLiteEligibility = useCallback((
    cameraAngle: string,
    durationSeconds: number | null
  ): { eligible: boolean; reason: string | undefined } => {
    const isGroundLevelCamera = ["side", "ground_behind", "diagonal"].includes(cameraAngle);
    const eligible = isGroundLevelCamera && durationSeconds !== null && durationSeconds < 20;

    let reason: string | undefined;
    if (eligible) {
      reason = "Perfect for technique analysis! Ground-level camera with short clip.";
    } else if (!isGroundLevelCamera) {
      reason = "Technique LITE requires a ground-level camera angle (side, behind, or diagonal).";
    } else if (durationSeconds === null || durationSeconds >= 20) {
      reason = "Technique LITE requires videos under 20 seconds.";
    }

    return { eligible, reason };
  }, []);

  // Auto-detect sport and eligibility from video file
  useEffect(() => {
    if (!videoFile || isDetectingSport || videoFile === lastDetectedVideoRef.current) {
      if (!videoFile && videoPreAnalysis && !detectedVideoUrl) {
        setVideoPreAnalysis(null);
      }
      return;
    }

    if (isImageFile(videoFile)) {
      return;
    }

    // Skip analysis if explicitly requested (for pending submissions from home page)
    if (skipNextAnalysisRef.current) {
      videoLogger.info("Skipping analysis - skipNextAnalysis flag is set");
      skipNextAnalysisRef.current = false;
      lastDetectedVideoRef.current = videoFile;
      return;
    }

    // Skip analysis if we already have valid pre-analysis data (e.g., from pending submission)
    // This prevents re-analyzing when navigating from home page with pre-analyzed video
    if (videoPreAnalysis && !videoPreAnalysis.isAnalyzing) {
      videoLogger.info("Skipping analysis - valid pre-analysis data already present");
      lastDetectedVideoRef.current = videoFile;
      return;
    }

    lastDetectedVideoRef.current = videoFile;

    const analyzeVideoFile = async () => {
      setIsDetectingSport(true);
      setVideoSportDetected(null);

      setVideoPreAnalysis({
        sport: "other",
        cameraAngle: "other",
        fullCourtVisible: false,
        confidence: 0,
        isProEligible: false,
        isAnalyzing: true,
      });

      try {
        videoLogger.info("Extracting first frame and duration...");
        const { frameBlob, durationSeconds } = await extractFirstFrameWithDuration(videoFile, 640, 0.7);

        if (!frameBlob) {
          videoLogger.info("Failed to extract frame");
          setVideoPreAnalysis({
            sport: "other",
            cameraAngle: "other",
            fullCourtVisible: false,
            confidence: 0,
            isProEligible: false,
            isAnalyzing: false,
            proEligibilityReason: "Could not extract frame from video",
            durationSeconds,
            isTechniqueLiteEligible: false,
            techniqueLiteEligibilityReason: "Could not analyze video.",
          });
          return;
        }

        videoLogger.info("Frame extracted, duration:", durationSeconds, "s");

        // Upload thumbnail and analyze in parallel
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;

        const uploadThumbnail = async () => {
          const result = await uploadThumbnailToS3(frameBlob);
          if (result) {
            thumbnailUrl = result.thumbnailUrl;
            thumbnailS3Key = result.thumbnailS3Key;
          }
        };

        const formData = new FormData();
        formData.append("image", frameBlob, "frame.jpg");

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
        videoLogger.info("Analysis result:", data);

        const { eligible: isTechniqueLiteEligible, reason: techniqueLiteEligibilityReason } =
          calculateTechniqueLiteEligibility(data.cameraAngle, durationSeconds);

        setVideoPreAnalysis({
          sport: data.sport,
          cameraAngle: data.cameraAngle,
          fullCourtVisible: data.fullCourtVisible,
          confidence: data.confidence,
          isProEligible: data.isProEligible,
          proEligibilityReason: data.proEligibilityReason,
          isAnalyzing: false,
          durationSeconds,
          isTechniqueLiteEligible,
          techniqueLiteEligibilityReason,
          thumbnailUrl,
          thumbnailS3Key,
        });

        // Update domain expertise if sport detected
        if (data.sport !== "other" && data.sport !== domainExpertise) {
          setDomainExpertise(data.sport);
          const currentChatId = getCurrentChatId();
          if (currentChatId) {
            updateChatSettings(currentChatId, { domainExpertise: data.sport });
          }

          setVideoSportDetected(data.sport);
          setTimeout(() => setVideoSportDetected(null), 2500);
        }

      } catch (err) {
        videoLogger.error("Pre-analysis failed:", err);
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
  }, [videoFile, isDetectingSport, domainExpertise, videoPreAnalysis, detectedVideoUrl, setDomainExpertise, calculateTechniqueLiteEligibility]);

  // Auto-detect sport from pasted video URL
  useEffect(() => {
    if (!detectedVideoUrl) {
      setVideoPreAnalysis(prev => {
        if (prev && !videoFile) {
          videoLogger.info("URL analysis clearing - URL removed");
          return null;
        }
        return prev;
      });
      lastAnalyzedUrlRef.current = null;
      isAnalyzingUrlRef.current = false;
      return;
    }

    if (isAnalyzingUrlRef.current) {
      return;
    }

    if (detectedVideoUrl === lastAnalyzedUrlRef.current) {
      return;
    }

    // Skip analysis if explicitly requested (for pending submissions from home page)
    if (skipNextAnalysisRef.current) {
      videoLogger.info("Skipping URL analysis - skipNextAnalysis flag is set");
      skipNextAnalysisRef.current = false;
      lastAnalyzedUrlRef.current = detectedVideoUrl;
      return;
    }

    // Skip analysis if we already have valid pre-analysis data (e.g., from pending submission)
    if (videoPreAnalysis && !videoPreAnalysis.isAnalyzing) {
      videoLogger.info("Skipping URL analysis - valid pre-analysis data already present");
      lastAnalyzedUrlRef.current = detectedVideoUrl;
      return;
    }

    lastAnalyzedUrlRef.current = detectedVideoUrl;
    isAnalyzingUrlRef.current = true;

    const analyzeVideoUrl = async () => {
      setVideoPreAnalysis({
        sport: "other",
        cameraAngle: "other",
        fullCourtVisible: false,
        confidence: 0,
        isProEligible: false,
        isAnalyzing: true,
      });

      try {
        // First, check the file size via HEAD request
        videoLogger.info("URL analysis - checking file size:", detectedVideoUrl);
        const urlValidation = await validateVideoUrl(detectedVideoUrl);

        if (urlValidation.errorType === 'too-large') {
          videoLogger.info("URL analysis - file too large:", urlValidation.error);
          setUrlFileSizeTooLarge(true);
          setVideoPreAnalysis(null);
          setDetectedVideoUrl(null);
          lastAnalyzedUrlRef.current = null;
          isAnalyzingUrlRef.current = false;
          return;
        }

        videoLogger.info("URL analysis starting:", detectedVideoUrl);
        const { frameBlob, durationSeconds } = await extractFirstFrameFromUrl(detectedVideoUrl, 640, 0.7);

        if (!frameBlob) {
          videoLogger.info("URL analysis - client-side extraction failed (CORS)");
          setVideoPreAnalysis({
            sport: "other",
            cameraAngle: "other",
            fullCourtVisible: false,
            confidence: 0,
            isProEligible: false,
            isAnalyzing: false,
            proEligibilityReason: "Could not preview video due to access restrictions",
            durationSeconds,
            isTechniqueLiteEligible: false,
            techniqueLiteEligibilityReason: "Could not analyze video due to access restrictions.",
          });
          return;
        }

        // Upload thumbnail and analyze in parallel
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;

        const uploadThumbnail = async () => {
          try {
            const thumbnailFile = new File([frameBlob], `thumbnail_${Date.now()}.jpg`, { type: "image/jpeg" });

            const urlResponse = await fetch("/api/s3/upload-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: thumbnailFile.name,
                contentType: thumbnailFile.type,
              }),
            });

            if (!urlResponse.ok) return;

            const { url: presignedUrl, downloadUrl, key: s3Key } = await urlResponse.json();

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
          } catch (err) {
            videoLogger.warn("URL analysis - thumbnail upload failed:", err);
          }
        };

        const formData = new FormData();
        formData.append("image", frameBlob, "frame.jpg");

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
        videoLogger.info("URL analysis result:", data);

        const { eligible: isTechniqueLiteEligible, reason: techniqueLiteEligibilityReason } =
          calculateTechniqueLiteEligibility(data.cameraAngle, durationSeconds);

        setVideoPreAnalysis({
          sport: data.sport,
          cameraAngle: data.cameraAngle,
          fullCourtVisible: data.fullCourtVisible,
          confidence: data.confidence,
          isProEligible: data.isProEligible,
          proEligibilityReason: data.proEligibilityReason,
          isAnalyzing: false,
          durationSeconds,
          isTechniqueLiteEligible,
          techniqueLiteEligibilityReason,
          thumbnailUrl,
          thumbnailS3Key,
        });

        // Update domain expertise if sport detected
        if (data.sport !== "other" && data.sport !== domainExpertise) {
          setDomainExpertise(data.sport);
          const currentChatId = getCurrentChatId();
          if (currentChatId) {
            updateChatSettings(currentChatId, { domainExpertise: data.sport });
          }

          setVideoSportDetected(data.sport);
          setTimeout(() => setVideoSportDetected(null), 2500);
        }

        isAnalyzingUrlRef.current = false;

      } catch (err) {
        videoLogger.error("URL analysis failed:", err);
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

  return {
    videoPreAnalysis,
    setVideoPreAnalysis,
    isDetectingSport,
    videoSportDetected,
    detectedVideoUrl,
    setDetectedVideoUrl,
    resetAnalysis,
    urlFileSizeTooLarge,
    setUrlFileSizeTooLarge,
    skipNextAnalysis,
  };
}
