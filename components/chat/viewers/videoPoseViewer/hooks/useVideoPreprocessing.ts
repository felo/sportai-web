import { useState, useRef, useCallback, useEffect } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import { DEFAULT_VIDEO_FPS } from "../constants";

export interface UseVideoPreprocessingProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detectPose: ((video: HTMLVideoElement) => Promise<PoseDetectionResult[]>) | undefined;
  videoFPS: number;
  isLoading: boolean;
  isPoseEnabled: boolean;
  isVideoMetadataLoaded: boolean;
  compactMode: boolean;
  allowPreprocessing: boolean;
  setCurrentPoses: (poses: PoseDetectionResult[]) => void;
  setIsPlaying: (playing: boolean) => void;
  /** Callback to temporarily disable smoothing during preprocessing for deterministic results */
  onSetSmoothing?: (enabled: boolean) => void;
}

export interface VideoPreprocessingState {
  isPreprocessing: boolean;
  preprocessProgress: number;
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  preprocessingFPS: number;
  usePreprocessing: boolean;
  isBackgroundPreprocessing: boolean;
  backgroundPreprocessProgress: number;
}

export interface VideoPreprocessingActions {
  handlePreprocess: () => Promise<void>;
  startAutoPreprocess: () => Promise<void>;
  cancelBackgroundPreprocess: () => void;
  setUsePreprocessing: (use: boolean) => void;
  clearPreprocessedPoses: () => void;
}

/**
 * Hook to manage video preprocessing for pose detection.
 * Handles manual preprocessing, auto-preprocessing, and background processing.
 */
