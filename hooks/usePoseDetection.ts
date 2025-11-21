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
  inputResolution?: { width: number; height: number };
  maxPoses?: number;
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
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const {
    modelType = "SinglePose.Lightning",
    enableSmoothing = true,
    minPoseScore = 0.25,
    minPartScore = 0.3,
    inputResolution,
    maxPoses = 1,
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

        // Check if model is already cached
        const modelKey = `movenet-${modelType.toLowerCase().replace(/\./g, '-')}`;
        
        try {
          const cachedModels = await tf.io.listModels();
          const isCached = Object.keys(cachedModels).some(key => key.includes(modelKey));
          
          if (isCached) {
            console.log(`Loading ${modelType} from cache...`);
            setLoadingFromCache(true);
          } else {
            console.log(`Downloading ${modelType} model (will be cached for next time)...`);
            setLoadingFromCache(false);
          }
        } catch (e) {
          console.log('Could not check cache status:', e);
        }

        const detectorConfig: any = {
          modelType: modelType,
          enableSmoothing: enableSmoothing,
          minPoseScore: minPoseScore,
          minPartScore: minPartScore,
        };

        // Add maxPoses for MultiPose model
        if (modelType === "MultiPose.Lightning") {
          detectorConfig.maxPoses = maxPoses;
          detectorConfig.enableTracking = true;
        }

        // Add input resolution if specified
        if (inputResolution) {
          detectorConfig.modelConfig = {
            inputResolution: inputResolution,
          };
        }

        const startTime = performance.now();
        const poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        const loadTime = performance.now() - startTime;

        console.log(`Model loaded in ${(loadTime / 1000).toFixed(2)}s ${loadingFromCache ? '(from cache)' : '(downloaded)'}`);

        if (mounted) {
          setDetector(poseDetector);
          setIsLoading(false);
          setLoadingFromCache(false);
        }
      } catch (err) {
        console.error("Failed to initialize pose detector:", err);
        if (mounted) {
          let errorMessage = "Failed to load pose detection model.";
          
          if (err instanceof Error) {
            if (err.message.includes("CORS") || err.message.includes("fetch")) {
              errorMessage = "Network error loading model. Try: 1) Refresh page, 2) Clear browser cache, 3) Check internet connection, or 4) Try incognito mode.";
            } else {
              errorMessage = err.message;
            }
          }
          
          setError(errorMessage);
          setIsLoading(false);
          setLoadingFromCache(false);
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
  }, [
    modelType, 
    enableSmoothing, 
    minPoseScore, 
    minPartScore, 
    inputResolution?.width, 
    inputResolution?.height,
    maxPoses
  ]);

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

  // Function to clear model cache
  const clearModelCache = useCallback(async () => {
    try {
      const models = await tf.io.listModels();
      const modelKeys = Object.keys(models).filter(key => 
        key.includes('movenet') || key.includes('tfjs')
      );
      
      for (const key of modelKeys) {
        await tf.io.removeModel(key);
        console.log(`Cleared cached model: ${key}`);
      }
      
      return modelKeys.length;
    } catch (err) {
      console.error('Failed to clear model cache:', err);
      return 0;
    }
  }, []);

  return {
    detector,
    isLoading,
    loadingFromCache,
    error,
    isDetecting,
    detectPose,
    startDetection,
    stopDetection,
    clearModelCache,
  };
}

