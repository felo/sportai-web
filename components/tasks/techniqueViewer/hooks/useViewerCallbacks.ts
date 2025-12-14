import { useCallback, useMemo } from "react";
import type { ViewerState, PoseDetectionResult, ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import type { DirtyFlags } from "../types";

interface UseViewerCallbacksOptions {
  viewerRef: React.RefObject<ViewerActions | null>;
  setViewerState: React.Dispatch<React.SetStateAction<ViewerState>>;
  setProtocolEvents: React.Dispatch<React.SetStateAction<ProtocolEvent[]>>;
  setConfidenceThreshold: React.Dispatch<React.SetStateAction<number>>;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
  serverDataHook: {
    calculateOverallConfidence: (poses: Map<number, PoseDetectionResult[]>) => number | null;
    setOverallConfidence: React.Dispatch<React.SetStateAction<number | null>>;
    saveAfterPreprocess: (frameCount: number, fps: number) => Promise<void>;
  };
}

/**
 * Hook that provides all the callbacks needed by VideoPoseViewerV2.
 * Centralizes viewer event handling logic.
 */
export function useViewerCallbacks({
  viewerRef,
  setViewerState,
  setProtocolEvents,
  setConfidenceThreshold,
  setDirtyFlags,
  serverDataHook,
}: UseViewerCallbacksOptions) {
  const handlePoseChange = useCallback(
    (poses: PoseDetectionResult[], frame: number) => {
      setViewerState((prev) => ({ ...prev, currentPoses: poses, currentFrame: frame }));
    },
    [setViewerState]
  );

  const handleVideoLoad = useCallback(
    (width: number, height: number, duration: number, fps: number) => {
      setViewerState((prev) => ({
        ...prev,
        isVideoReady: true,
        videoDimensions: { width, height },
        isPortrait: height > width,
        duration,
        videoFPS: fps,
        totalFrames: Math.floor(duration * fps),
      }));
    },
    [setViewerState]
  );

  const handlePlaybackChange = useCallback(
    (isPlaying: boolean) => {
      setViewerState((prev) => ({ ...prev, isPlaying }));
    },
    [setViewerState]
  );

  const handleTimeUpdate = useCallback(
    (currentTime: number, currentFrame: number) => {
      setViewerState((prev) => ({ ...prev, currentTime, currentFrame }));
    },
    [setViewerState]
  );

  const handleFPSDetected = useCallback(
    (fps: number, method: "default" | "counted" | "metadata") => {
      setViewerState((prev) => ({
        ...prev,
        videoFPS: fps,
        fpsDetectionMethod: method,
        totalFrames: Math.floor(prev.duration * fps),
      }));
    },
    [setViewerState]
  );

  const handlePreprocessComplete = useCallback(
    async (frameCount: number, fps: number) => {
      setViewerState((prev) => ({
        ...prev,
        usingPreprocessedPoses: true,
        preprocessedFrameCount: frameCount,
        isPreprocessing: false,
      }));

      // Calculate overall confidence
      if (viewerRef.current) {
        const poses = viewerRef.current.getPreprocessedPoses();
        const avgConfidence = serverDataHook.calculateOverallConfidence(poses);
        if (avgConfidence !== null) {
          serverDataHook.setOverallConfidence(avgConfidence);
        }
      }

      // Auto-save to server
      await serverDataHook.saveAfterPreprocess(frameCount, fps);
    },
    [viewerRef, setViewerState, serverDataHook]
  );

  const handleError = useCallback(
    (error: string) => {
      setViewerState((prev) => ({ ...prev, error }));
    },
    [setViewerState]
  );

  const handleProtocolEvents = useCallback(
    (events: ProtocolEvent[]) => {
      setProtocolEvents(events);
    },
    [setProtocolEvents]
  );

  const handleHandednessDetected = useCallback(
    (dominantHand: "left" | "right", confidence: number) => {
      setViewerState((prev) => ({
        ...prev,
        handednessResult: { dominantHand, confidence },
      }));
    },
    [setViewerState]
  );

  const handleActiveTabChange = useCallback(
    (activeTab: "swings" | "moments" | "data-analysis" | "performance") => {
      setViewerState((prev) => ({ ...prev, activeTab }));
    },
    [setViewerState]
  );

  const handleConfidenceThresholdChange = useCallback(
    (threshold: number) => {
      setConfidenceThreshold(threshold);
      setDirtyFlags((prev) => ({ ...prev, userPreferences: true }));
    },
    [setConfidenceThreshold, setDirtyFlags]
  );

  // Memoized callbacks object for VideoPoseViewerV2
  const viewerCallbacks = useMemo(
    () => ({
      onPoseChange: handlePoseChange,
      onVideoLoad: handleVideoLoad,
      onPlaybackChange: handlePlaybackChange,
      onTimeUpdate: handleTimeUpdate,
      onFPSDetected: handleFPSDetected,
      onPreprocessComplete: handlePreprocessComplete,
      onHandednessDetected: handleHandednessDetected,
      onProtocolEvents: handleProtocolEvents,
      onError: handleError,
      onActiveTabChange: handleActiveTabChange,
    }),
    [
      handlePoseChange,
      handleVideoLoad,
      handlePlaybackChange,
      handleTimeUpdate,
      handleFPSDetected,
      handlePreprocessComplete,
      handleHandednessDetected,
      handleProtocolEvents,
      handleError,
      handleActiveTabChange,
    ]
  );

  return {
    viewerCallbacks,
    handleConfidenceThresholdChange,
  };
}
