import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import type { ProjectileModelType, BallType, ProjectileDetectionResult } from "@/types/detection";

export interface ProjectileDetectionConfig {
  model?: ProjectileModelType;
  ballType?: BallType;
  confidenceThreshold?: number;
  trajectoryLength?: number;
  enabled?: boolean;
}

// Global cache for loaded detectors
const detectorCache = new Map<string, Promise<any>>();

// Trajectory tracker for ball path
class TrajectoryTracker {
  private trajectory: Array<{ x: number; y: number; frame: number; timestamp: number }> = [];
  private maxLength: number;

  constructor(maxLength: number = 30) {
    this.maxLength = maxLength;
  }

  addPoint(x: number, y: number, frame: number, timestamp: number) {
    this.trajectory.push({ x, y, frame, timestamp });
    if (this.trajectory.length > this.maxLength) {
      this.trajectory.shift();
    }
  }

  getTrajectory() {
    return [...this.trajectory];
  }

  clear() {
    this.trajectory = [];
  }

  // Calculate velocity from last two points
  getVelocity(): { x: number; y: number; magnitude: number } | undefined {
    if (this.trajectory.length < 2) return undefined;

    const p1 = this.trajectory[this.trajectory.length - 2];
    const p2 = this.trajectory[this.trajectory.length - 1];
    const dt = p2.timestamp - p1.timestamp;

    if (dt <= 0) return undefined;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Convert to km/h (assuming pixel-to-meter conversion would be done at a higher level)
    // For now, return raw pixel velocity
    const magnitude = Math.sqrt(dx * dx + dy * dy) / dt;

    return {
      x: dx / dt,
      y: dy / dt,
      magnitude,
    };
  }

  // Simple linear prediction (can be enhanced with physics-based prediction)
  predictPath(steps: number = 10): Array<{ x: number; y: number; confidence: number }> {
    if (this.trajectory.length < 2) return [];

    const velocity = this.getVelocity();
    if (!velocity) return [];

    const lastPoint = this.trajectory[this.trajectory.length - 1];
    const predictions: Array<{ x: number; y: number; confidence: number }> = [];

    for (let i = 1; i <= steps; i++) {
      const confidence = Math.max(0, 1 - i * 0.1); // Decrease confidence with distance
      predictions.push({
        x: lastPoint.x + velocity.x * i * 0.016, // Assume ~60fps
        y: lastPoint.y + velocity.y * i * 0.016,
        confidence,
      });
    }

    return predictions;
  }
}