export function useVideoPreprocessing({
  videoRef,
  detectPose,
  videoFPS,
  isLoading,
  isPoseEnabled,
  isVideoMetadataLoaded,
  compactMode,
  allowPreprocessing,
  setCurrentPoses,
  setIsPlaying,
  onSetSmoothing,
}: UseVideoPreprocessingProps): VideoPreprocessingState & VideoPreprocessingActions {
  // State
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessProgress, setPreprocessProgress] = useState(0);
  const [preprocessedPoses, setPreprocessedPoses] = useState<Map<number, PoseDetectionResult[]>>(
    new Map()
  );
  const [preprocessingFPS, setPreprocessingFPS] = useState<number>(30);
  const [usePreprocessing, setUsePreprocessing] = useState(false);
  const [isBackgroundPreprocessing, setIsBackgroundPreprocessing] = useState(false);
  const [backgroundPreprocessProgress, setBackgroundPreprocessProgress] = useState(0);

  // Refs
  const backgroundPreprocessAbortRef = useRef<boolean>(false);

  /**
   * Manual preprocessing - processes all frames in the video
   * 
   * NOTE: Smoothing is temporarily disabled during preprocessing to ensure
   * deterministic results. The pose detector's temporal smoothing uses
   * previous frames, which can cause non-determinism during frame seeking.
   */
  const handlePreprocess = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isLoading) return;

    setIsPreprocessing(true);
    setPreprocessProgress(0);
    setPreprocessedPoses(new Map());

    // Pause video
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    // Disable smoothing for deterministic preprocessing
    // This ensures the same frames produce the same results every time
    const smoothingWasEnabled = onSetSmoothing !== undefined;
    if (onSetSmoothing) {
      detectionLogger.debug("Disabling smoothing for deterministic preprocessing...");
      onSetSmoothing(false);
      // Wait for detector to reinitialize without smoothing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const fps = videoFPS;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      const allPoses = new Map<number, PoseDetectionResult[]>();

      detectionLogger.debug(`Pre-processing ${totalFrames} frames at ${fps} FPS (smoothing disabled)...`);

      for (let frame = 0; frame < totalFrames; frame++) {
        const targetTime = frame / fps;
        video.currentTime = targetTime;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
        });

        const poses = await detectPose(video);
        allPoses.set(frame, poses);

        const progress = ((frame + 1) / totalFrames) * 100;
        setPreprocessProgress(progress);

        if (frame % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      detectionLogger.debug(`Pre-processing complete! Processed ${totalFrames} frames.`);
      setPreprocessedPoses(allPoses);
      setIsPreprocessing(false);
      setPreprocessProgress(100);
      setUsePreprocessing(true);

      video.currentTime = 0;
      const firstPoses = allPoses.get(0);
      if (firstPoses) {
        setCurrentPoses(firstPoses);
      }
    } catch (err) {
      detectionLogger.error("Pre-processing error:", err);
      setIsPreprocessing(false);
      setPreprocessProgress(0);
    } finally {
      // Restore smoothing after preprocessing
      if (smoothingWasEnabled && onSetSmoothing) {
        detectionLogger.debug("Restoring smoothing after preprocessing...");
        onSetSmoothing(true);
      }
    }
  }, [videoRef, detectPose, isLoading, videoFPS, setCurrentPoses, setIsPlaying, onSetSmoothing]);

  /**
   * Auto preprocessing - runs in background with FPS detection
   * 
   * NOTE: Smoothing is temporarily disabled during preprocessing to ensure
   * deterministic results.
   */
  const startAutoPreprocess = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isBackgroundPreprocessing) return;

    detectionLogger.debug("🎬 Starting auto preprocessing...");
    setIsBackgroundPreprocessing(true);
    setBackgroundPreprocessProgress(0);
    backgroundPreprocessAbortRef.current = false;

    const originalTime = video.currentTime;

    // Disable smoothing for deterministic preprocessing
    const smoothingWasEnabled = onSetSmoothing !== undefined;
    if (onSetSmoothing) {
      detectionLogger.debug("🔧 Disabling smoothing for deterministic preprocessing...");
      onSetSmoothing(false);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Step 1: Quick FPS detection
      let detectedFPS = videoFPS;

      if (videoFPS === DEFAULT_VIDEO_FPS && "requestVideoFrameCallback" in video) {
        detectionLogger.debug("🔍 Detecting FPS...");

        detectedFPS = await new Promise<number>((resolve) => {
          let frameCount = 0;
          let startMediaTime = 0;
          const maxFrames = 20;
          const timeout = setTimeout(() => {
            video.pause();
            detectionLogger.debug("⏱️ FPS detection timeout, using default");
            resolve(DEFAULT_VIDEO_FPS);
          }, 1500);

          const callback = (_now: number, metadata: { mediaTime?: number }) => {
            if (frameCount === 0) {
              startMediaTime = metadata.mediaTime || 0;
            }
            frameCount++;

            if (frameCount >= maxFrames) {
              clearTimeout(timeout);
              video.pause();

              const mediaTimeDiff = (metadata.mediaTime || 0) - startMediaTime;
              let fps = DEFAULT_VIDEO_FPS;
              if (mediaTimeDiff > 0) {
                fps = Math.round(frameCount / mediaTimeDiff);
                const COMMON_FPS = [24, 25, 30, 50, 60, 120];
                fps = COMMON_FPS.reduce((prev, curr) =>
                  Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
                );
              }
              detectionLogger.debug(
                `🔍 Detected FPS: ${fps} (from ${frameCount} frames in ${mediaTimeDiff.toFixed(3)}s)`
              );
              resolve(fps);
            } else if (!video.paused && !video.ended) {
              (video as unknown as { requestVideoFrameCallback: (cb: typeof callback) => void }).requestVideoFrameCallback(callback);
            }
          };

          video.currentTime = 0;
          video.play().then(() => {
            (video as unknown as { requestVideoFrameCallback: (cb: typeof callback) => void }).requestVideoFrameCallback(callback);
          }).catch(() => {
            clearTimeout(timeout);
            resolve(DEFAULT_VIDEO_FPS);
          });
        });

        video.pause();
        setIsPlaying(false);
      } else {
        video.pause();
        setIsPlaying(false);
      }

      // Step 2: Preprocessing with detected FPS
      const fps = detectedFPS;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      const allPoses = new Map<number, PoseDetectionResult[]>();

      detectionLogger.debug(`🎬 Processing ${totalFrames} frames at ${fps} FPS...`);

      for (let frame = 0; frame < totalFrames; frame++) {
        if (backgroundPreprocessAbortRef.current) {
          detectionLogger.debug("🎬 Preprocessing aborted");
          break;
        }

        const targetTime = frame / fps;
        video.currentTime = targetTime;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
        });

        const poses = await detectPose(video);
        allPoses.set(frame, poses);

        const progress = ((frame + 1) / totalFrames) * 100;
        setBackgroundPreprocessProgress(progress);

        if (frame % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
          detectionLogger.debug(
            `🎬 Preprocessing: ${progress.toFixed(0)}% (frame ${frame}/${totalFrames})`
          );
        }

        if (frame % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      if (!backgroundPreprocessAbortRef.current) {
        detectionLogger.debug(
          `✅ Preprocessing complete! Processed ${allPoses.size} frames at ${fps} FPS.`
        );

        setPreprocessedPoses(allPoses);
        setPreprocessingFPS(fps);
        setUsePreprocessing(true);

        video.currentTime = originalTime;
        const currentFrame = Math.round(originalTime * fps);
        const framePoses = allPoses.get(currentFrame) || allPoses.get(0);
        if (framePoses) {
          setCurrentPoses(framePoses);
        }
      } else {
        video.currentTime = originalTime;
      }
    } catch (err) {
      detectionLogger.error("Preprocessing error:", err);
      video.currentTime = originalTime;
    } finally {
      setIsBackgroundPreprocessing(false);
      setBackgroundPreprocessProgress(0);
      
      // Restore smoothing after preprocessing
      if (smoothingWasEnabled && onSetSmoothing) {
        detectionLogger.debug("🔧 Restoring smoothing after preprocessing...");
        onSetSmoothing(true);
      }
    }
  }, [videoRef, detectPose, isBackgroundPreprocessing, videoFPS, setCurrentPoses, setIsPlaying, onSetSmoothing]);

  /**
   * Cancel background preprocessing
   */
  const cancelBackgroundPreprocess = useCallback(() => {
    backgroundPreprocessAbortRef.current = true;
  }, []);

  /**
   * Clear preprocessed poses
   */
  const clearPreprocessedPoses = useCallback(() => {
    setUsePreprocessing(false);
    setPreprocessedPoses(new Map());
  }, []);

  // Auto-start preprocessing when AI overlay is enabled
  useEffect(() => {
    const canPreprocess =
      isPoseEnabled &&
      !isLoading &&
      !isBackgroundPreprocessing &&
      !usePreprocessing &&
      preprocessedPoses.size === 0 &&
      isVideoMetadataLoaded &&
      !compactMode &&
      allowPreprocessing;

    detectionLogger.debug("🔍 Preprocessing check:", {
      isPoseEnabled,
      isLoading,
      isBackgroundPreprocessing,
      usePreprocessing,
      preprocessedPosesSize: preprocessedPoses.size,
      isVideoMetadataLoaded,
      compactMode,
      allowPreprocessing,
      canPreprocess,
    });

    if (!canPreprocess) return;

    detectionLogger.debug("🎬 AI overlay enabled, starting preprocessing...");
    const timer = setTimeout(() => {
      startAutoPreprocess();
    }, 100);
    return () => clearTimeout(timer);
  }, [
    isPoseEnabled,
    isLoading,
    isBackgroundPreprocessing,
    usePreprocessing,
    preprocessedPoses.size,
    isVideoMetadataLoaded,
    startAutoPreprocess,
    compactMode,
    allowPreprocessing,
  ]);

  // Cancel preprocessing when AI overlay is disabled
  useEffect(() => {
    if (!isPoseEnabled && isBackgroundPreprocessing) {
      cancelBackgroundPreprocess();
    }
  }, [isPoseEnabled, isBackgroundPreprocessing, cancelBackgroundPreprocess]);

  return {
    // State
    isPreprocessing,
    preprocessProgress,
    preprocessedPoses,
    preprocessingFPS,
    usePreprocessing,
    isBackgroundPreprocessing,
    backgroundPreprocessProgress,
    // Actions
    handlePreprocess,
    startAutoPreprocess,
    cancelBackgroundPreprocess,
    setUsePreprocessing,
    clearPreprocessedPoses,
  };
}

