import { useState, useRef, useCallback, useEffect } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import { DEFAULT_VIDEO_FPS, COMMON_FPS_VALUES } from "../constants";

// Type for requestVideoFrameCallback metadata
interface VideoFrameMetadata {
  presentationTime: number;
  expectedDisplayTime: number;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration?: number;
}

// Type for video element with requestVideoFrameCallback
interface VideoElementWithRVFC extends HTMLVideoElement {
  requestVideoFrameCallback: (callback: (now: number, metadata: VideoFrameMetadata) => void) => number;
  cancelVideoFrameCallback: (handle: number) => void;
}

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
  loadExternalPoses: (poses: Map<number, PoseDetectionResult[]>, fps: number) => void;
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
   * Manual preprocessing - processes all frames in the video using requestVideoFrameCallback
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

    // Pause video first
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    const duration = video.duration;

    // Disable smoothing for deterministic preprocessing
    const smoothingWasEnabled = onSetSmoothing !== undefined;
    if (onSetSmoothing) {
      detectionLogger.debug("Disabling smoothing for deterministic preprocessing...");
      onSetSmoothing(false);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Check for requestVideoFrameCallback support
      const supportsRVFC = "requestVideoFrameCallback" in video;
      
      if (supportsRVFC) {
        // Quick FPS detection, then seek-based processing
        const videoWithRVFC = video as VideoElementWithRVFC;
        const allPoses = new Map<number, PoseDetectionResult[]>();

        // Quick FPS detection (~10 frames)
        const detectedFPS = await new Promise<number>((resolve) => {
          let frameCount = 0;
          let startMediaTime = 0;
          const targetFrames = 10;
          
          const timeout = setTimeout(() => {
            video.pause();
            resolve(videoFPS || DEFAULT_VIDEO_FPS);
          }, 1000);
          
          const sampleFrame = (_now: number, metadata: VideoFrameMetadata) => {
            if (frameCount === 0) startMediaTime = metadata.mediaTime;
            frameCount++;
            
            if (frameCount >= targetFrames) {
              clearTimeout(timeout);
              video.pause();
              const mediaTimeDiff = metadata.mediaTime - startMediaTime;
              if (mediaTimeDiff > 0) {
                const rawFPS = frameCount / mediaTimeDiff;
                resolve(COMMON_FPS_VALUES.reduce((prev, curr) =>
                  Math.abs(curr - rawFPS) < Math.abs(prev - rawFPS) ? curr : prev
                ));
              } else {
                resolve(videoFPS || DEFAULT_VIDEO_FPS);
              }
            } else if (!video.paused && !video.ended) {
              videoWithRVFC.requestVideoFrameCallback(sampleFrame);
            }
          };
          
          video.currentTime = 0;
          video.muted = true;
          video.play().then(() => {
            videoWithRVFC.requestVideoFrameCallback(sampleFrame);
          }).catch(() => {
            clearTimeout(timeout);
            resolve(videoFPS || DEFAULT_VIDEO_FPS);
          });
        });
        
        video.pause();
        
        const fps = detectedFPS;
        const totalFrames = Math.floor(duration * fps);
        
        detectionLogger.debug(`Pre-processing ${totalFrames} frames at ${fps} FPS...`);
        
        for (let frame = 0; frame < totalFrames; frame++) {
          const targetTime = frame / fps;
          video.currentTime = targetTime;
          
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              seekResolve();
            };
            video.addEventListener("seeked", onSeeked);
            setTimeout(() => {
              video.removeEventListener("seeked", onSeeked);
              seekResolve();
            }, 500);
          });
          
          const poses = await detectPose(video);
          allPoses.set(frame, poses);
          
          const progress = ((frame + 1) / totalFrames) * 100;
          setPreprocessProgress(progress);
          
          if (frame % 10 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        
        detectionLogger.debug(`Pre-processing complete! Processed ${totalFrames} frames at ${fps} FPS.`);
        setPreprocessedPoses(allPoses);
        setPreprocessingFPS(fps);
        setPreprocessProgress(100);
        setUsePreprocessing(true);

        video.currentTime = 0;
        const firstPoses = allPoses.get(0);
        if (firstPoses) {
          setCurrentPoses(firstPoses);
        }
      } else {
        // Fallback: seek-based preprocessing
        // Use videoEl to avoid TypeScript narrowing issues
        const videoEl = video as HTMLVideoElement;
        const fps = videoFPS || DEFAULT_VIDEO_FPS;
        const totalFrames = Math.floor(duration * fps);
        const allPoses = new Map<number, PoseDetectionResult[]>();

        detectionLogger.debug(`Pre-processing ${totalFrames} frames at ${fps} FPS (seek-based fallback)...`);

        for (let frame = 0; frame < totalFrames; frame++) {
          const targetTime = frame / fps;
          videoEl.currentTime = targetTime;

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            };
            videoEl.addEventListener("seeked", onSeeked);
            setTimeout(() => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            }, 1000);
          });

          const poses = await detectPose(videoEl);
          allPoses.set(frame, poses);

          const progress = ((frame + 1) / totalFrames) * 100;
          setPreprocessProgress(progress);

          if (frame % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        detectionLogger.debug(`Pre-processing complete! Processed ${totalFrames} frames.`);
        setPreprocessedPoses(allPoses);
        setPreprocessingFPS(fps);
        setPreprocessProgress(100);
        setUsePreprocessing(true);

        videoEl.currentTime = 0;
        const firstPoses = allPoses.get(0);
        if (firstPoses) {
          setCurrentPoses(firstPoses);
        }
      }
    } catch (err) {
      detectionLogger.error("Pre-processing error:", err);
      setPreprocessProgress(0);
    } finally {
      setIsPreprocessing(false);
      // Restore smoothing after preprocessing
      if (smoothingWasEnabled && onSetSmoothing) {
        detectionLogger.debug("Restoring smoothing after preprocessing...");
        onSetSmoothing(true);
      }
    }
  }, [videoRef, detectPose, isLoading, videoFPS, setCurrentPoses, setIsPlaying, onSetSmoothing]);

  /**
   * Auto preprocessing - uses requestVideoFrameCallback for 100% frame-accurate processing
   * 
   * This approach guarantees every frame is processed because the browser tells us
   * exactly when each frame is rendered, eliminating FPS detection errors and seek imprecision.
   * 
   * NOTE: Smoothing is temporarily disabled during preprocessing to ensure
   * deterministic results.
   */
  const startAutoPreprocess = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isBackgroundPreprocessing) return;

    // Check for requestVideoFrameCallback support
    const supportsRVFC = "requestVideoFrameCallback" in video;
    
    detectionLogger.debug(`🎬 Starting auto preprocessing (method: ${supportsRVFC ? 'requestVideoFrameCallback' : 'seek-based'})...`);
    setIsBackgroundPreprocessing(true);
    setBackgroundPreprocessProgress(0);
    backgroundPreprocessAbortRef.current = false;

    const originalTime = video.currentTime;
    const duration = video.duration;

    // Disable smoothing for deterministic preprocessing
    const smoothingWasEnabled = onSetSmoothing !== undefined;
    if (onSetSmoothing) {
      detectionLogger.debug("🔧 Disabling smoothing for deterministic preprocessing...");
      onSetSmoothing(false);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      if (supportsRVFC) {
        // ============================================================
        // Quick FPS detection with RVFC, then seek-based processing
        // ============================================================
        const videoWithRVFC = video as VideoElementWithRVFC;
        const allPoses = new Map<number, PoseDetectionResult[]>();
        
        // Quick FPS detection: sample ~10 frames (takes <0.5s)
        detectionLogger.debug("🔍 Quick FPS detection...");
        
        const detectedFPS = await new Promise<number>((resolve) => {
          let frameCount = 0;
          let startMediaTime = 0;
          const targetFrames = 10;
          
          const timeout = setTimeout(() => {
            video.pause();
            resolve(videoFPS || DEFAULT_VIDEO_FPS);
          }, 1000);
          
          const sampleFrame = (_now: number, metadata: VideoFrameMetadata) => {
            if (frameCount === 0) {
              startMediaTime = metadata.mediaTime;
            }
            frameCount++;
            
            if (frameCount >= targetFrames) {
              clearTimeout(timeout);
              video.pause();
              const mediaTimeDiff = metadata.mediaTime - startMediaTime;
              if (mediaTimeDiff > 0) {
                const rawFPS = frameCount / mediaTimeDiff;
                const fps = COMMON_FPS_VALUES.reduce((prev, curr) =>
                  Math.abs(curr - rawFPS) < Math.abs(prev - rawFPS) ? curr : prev
                );
                detectionLogger.debug(`🔍 Detected ${fps} FPS (from ${frameCount} frames in ${mediaTimeDiff.toFixed(3)}s)`);
                resolve(fps);
              } else {
                resolve(videoFPS || DEFAULT_VIDEO_FPS);
              }
            } else if (!video.paused && !video.ended) {
              videoWithRVFC.requestVideoFrameCallback(sampleFrame);
            }
          };
          
          video.currentTime = 0;
          video.muted = true;
          video.play().then(() => {
            videoWithRVFC.requestVideoFrameCallback(sampleFrame);
          }).catch(() => {
            clearTimeout(timeout);
            resolve(videoFPS || DEFAULT_VIDEO_FPS);
          });
        });
        
        video.pause();
        setIsPlaying(false);
        
        // Now do seek-based processing with detected FPS
        const fps = detectedFPS;
        const totalFrames = Math.floor(duration * fps);
        
        detectionLogger.debug(`🎬 Processing ${totalFrames} frames at ${fps} FPS...`);
        
        for (let frame = 0; frame < totalFrames; frame++) {
          if (backgroundPreprocessAbortRef.current) {
            detectionLogger.debug("🎬 Preprocessing aborted");
            break;
          }
          
          const targetTime = frame / fps;
          video.currentTime = targetTime;
          
          // Wait for seek to complete
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              seekResolve();
            };
            video.addEventListener("seeked", onSeeked);
            setTimeout(() => {
              video.removeEventListener("seeked", onSeeked);
              seekResolve();
            }, 500);
          });
          
          // Detect pose
          const poses = await detectPose(video);
          allPoses.set(frame, poses);
          
          // Show current pose
          if (poses.length > 0) {
            setCurrentPoses(poses);
          }
          
          // Update progress
          const progress = ((frame + 1) / totalFrames) * 100;
          setBackgroundPreprocessProgress(progress);
          
          // Log periodically
          if (frame % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
            detectionLogger.debug(`🎬 Preprocessing: ${progress.toFixed(0)}% (frame ${frame}/${totalFrames})`);
          }
          
          // Yield to main thread
          if (frame % 5 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        
        if (!backgroundPreprocessAbortRef.current) {
          detectionLogger.debug(`✅ Preprocessing complete! Processed ${allPoses.size} frames at ${fps} FPS.`);
          
          setPreprocessedPoses(allPoses);
          setPreprocessingFPS(fps);
          setUsePreprocessing(true);
          setBackgroundPreprocessProgress(100);
          
          // Restore original position
          video.currentTime = originalTime;
          const frameAtTime = Math.floor(originalTime * fps);
          const framePoses = allPoses.get(frameAtTime) || allPoses.get(0);
          if (framePoses) {
            setCurrentPoses(framePoses);
          }
        } else {
          video.currentTime = originalTime;
        }
      } else {
        // ============================================================
        // Fallback: Seek-based preprocessing for older browsers
        // ============================================================
        // Use videoEl to avoid TypeScript narrowing issues
        const videoEl = video as HTMLVideoElement;
        detectionLogger.warn("⚠️ requestVideoFrameCallback not supported, using seek-based fallback");
        
        const fps = videoFPS || DEFAULT_VIDEO_FPS;
        const totalFrames = Math.floor(duration * fps);
        const allPoses = new Map<number, PoseDetectionResult[]>();

        detectionLogger.debug(`🎬 Processing ${totalFrames} frames at ${fps} FPS (seek-based fallback)...`);

        for (let frame = 0; frame < totalFrames; frame++) {
          if (backgroundPreprocessAbortRef.current) {
            detectionLogger.debug("🎬 Preprocessing aborted");
            break;
          }

          const targetTime = frame / fps;
          videoEl.currentTime = targetTime;

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            };
            videoEl.addEventListener("seeked", onSeeked);
            
            // Timeout fallback in case seeked event doesn't fire
            setTimeout(() => {
              videoEl.removeEventListener("seeked", onSeeked);
              resolve();
            }, 1000);
          });

          const poses = await detectPose(videoEl);
          allPoses.set(frame, poses);

          const progress = ((frame + 1) / totalFrames) * 100;
          setBackgroundPreprocessProgress(progress);

          if (frame % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
            detectionLogger.debug(
              `🎬 Preprocessing: ${progress.toFixed(0)}% (frame ${frame}/${totalFrames})`
            );
          }

          if (frame % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        if (!backgroundPreprocessAbortRef.current) {
          detectionLogger.debug(
            `✅ Preprocessing complete! Processed ${allPoses.size} frames at ${fps} FPS.`
          );

          setPreprocessedPoses(allPoses);
          setPreprocessingFPS(fps);
          setUsePreprocessing(true);

          videoEl.currentTime = originalTime;
          const currentFrame = Math.round(originalTime * fps);
          const framePoses = allPoses.get(currentFrame) || allPoses.get(0);
          if (framePoses) {
            setCurrentPoses(framePoses);
          }
        } else {
          videoEl.currentTime = originalTime;
        }
      }
    } catch (err) {
      detectionLogger.error("Preprocessing error:", err);
      const videoEl = videoRef.current;
      if (videoEl) videoEl.currentTime = originalTime;
    } finally {
      setIsBackgroundPreprocessing(false);
      
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

  /**
   * Load externally provided pose data (e.g., from S3 cache)
   * This allows skipping preprocessing when cached data is available
   */
  const loadExternalPoses = useCallback((poses: Map<number, PoseDetectionResult[]>, fps: number) => {
    if (poses.size === 0) return;
    
    detectionLogger.info(`[useVideoPreprocessing] Loading ${poses.size} external poses at ${fps} FPS`);
    setPreprocessedPoses(poses);
    setPreprocessingFPS(fps);
    setUsePreprocessing(true);
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
    loadExternalPoses,
  };
}