export function useProjectileDetection(config: ProjectileDetectionConfig = {}) {
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const trajectoryTrackerRef = useRef<TrajectoryTracker | null>(null);
  const currentFrameRef = useRef(0);

  const {
    model = "TrackNet",
    ballType = "auto",
    confidenceThreshold = 0.5,
    trajectoryLength = 30,
    enabled = true,
  } = config;

  // Initialize trajectory tracker
  useEffect(() => {
    if (trajectoryTrackerRef.current === null) {
      trajectoryTrackerRef.current = new TrajectoryTracker(trajectoryLength);
    }
  }, [trajectoryLength]);

  // Initialize the projectile detector
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

        // Set backend to webgl
        await tf.setBackend("webgl");
        await tf.ready();

        console.log("🔧 TensorFlow.js backend ready for projectile detection:", tf.getBackend());

        // Generate unique config key
        const configKey = JSON.stringify({
          model,
          ballType,
        });

        // Check cache
        if (detectorCache.has(configKey)) {
          console.log(`Using cached projectile detector for ${model}`);
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
            detectorCache.delete(configKey);
          }
        }

        // Load new detector
        console.log(`Loading ${model} projectile detector...`);

        // TODO: Implement actual TrackNet model loading
        // TrackNet typically requires:
        // 1. Load TensorFlow.js model from URL or local file
        // 2. Model takes 3 consecutive frames as input (temporal context)
        // 3. Outputs heatmap of ball position
        // 4. Find maximum in heatmap for ball location

        const startTime = performance.now();

        // Mock detector (replace with actual TrackNet implementation)
        const mockDetector = {
          detect: async (frames: any[]) => {
            // Placeholder - return empty result
            // Real implementation would:
            // 1. Stack 3 frames
            // 2. Preprocess (resize, normalize)
            // 3. Run inference
            // 4. Post-process heatmap to get ball position
            return null;
          },
        };

        const loadTime = performance.now() - startTime;
        console.log(`✅ ${model} projectile detector loaded in ${(loadTime / 1000).toFixed(2)}s`);

        // Cache the detector
        detectorCache.set(configKey, Promise.resolve(mockDetector));

        if (mounted) {
          setDetector(mockDetector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize projectile detector:", err);
        if (mounted) {
          let errorMessage = "Failed to load projectile detection model.";
          if (err instanceof Error) {
            errorMessage = err.message;
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
  }, [model, ballType, enabled]);

  // Detect projectile from frames
  const detectProjectile = useCallback(
    async (
      currentFrame: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      previousFrames?: (HTMLCanvasElement | ImageData)[],
      timestamp?: number
    ): Promise<ProjectileDetectionResult | null> => {
      if (!detector) {
        throw new Error("Detector not initialized");
      }

      try {
        // TrackNet typically needs 3 consecutive frames
        const frames = previousFrames ? [currentFrame, ...previousFrames] : [currentFrame];

        // Run projectile detection
        const rawResult = await detector.detect(frames);

        if (!rawResult || !rawResult.position) {
          return null;
        }

        const result: ProjectileDetectionResult = {
          position: rawResult.position,
          confidence: rawResult.confidence || 0,
        };

        // Filter by confidence threshold
        if (result.confidence < confidenceThreshold) {
          return null;
        }

        // Add to trajectory
        if (trajectoryTrackerRef.current) {
          trajectoryTrackerRef.current.addPoint(
            result.position.x,
            result.position.y,
            currentFrameRef.current,
            timestamp || Date.now()
          );

          result.trajectory = trajectoryTrackerRef.current.getTrajectory();
          result.velocity = trajectoryTrackerRef.current.getVelocity();
          result.predictedPath = trajectoryTrackerRef.current.predictPath(10);
        }

        currentFrameRef.current++;
        return result;
      } catch (err) {
        console.error("Projectile detection error:", err);
        return null;
      }
    },
    [detector, confidenceThreshold]
  );

  // Start continuous projectile detection
  const startDetection = useCallback(
    (
      videoElement: HTMLVideoElement,
      onProjectile: (projectile: ProjectileDetectionResult | null) => void
    ) => {
      if (!detector) return;

      // Stop any existing detection
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setIsDetecting(true);
      if (trajectoryTrackerRef.current) {
        trajectoryTrackerRef.current.clear();
      }
      currentFrameRef.current = 0;

      // Store previous frames for temporal context
      const frameBuffer: HTMLCanvasElement[] = [];
      const maxBufferSize = 2; // Store 2 previous frames

      const detect = async () => {
        if (!videoElement.paused && !videoElement.ended) {
          try {
            // Capture current frame
            const canvas = document.createElement("canvas");
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(videoElement, 0, 0);
              
              // Detect with temporal context
              const projectile = await detectProjectile(
                canvas,
                frameBuffer,
                videoElement.currentTime
              );
              onProjectile(projectile);

              // Update frame buffer
              frameBuffer.unshift(canvas);
              if (frameBuffer.length > maxBufferSize) {
                frameBuffer.pop();
              }
            }
          } catch (err) {
            console.error("Detection error:", err);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    },
    [detector, detectProjectile]
  );

  // Stop continuous detection
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // Reset trajectory
  const resetTrajectory = useCallback(() => {
    if (trajectoryTrackerRef.current) {
      trajectoryTrackerRef.current.clear();
    }
    currentFrameRef.current = 0;
  }, []);

  return {
    detector,
    isLoading,
    loadingFromCache,
    error,
    isDetecting,
    detectProjectile,
    startDetection,
    stopDetection,
    resetTrajectory,
  };
}

