import { useEffect, useRef, useState, useCallback } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

// Enable TensorFlow.js model caching
// This ensures models are cached in the browser's Cache API
if (typeof window !== "undefined") {
  // Set environment flags to enable caching
  tf.env().set('IS_BROWSER', true);
  
  console.log("🔧 TensorFlow.js environment initialized");
  console.log("🔧 Platform:", tf.env().platformName);
  console.log("🔧 Features:", {
    hasWebGL: tf.env().getBool('HAS_WEBGL'),
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasCacheAPI: typeof caches !== 'undefined',
  });
}

export type MoveNetModelType = "SinglePose.Lightning" | "SinglePose.Thunder" | "MultiPose.Lightning";
export type BlazePoseModelType = "lite" | "full" | "heavy";
export type PoseModelType = MoveNetModelType | BlazePoseModelType;
export type SupportedModel = "MoveNet" | "BlazePose";

export interface PoseDetectionConfig {
  model?: SupportedModel;
  modelType?: PoseModelType;
  enableSmoothing?: boolean;
  minPoseScore?: number;
  minPartScore?: number;
  inputResolution?: { width: number; height: number };
  maxPoses?: number;
  enabled?: boolean;
}

export interface Keypoint3D {
  x: number;
  y: number;
  z: number;
  score?: number;
  name?: string;
}

export interface PoseDetectionResult {
  keypoints: poseDetection.Keypoint[];
  score?: number;
  keypoints3D?: Keypoint3D[]; // For 3D models
  id?: number;          // Tracking ID (for MultiPose)
  box?: { xMin: number; yMin: number; width: number; height: number; score?: number }; // Bounding box
}

// Global cache for loaded detectors to prevent re-downloading/re-initializing
// Using a Map where key is the model configuration string and value is the detector promise
const detectorCache = new Map<string, Promise<poseDetection.PoseDetector>>();

