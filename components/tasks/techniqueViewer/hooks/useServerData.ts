import { useState, useEffect, useCallback } from "react";
import type { ViewerConfig, ViewerActions, PoseDetectionResult } from "@/components/videoPoseViewerV2";
import type { DirtyFlags } from "../types";
import type { CustomEvent, VideoComment } from "../components";
import type { SwingBoundaryAdjustment, ProtocolAdjustment } from "../utils";
import {
  loadPoseData,
  savePoseData,
  convertToPreprocessedPoses,
  convertToProtocolAdjustments,
  convertToSwingBoundaryAdjustments,
} from "@/lib/poseDataService";
import { SAVE_DEBOUNCE_MS } from "../constants";

interface UseServerDataOptions {
  videoS3Key: string | null;
  /** Direct URL to load pose data from (for sample tasks in public buckets) */
  poseDataUrl?: string;
  viewerRef: React.RefObject<ViewerActions | null>;
  viewerState: {
    isVideoReady: boolean;
    videoFPS: number;
    totalFrames: number;
  };
  config: ViewerConfig;
  dirtyFlags: DirtyFlags;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
  
  // Setters for loaded data
  setCustomEvents: React.Dispatch<React.SetStateAction<CustomEvent[]>>;
  setVideoComments: React.Dispatch<React.SetStateAction<VideoComment[]>>;
  setProtocolAdjustments: React.Dispatch<
    React.SetStateAction<Map<string, ProtocolAdjustment>>
  >;
  setSwingBoundaryAdjustments: React.Dispatch<
    React.SetStateAction<Map<string, SwingBoundaryAdjustment>>
  >;
  setConfidenceThreshold: React.Dispatch<React.SetStateAction<number>>;
  setPoseEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Current state for saving
  customEvents: CustomEvent[];
  videoComments: VideoComment[];
  protocolAdjustments: Map<string, ProtocolAdjustment>;
  swingBoundaryAdjustments: Map<string, SwingBoundaryAdjustment>;
  confidenceThreshold: number;
}

/**
 * Hook for managing server data loading and saving.
 * Handles automatic loading on mount and debounced saving when data changes.
 */
