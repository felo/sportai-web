import { useEffect, useRef, useState, useCallback } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

export type MoveNetModelType = "SinglePose.Lightning" | "SinglePose.Thunder" | "MultiPose.Lightning";

export interface PoseDetectionConfig {
  modelType?: MoveNetModelType;
  enableSmoothing?: boolean;
  minPoseScore?: number;
  minPartScore?: number;
}

export interface PoseDetectionResult {
  keypoints: poseDetection.Keypoint[];
  score?: number;
}

export function usePoseDetection(config: PoseDetectionConfig = {}) {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const {
    modelType = "SinglePose.Lightning",
    enableSmoothing = true,
    minPoseScore = 0.25,
    minPartScore = 0.3,
  } = config;

  // Initialize the pose detector
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        setIsLoading(true);
        setError(null);

        // Set backend to webgl for better performance
        await tf.setBackend("webgl");
        await tf.ready();

        const detectorConfig: any = {
          modelType: modelType,
        };

        const poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );

        if (mounted) {
          setDetector(poseDetector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize pose detector:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize pose detector");
          setIsLoading(false);
        }
      }
    }

    initDetector();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [modelType, enableSmoothing, minPoseScore, minPartScore]);

  // Detect poses from a single frame
  const detectPose = useCallback(
    async (
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<PoseDetectionResult[]> => {
      if (!detector) {
        throw new Error("Detector not initialized");
      }

      try {
        const poses = await detector.estimatePoses(element);
        return poses.map((pose) => ({
          keypoints: pose.keypoints,
          score: pose.score,
        }));
      } catch (err) {
        console.error("Pose detection error:", err);
        return [];
      }
    },
    [detector]
  );

  // Start continuous pose detection on a video element
  const startDetection = useCallback(
    (
      videoElement: HTMLVideoElement,
      onPoses: (poses: PoseDetectionResult[]) => void
    ) => {
      if (!detector) return;

      // Stop any existing detection first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setIsDetecting(true);

      const detect = async () => {
        if (!videoElement.paused && !videoElement.ended) {
          try {
            const poses = await detectPose(videoElement);
            onPoses(poses);
          } catch (err) {
            console.error("Detection error:", err);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    },
    [detector, detectPose]
  );

  // Stop continuous detection
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  return {
    detector,
    isLoading,
    error,
    isDetecting,
    detectPose,
    startDetection,
    stopDetection,
  };
}