export function usePoseDetection(config: PoseDetectionConfig = {}) {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const {
    model = "MoveNet",
    modelType = "SinglePose.Lightning",
    enableSmoothing = true,
    minPoseScore = 0.25,
    minPartScore = 0.3,
    inputResolution,
    maxPoses = 1,
    enabled = true,
  } = config;

  // Initialize the pose detector
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setDetector(null);
      return;
    }

    let mounted = true;

    async function initDetector() {
      try {
        setIsLoading(true);
        setError(null);

        // Set backend to webgl for better performance
        await tf.setBackend("webgl");
        await tf.ready();
        
        // Enable model caching - this ensures models are saved to IndexedDB
        // TensorFlow.js should do this automatically, but we're being explicit
        console.log("🔧 TensorFlow.js backend:", tf.getBackend());
        console.log("🔧 WebGL available:", await tf.backend().checkStorageUsage !== undefined);

        let detectorConfig: any;
        let supportedModel: poseDetection.SupportedModels;
        let modelKey: string;

        // Generate a unique key for this configuration
        const configKey = JSON.stringify({
          model,
          modelType: model === "BlazePose" ? (modelType || "full") : (modelType || "SinglePose.Lightning"),
          minPoseScore,
          minPartScore,
          inputResolution,
          maxPoses,
          enableSmoothing // Include smoothing in key as it's part of detector creation for BlazePose
        });

        if (model === "BlazePose") {
          // BlazePose configuration
          supportedModel = poseDetection.SupportedModels.BlazePose;
          const blazeModelType = (modelType as BlazePoseModelType) || "full";
          modelKey = `blazepose-${blazeModelType}`;
          
          // Use tfjs runtime (MediaPipe requires additional setup and may not work in Next.js)
          // BlazePose tfjs DOES provide keypoints3D!
          detectorConfig = {
            runtime: "tfjs" as const,
            modelType: blazeModelType,
            enableSmoothing: enableSmoothing,
            // Get the actual input dimensions used by the model
          };
        } else {
          // MoveNet configuration
          supportedModel = poseDetection.SupportedModels.MoveNet;
          const movenetModelType = (modelType as MoveNetModelType) || "SinglePose.Lightning";
          modelKey = `movenet-${movenetModelType.toLowerCase().replace(/\./g, '-')}`;
          
          detectorConfig = {
            modelType: movenetModelType,
            enableSmoothing: enableSmoothing,
            minPoseScore: minPoseScore,
            minPartScore: minPartScore,
          };

          // Add maxPoses for MultiPose model
          if (movenetModelType === "MultiPose.Lightning") {
            detectorConfig.maxPoses = maxPoses;
            detectorConfig.enableTracking = true;
          }

          // Add input resolution if specified
          if (inputResolution) {
            detectorConfig.modelConfig = {
              inputResolution: inputResolution,
            };
          }
        }

        // Check if we already have a promise for this detector configuration
        if (detectorCache.has(configKey)) {
          console.log(`Using cached detector instance for ${model} ${modelType}`);
          try {
            const cachedDetector = await detectorCache.get(configKey);
            if (mounted && cachedDetector) {
              setDetector(cachedDetector);
              setIsLoading(false);
              setLoadingFromCache(true);
              return;
            }
          } catch (err) {
            console.error("Error retrieving cached detector:", err);
            detectorCache.delete(configKey); // Clear failed cache entry
          }
        }

        // If not cached, create new detector
        console.log(`Creating new detector for ${model} ${modelType}...`);
        
        // Check if model is already cached (browser cache check)
        // This part is mostly for UI feedback, actual loading happens in createDetector
        try {
          const cachedModels = await tf.io.listModels();
          console.log("📦 TensorFlow.js cached models:", Object.keys(cachedModels));
          const isCached = Object.keys(cachedModels).some(key => key.includes(modelKey));
          
          if (isCached) {
            console.log(`✅ Model ${modelKey} found in cache`);
            setLoadingFromCache(true);
          } else {
            console.log(`❌ Model ${modelKey} NOT found in cache, will download`);
            setLoadingFromCache(false);
          }
        } catch (e) {
          console.warn("Failed to check cache:", e);
          // Ignore cache check errors
        }

        const startTime = performance.now();
        
        console.log(`⏳ Creating new detector for ${model} ${modelType}...`);
        
        // Monitor network requests to see if model is being downloaded
        let networkRequestCount = 0;
        let networkLoadedBytes = 0;
        const originalFetch = window.fetch;
        const fetchInterceptor = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          
          // Track TensorFlow.js model downloads
          if (url.includes('tfhub.dev') || url.includes('tensorflow') || url.includes('tfjs') || url.includes('storage.googleapis.com')) {
            networkRequestCount++;
            console.log(`🌐 Fetching model file: ${url.substring(url.lastIndexOf('/') + 1)}`);
            
            const response = await originalFetch(input, init);
            const clonedResponse = response.clone();
            
            // Track bytes loaded
            if (response.ok) {
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                networkLoadedBytes += parseInt(contentLength, 10);
              }
            }
            
            return clonedResponse;
          }
          
          return originalFetch(input, init);
        };
        window.fetch = fetchInterceptor as typeof fetch;
        
        // Create the detector promise
        const detectorPromise = poseDetection.createDetector(
          supportedModel,
          detectorConfig
        );
        
        // Cache the promise immediately
        detectorCache.set(configKey, detectorPromise);

        try {
          const poseDetector = await detectorPromise;
          const loadTime = performance.now() - startTime;
          
          // Restore original fetch
          window.fetch = originalFetch;
          
          // Log results with network info
          console.log(`✅ ${model} model loaded in ${(loadTime / 1000).toFixed(2)}s`);
          if (networkRequestCount > 0) {
            console.log(`🌐 Network: ${networkRequestCount} requests, ${(networkLoadedBytes / 1024 / 1024).toFixed(2)}MB loaded`);
            if (networkLoadedBytes > 100000) {
              console.warn(`⚠️ Large download detected! Model was likely NOT loaded from cache.`);
            } else {
              console.log(`✅ Minimal network traffic - model likely loaded from cache`);
            }
          } else {
            console.log(`✅ No network requests - model loaded entirely from cache!`);
          }
          console.log(`📊 Detector cache size: ${detectorCache.size} entries`);

          if (mounted) {
            setDetector(poseDetector);
            setIsLoading(false);
          }
        } catch (err) {
          // Restore original fetch on error
          window.fetch = originalFetch;
          
          // If loading failed, remove from cache so we can try again
          detectorCache.delete(configKey);
          throw err;
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
    model,
    modelType, 
    enableSmoothing, 
    minPoseScore, 
    minPartScore, 
    inputResolution?.width, 
    inputResolution?.height,
    maxPoses,
    enabled
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
        return poses.map((pose) => {
          // BlazePose may provide keypoints3D in the pose object (only with MediaPipe runtime)
          const poseAny = pose as any;
          
          // Check for keypoints3D in various possible locations
          let keypoints3D = poseAny.keypoints3D || poseAny.keypoints3d || null;
          
          // Debug logging for BlazePose
          if (model === "BlazePose") {
            console.log("BlazePose detection:", {
              keypoints2D: pose.keypoints.length,
              hasKeypoints3D: !!keypoints3D,
              keypoints3DLength: keypoints3D?.length || 0,
              poseKeys: Object.keys(poseAny),
            });
          }
          
          return {
            keypoints: pose.keypoints,
            score: pose.score,
            keypoints3D: keypoints3D,
            id: poseAny.id, // Pass through tracking ID if available
            box: poseAny.box, // Pass through bounding box if available
          };
        });
      } catch (err) {
        console.error("Pose detection error:", err);
        return [];
      }
    },
    [detector, model]
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
        key.includes('movenet') || key.includes('blazepose') || key.includes('tfjs')
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
