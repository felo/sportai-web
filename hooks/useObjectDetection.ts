import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { YOLOModelType, ObjectDetectionResult } from "@/types/detection";

export interface ObjectDetectionConfig {
  model?: YOLOModelType;
  confidenceThreshold?: number;
  detectionClasses?: string[]; // Filter specific classes
  enableTracking?: boolean;
  maxDetections?: number;
  enabled?: boolean;
}

// Global cache for loaded detectors (prevents re-downloading models)
const detectorCache = new Map<string, Promise<any>>();

// Simple object tracker for multi-frame tracking
class ObjectTracker {
  private nextId = 0;
  private trackedObjects = new Map<number, { bbox: any; lastSeen: number }>();
  private maxFrameGap = 10; // Max frames before losing track

  track(detections: ObjectDetectionResult[], currentFrame: number): ObjectDetectionResult[] {
    const tracked: ObjectDetectionResult[] = [];

    for (const detection of detections) {
      let bestMatchId: number | undefined;
      let bestMatchIoU = 0.3; // Min IoU threshold for matching

      // Find best matching tracked object
      this.trackedObjects.forEach((tracked, id) => {
        const iou = this.calculateIoU(detection.bbox, tracked.bbox);
        if (iou > bestMatchIoU) {
          bestMatchIoU = iou;
          bestMatchId = id;
        }
      });

      // Assign tracking ID
      if (bestMatchId !== undefined) {
        detection.trackingId = bestMatchId;
        this.trackedObjects.set(bestMatchId, { bbox: detection.bbox, lastSeen: currentFrame });
      } else {
        detection.trackingId = this.nextId++;
        this.trackedObjects.set(detection.trackingId, { bbox: detection.bbox, lastSeen: currentFrame });
      }

      tracked.push(detection);
    }

    // Clean up old tracks
    this.trackedObjects.forEach((tracked, id) => {
      if (currentFrame - tracked.lastSeen > this.maxFrameGap) {
        this.trackedObjects.delete(id);
      }
    });

    return tracked;
  }

  private calculateIoU(box1: any, box2: any): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  reset() {
    this.trackedObjects.clear();
    this.nextId = 0;
  }
}

export function useObjectDetection(config: ObjectDetectionConfig = {}) {
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const trackerRef = useRef(new ObjectTracker());
  const currentFrameRef = useRef(0);

  const {
    model = "YOLOv8n",
    confidenceThreshold = 0.5,
    detectionClasses,
    enableTracking = false,
    maxDetections = 10,
    enabled = true,
  } = config;

  // Initialize the object detector
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

        console.log("🔧 TensorFlow.js backend ready for object detection:", tf.getBackend());

        // Generate unique config key for caching
        const configKey = JSON.stringify({
          model,
          confidenceThreshold,
          detectionClasses,
        });

        // Check if we already have a detector for this configuration
        if (detectorCache.has(configKey)) {
          console.log(`Using cached object detector for ${model}`);
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
        console.log(`Loading ${model} object detector...`);

        const startTime = performance.now();
        
        // Use COCO-SSD as a working implementation
        // This detects 80 object classes including person, sports ball, tennis racket, etc.
        // Model selection maps to COCO-SSD base models:
        // - YOLOv8n -> lite_mobilenet_v2 (fastest)
        // - YOLOv8s -> mobilenet_v2 (balanced)
        // - YOLOv8m -> mobilenet_v2 (same as s, but we can tune confidence later)
        const baseModel = model === "YOLOv8n" ? "lite_mobilenet_v2" : "mobilenet_v2";
        
        const detectorPromise = cocoSsd.load({
          base: baseModel as any,
        });
        
        // Cache the detector promise
        detectorCache.set(configKey, detectorPromise);
        
        const realDetector = await detectorPromise;

        const loadTime = performance.now() - startTime;
        console.log(`✅ ${model} object detector (COCO-SSD) loaded in ${(loadTime / 1000).toFixed(2)}s`);

        if (mounted) {
          setDetector(realDetector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize object detector:", err);
        if (mounted) {
          let errorMessage = "Failed to load object detection model.";
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
  }, [model, confidenceThreshold, detectionClasses, enabled]);

  // Detect objects from a single frame
  const detectObjects = useCallback(
    async (
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<ObjectDetectionResult[]> => {
      if (!detector) {
        throw new Error("Detector not initialized");
      }

      try {
        // Run object detection with COCO-SSD
        const rawResults = await detector.detect(element);

        // Process COCO-SSD results into our format
        // COCO-SSD returns: { class, score, bbox: [x, y, width, height] }
        let results: ObjectDetectionResult[] = rawResults.map((result: any) => ({
          bbox: {
            x: result.bbox[0],
            y: result.bbox[1],
            width: result.bbox[2],
            height: result.bbox[3],
          },
          class: result.class,
          classId: 0, // COCO-SSD doesn't provide class IDs
          confidence: result.score,
        }));

        // Filter by confidence threshold
        results = results.filter((r) => r.confidence >= confidenceThreshold);

        // Filter by detection classes if specified
        if (detectionClasses && detectionClasses.length > 0) {
          results = results.filter((r) => detectionClasses.includes(r.class));
        }

        // Limit max detections
        results = results
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxDetections);

        // Apply tracking if enabled
        if (enableTracking) {
          results = trackerRef.current.track(results, currentFrameRef.current);
          currentFrameRef.current++;
        }

        return results;
      } catch (err) {
        console.error("Object detection error:", err);
        return [];
      }
    },
    [detector, confidenceThreshold, detectionClasses, maxDetections, enableTracking]
  );

  // Start continuous object detection on a video element
  const startDetection = useCallback(
    (
      videoElement: HTMLVideoElement,
      onObjects: (objects: ObjectDetectionResult[]) => void
    ) => {
      if (!detector) return;

      // Stop any existing detection first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setIsDetecting(true);
      trackerRef.current.reset(); // Reset tracking
      currentFrameRef.current = 0;

      const detect = async () => {
        if (!videoElement.paused && !videoElement.ended) {
          try {
            const objects = await detectObjects(videoElement);
            onObjects(objects);
          } catch (err) {
            console.error("Detection error:", err);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    },
    [detector, detectObjects]
  );

  // Stop continuous detection
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // Reset tracking
  const resetTracking = useCallback(() => {
    trackerRef.current.reset();
    currentFrameRef.current = 0;
  }, []);

  return {
    detector,
    isLoading,
    loadingFromCache,
    error,
    isDetecting,
    detectObjects,
    startDetection,
    stopDetection,
    resetTracking,
  };
}

