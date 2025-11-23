import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { BallTracker } from "@/utils/ball-tracker";
import type { ProjectileModelType, BallType, ProjectileDetectionResult } from "@/types/detection";
import type { ObjectDetectionResult } from "@/types/detection";

export interface ProjectileDetectionConfig {
  model?: ProjectileModelType;
  ballType?: BallType;
  confidenceThreshold?: number;
  trajectoryLength?: number;
  videoFPS?: number;
  enabled?: boolean;
  useYOLODetections?: boolean; // Use YOLOv8 detections instead of separate model
}

export function useProjectileDetection(config: ProjectileDetectionConfig = {}) {
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const ballTrackerRef = useRef<BallTracker | null>(null);
  const currentFrameRef = useRef(0);

  const {
    model = "TrackNet",
    ballType = "auto",
    confidenceThreshold = 0.3, // Lower threshold for small balls
    trajectoryLength = 30,
    videoFPS = 30,
    enabled = true,
    useYOLODetections = true, // Default to using YOLO detections
  } = config;

  // Initialize ball tracker
  useEffect(() => {
    if (ballTrackerRef.current === null) {
      ballTrackerRef.current = new BallTracker({
        maxTrajectoryLength: trajectoryLength,
        videoFPS: videoFPS,
        maxFrameGap: 10,
        minDetectionsForTrack: 3,
      });
    } else {
      // Update settings if changed
      ballTrackerRef.current.updateSettings({
        maxTrajectoryLength: trajectoryLength,
        videoFPS: videoFPS,
      });
    }
  }, [trajectoryLength, videoFPS]);

  // Initialize the projectile detector
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setDetector(null);
      return;
    }

    // If using YOLO detections, we don't need a separate model
    if (useYOLODetections) {
      console.log("✅ Ball tracking using YOLOv8 detections + smart tracking");
      setDetector({ type: 'yolo-based' }); // Placeholder to indicate ready
      setIsLoading(false);
      return;
    }

    // Otherwise, would load TrackNet model (not implemented)
    console.warn("⚠️ Standalone TrackNet model not implemented. Using YOLO-based detection.");
    setDetector({ type: 'yolo-based' });
    setIsLoading(false);
  }, [model, ballType, enabled, useYOLODetections]);

  // Detect projectile using YOLO object detections
  const detectProjectile = useCallback(
    (
      objectDetections: ObjectDetectionResult[],
      currentFrame: number,
      timestamp: number
    ): ProjectileDetectionResult | null => {
      if (!detector || !ballTrackerRef.current) {
        return null;
      }

      try {
        // Filter for sports balls only (classId: 32 in COCO)
        const ballDetections = objectDetections.filter(det => 
          det.class === "sports ball" && 
          det.confidence >= confidenceThreshold &&
          // Size filter: balls are typically small (10-100 pixels)
          det.bbox.width < 100 && 
          det.bbox.height < 100
        );

        // Update ball tracker with detections
        const trackedBall = ballTrackerRef.current.update(
          ballDetections,
          currentFrame,
          timestamp
        );

        if (!trackedBall) {
          return null;
        }

        // Convert tracked ball to ProjectileDetectionResult
        const result: ProjectileDetectionResult = {
          position: trackedBall.current.position,
          confidence: trackedBall.confidence,
          trajectory: trackedBall.trajectory.positions,
          velocity: trackedBall.trajectory.velocity ? {
            x: trackedBall.trajectory.velocity.x,
            y: trackedBall.trajectory.velocity.y,
            magnitude: trackedBall.trajectory.velocity.magnitude,
          } : undefined,
          predictedPath: trackedBall.trajectory.predictedPath || undefined,
        };

        currentFrameRef.current = currentFrame;
        return result;
      } catch (err) {
        console.error("Projectile detection error:", err);
        return null;
      }
    },
    [detector, confidenceThreshold]
  );

  // Note: Ball tracking is integrated with object detection loop
  // No separate startDetection needed - detectProjectile is called with YOLO results

  // Reset trajectory
  const resetTrajectory = useCallback(() => {
    if (ballTrackerRef.current) {
      ballTrackerRef.current.reset();
    }
    currentFrameRef.current = 0;
  }, []);

  return {
    detector,
    isLoading,
    error,
    isDetecting,
    detectProjectile,
    resetTrajectory,
  };
}