export function useServerData({
  videoS3Key,
  poseDataUrl,
  viewerRef,
  viewerState,
  config,
  dirtyFlags,
  setDirtyFlags,
  setCustomEvents,
  setVideoComments,
  setProtocolAdjustments,
  setSwingBoundaryAdjustments,
  setConfidenceThreshold,
  setPoseEnabled,
  customEvents,
  videoComments,
  protocolAdjustments,
  swingBoundaryAdjustments,
  confidenceThreshold,
}: UseServerDataOptions) {
  // Loading state
  const [serverDataLoaded, setServerDataLoaded] = useState(false);
  const [serverDataChecked, setServerDataChecked] = useState(false);
  const [isLoadingServerData, setIsLoadingServerData] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);

  /**
   * Calculate overall confidence from poses.
   */
  const calculateOverallConfidence = useCallback(
    (poses: Map<number, PoseDetectionResult[]>) => {
      if (poses.size === 0) return null;

      let totalScore = 0;
      let scoreCount = 0;

      poses.forEach((framePoses) => {
        framePoses.forEach((pose) => {
          if (pose.score !== undefined && pose.score > 0) {
            totalScore += pose.score;
            scoreCount++;
          }
        });
      });

      if (scoreCount > 0) {
        return totalScore / scoreCount;
      }
      return null;
    },
    []
  );

  /**
   * Load pose data from server.
   */
  const loadFromServer = useCallback(async () => {
    // Need either videoS3Key or poseDataUrl to load data
    if ((!videoS3Key && !poseDataUrl) || serverDataChecked || isLoadingServerData) return;
    if (!viewerState.isVideoReady) return;
    if (!viewerRef.current) return;

    setIsLoadingServerData(true);

    try {
      // Use direct URL for sample tasks, otherwise use S3 key
      const result = await loadPoseData(videoS3Key || "", poseDataUrl);

      if (result.success && result.data) {
        // Convert stored data to Map format
        const posesMap = convertToPreprocessedPoses(result.data);

        // Load into viewer
        viewerRef.current.setPreprocessedPoses(posesMap, result.data.videoFPS);
        setServerDataLoaded(true);

        // Calculate overall confidence
        const avgConfidence = calculateOverallConfidence(posesMap);
        if (avgConfidence !== null) {
          setOverallConfidence(avgConfidence);
          console.log(
            `[useServerData] Loaded confidence: ${(avgConfidence * 100).toFixed(1)}%`
          );
        }

        // Load custom events
        if (result.data.customEvents?.length) {
          setCustomEvents(result.data.customEvents);
          console.log(
            `[useServerData] Loaded ${result.data.customEvents.length} custom events`
          );
        }

        // Load protocol adjustments
        if (result.data.protocolAdjustments?.length) {
          const adjustmentsMap = convertToProtocolAdjustments(result.data);
          setProtocolAdjustments(adjustmentsMap);
          console.log(
            `[useServerData] Loaded ${result.data.protocolAdjustments.length} protocol adjustments`
          );
        }

        // Load video comments
        if (result.data.videoComments?.length) {
          setVideoComments(result.data.videoComments);
          console.log(
            `[useServerData] Loaded ${result.data.videoComments.length} video comments`
          );
        }

        // Load swing boundary adjustments
        if (result.data.swingBoundaryAdjustments?.length) {
          const boundaryMap = convertToSwingBoundaryAdjustments(result.data);
          setSwingBoundaryAdjustments(boundaryMap);
          console.log(
            `[useServerData] Loaded ${result.data.swingBoundaryAdjustments.length} swing boundary adjustments`
          );
        }

        // Load user preferences
        if (result.data.userPreferences?.confidenceThreshold !== undefined) {
          setConfidenceThreshold(result.data.userPreferences.confidenceThreshold);
          console.log(
            `[useServerData] Loaded confidence threshold: ${(result.data.userPreferences.confidenceThreshold * 100).toFixed(0)}%`
          );
        }

        console.log(`[useServerData] Loaded ${posesMap.size} frames from server`);
      } else {
        console.log(`[useServerData] No server data found, will need preprocessing`);
      }
    } catch (error) {
      console.error(`[useServerData] Failed to load server data:`, error);
    } finally {
      setIsLoadingServerData(false);
      setServerDataChecked(true);
      console.log(`[useServerData] Server check complete, enabling pose detection`);
      setPoseEnabled(true);
    }
  }, [
    videoS3Key,
    poseDataUrl,
    viewerState.isVideoReady,
    serverDataChecked,
    isLoadingServerData,
    viewerRef,
    calculateOverallConfidence,
    setCustomEvents,
    setProtocolAdjustments,
    setVideoComments,
    setSwingBoundaryAdjustments,
    setConfidenceThreshold,
    setPoseEnabled,
  ]);

  // Auto-load from server when video is ready
  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  /**
   * Save pose data to server after preprocessing.
   */
  const saveAfterPreprocess = useCallback(
    async (frameCount: number, fps: number) => {
      if (!videoS3Key || serverDataLoaded || autoSaved || !viewerRef.current) {
        return;
      }

      const poses = viewerRef.current.getPreprocessedPoses();
      if (poses.size === 0) return;

      console.log(`[useServerData] Auto-saving ${poses.size} frames to server...`);
      try {
        const result = await savePoseData(
          videoS3Key,
          poses,
          fps,
          config.model.model
        );
        if (result.success) {
          setAutoSaved(true);
          console.log(`[useServerData] Auto-saved successfully`);
        } else {
          console.error(`[useServerData] Auto-save failed:`, result.error);
        }
      } catch (error) {
        console.error(`[useServerData] Auto-save error:`, error);
      }
    },
    [videoS3Key, serverDataLoaded, autoSaved, viewerRef, config.model.model]
  );

  // Unified debounced save for all dirty data
  useEffect(() => {
    const hasDirtyData =
      dirtyFlags.videoComments ||
      dirtyFlags.swingBoundaries ||
      dirtyFlags.protocolAdjustments ||
      dirtyFlags.customEvents ||
      dirtyFlags.userPreferences;

    // Don't save until server data has been checked
    if (!videoS3Key || !hasDirtyData || !serverDataChecked) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        // Load current server data once
        const existing = await loadPoseData(videoS3Key);

        // Build updated data with all current state
        const baseData =
          existing.success && existing.data
            ? existing.data
            : {
                version: "1.0.0",
                createdAt: new Date().toISOString(),
                videoFPS: viewerState.videoFPS || 30,
                totalFrames: viewerState.totalFrames || 0,
                modelUsed: config.model.model || "none",
                poses: {},
              };

        const updatedData = {
          videoS3Key,
          ...baseData,
          ...(dirtyFlags.videoComments && {
            videoComments: videoComments.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              color: c.color,
              x: c.x,
              y: c.y,
              time: c.time,
              frame: c.frame,
              createdAt: c.createdAt,
            })),
          }),
          ...(dirtyFlags.swingBoundaries && {
            swingBoundaryAdjustments: Array.from(
              swingBoundaryAdjustments.entries()
            ).map(([eventId, adj]) => ({
              eventId,
              startTime: adj.startTime,
              startFrame: adj.startFrame,
              endTime: adj.endTime,
              endFrame: adj.endFrame,
              adjustedAt: Date.now(),
            })),
          }),
          ...(dirtyFlags.protocolAdjustments && {
            protocolAdjustments: Array.from(protocolAdjustments.entries()).map(
              ([eventId, adj]) => ({
                eventId,
                protocolId: "unknown",
                time: adj.time,
                frame: adj.frame,
                adjustedAt: Date.now(),
              })
            ),
          }),
          ...(dirtyFlags.customEvents && {
            customEvents: customEvents.map((e) => ({
              id: e.id,
              name: e.name,
              color: e.color,
              time: e.time,
              frame: e.frame,
              createdAt: e.createdAt,
            })),
          }),
          ...(dirtyFlags.userPreferences && {
            userPreferences: {
              confidenceThreshold,
            },
          }),
        };

        // Save all at once
        const response = await fetch("/api/pose-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });

        if (response.ok) {
          console.log(`[useServerData] Unified save completed`);
          setDirtyFlags({
            videoComments: false,
            swingBoundaries: false,
            protocolAdjustments: false,
            customEvents: false,
            userPreferences: false,
          });
        } else {
          console.error(
            `[useServerData] Unified save failed:`,
            await response.text()
          );
        }
      } catch (error) {
        console.error(`[useServerData] Unified save error:`, error);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [
    videoS3Key,
    dirtyFlags,
    videoComments,
    swingBoundaryAdjustments,
    protocolAdjustments,
    customEvents,
    confidenceThreshold,
    serverDataChecked,
    viewerState.videoFPS,
    viewerState.totalFrames,
    config.model.model,
    setDirtyFlags,
  ]);

  // Determine if loading overlay should be shown
  const showServerLoadingOverlay =
    !!videoS3Key &&
    (!serverDataChecked ||
      (serverDataLoaded && !viewerRef.current?.getPreprocessedPoses?.()?.size));

  return {
    // State
    serverDataLoaded,
    serverDataChecked,
    isLoadingServerData,
    autoSaved,
    overallConfidence,
    showServerLoadingOverlay,

    // Actions
    saveAfterPreprocess,
    setOverallConfidence,
    calculateOverallConfidence,
  };
}
