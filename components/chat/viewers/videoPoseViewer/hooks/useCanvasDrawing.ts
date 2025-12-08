import { useEffect, useRef, useCallback } from "react";
import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";
import type { CourtCorners } from "@/types/frame-analysis";
import {
  drawTrajectories,
  drawPoses,
  drawAngles,
  drawObjects,
  drawProjectileResult,
  drawCourtOverlay,
  type LabelPositionState,
  type TrajectoryPoint,
} from "../utils";

export interface UseCanvasDrawingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentPoses: PoseDetectionResult[];
  selectedPose: PoseDetectionResult | null;
  selectedModel: SupportedModel;
  showSkeleton: boolean;
  showFaceLandmarks: boolean;
  showTrackingId: boolean;
  showAngles: boolean;
  measuredAngles: Array<[number, number, number]>;
  selectedAngleJoints: number[];
  showTrajectories: boolean;
  smoothTrajectories: boolean;
  jointTrajectories: Map<number, TrajectoryPoint[]>;
  isObjectDetectionEnabled: boolean;
  currentObjects: Array<{
    bbox: { x: number; y: number; width: number; height: number };
    [key: string]: unknown;
  }>;
  showObjectLabels: boolean;
  isProjectileDetectionEnabled: boolean;
  currentProjectile: {
    position: { x: number; y: number };
    trajectory?: Array<{ x: number; y: number; frame: number; timestamp: number }>;
    predictedPath?: Array<{ x: number; y: number; confidence: number }>;
    [key: string]: unknown;
  } | null;
  showCourtOverlay: boolean;
  courtResult: {
    found: boolean;
    corners?: CourtCorners;
    courtType?: string;
  } | null;
  isPlaying: boolean;
  dimensions: { width: number; height: number };
}

/**
 * Hook that handles all canvas drawing for the video pose viewer.
 * Consolidates drawing of trajectories, poses, angles, objects, projectiles, and court overlays.
 */
export function useCanvasDrawing({
  canvasRef,
  videoRef,
  currentPoses,
  selectedPose,
  selectedModel,
  showSkeleton,
  showFaceLandmarks,
  showTrackingId,
  showAngles,
  measuredAngles,
  selectedAngleJoints,
  showTrajectories,
  smoothTrajectories,
  jointTrajectories,
  isObjectDetectionEnabled,
  currentObjects,
  showObjectLabels,
  isProjectileDetectionEnabled,
  currentProjectile,
  showCourtOverlay,
  courtResult,
  isPlaying,
  dimensions,
}: UseCanvasDrawingProps) {
  // Label position state for angle stability
  const labelPositionStateRef = useRef<Map<string, LabelPositionState>>(new Map());

  // Clean up label position state when angles are removed
  useEffect(() => {
    const currentAngleKeys = new Set(
      measuredAngles.map(([a, b, c]) => `${a}-${b}-${c}`)
    );

    const keysToRemove: string[] = [];
    labelPositionStateRef.current.forEach((_, key) => {
      if (!currentAngleKeys.has(key)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => labelPositionStateRef.current.delete(key));
  }, [measuredAngles]);

  // Main drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trajectories first (behind skeleton)
    if (showTrajectories && jointTrajectories.size > 0) {
      let scaleX: number, scaleY: number;
      if (selectedModel === "BlazePose") {
        const blazePoseInputWidth = 830 * 1.2;
        const blazePoseInputHeight = 467 * 1.2;
        scaleX = canvas.width / blazePoseInputWidth;
        scaleY = canvas.height / blazePoseInputHeight;
      } else {
        scaleX = canvas.width / video.videoWidth;
        scaleY = canvas.height / video.videoHeight;
      }

      drawTrajectories({
        ctx,
        jointTrajectories,
        scaleX,
        scaleY,
        smoothEnabled: smoothTrajectories,
      });
    }

    // Draw poses and tracking boxes
    if (currentPoses.length > 0) {
      drawPoses({
        ctx,
        canvas,
        video,
        currentPoses,
        selectedModel,
        showSkeleton,
        showFaceLandmarks,
        showTrackingId,
      });
    }

    // Draw angles
    if (showAngles && currentPoses.length > 0 && selectedPose) {
      const newLabelState = drawAngles({
        ctx,
        canvas,
        video,
        selectedPose,
        selectedModel,
        measuredAngles,
        selectedAngleJoints,
        labelPositionState: labelPositionStateRef.current,
        isPlaying,
      });
      labelPositionStateRef.current = newLabelState;
    }

    // Draw object detection results
    if (isObjectDetectionEnabled && currentObjects.length > 0) {
      drawObjects({
        ctx,
        canvas,
        video,
        currentObjects,
        showLabels: showObjectLabels,
      });
    }

    // Draw projectile detection results
    if (isProjectileDetectionEnabled && currentProjectile) {
      drawProjectileResult({
        ctx,
        canvas,
        video,
        currentProjectile,
      });
    }

    // Draw court overlay
    if (showCourtOverlay && courtResult?.found && courtResult.corners) {
      drawCourtOverlay({
        ctx,
        canvas,
        corners: courtResult.corners,
        courtType: courtResult.courtType,
      });
    }
  }, [
    canvasRef,
    videoRef,
    currentPoses,
    selectedPose,
    selectedModel,
    showSkeleton,
    showFaceLandmarks,
    showTrackingId,
    showAngles,
    measuredAngles,
    selectedAngleJoints,
    showTrajectories,
    smoothTrajectories,
    jointTrajectories,
    isObjectDetectionEnabled,
    currentObjects,
    showObjectLabels,
    isProjectileDetectionEnabled,
    currentProjectile,
    showCourtOverlay,
    courtResult,
    isPlaying,
    dimensions.width,
    dimensions.height,
  ]);

  // Return nothing - this hook is purely for side effects
  return null;
}

