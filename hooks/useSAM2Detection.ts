import { useEffect, useRef, useState, useCallback } from "react";
import type { SAM2Point, SAM2Box, SAM2Detection, SAM2Config } from "@/utils/sam2-detector";

// Dynamic import for SAM2Detector (code-splitting)
type SAM2Module = typeof import("@/utils/sam2-detector");

export interface SAM2DetectionConfig extends SAM2Config {
  enabled?: boolean;
  encoderPath?: string;
  decoderPath?: string;
}

// Global cache for loaded detectors (prevents re-downloading models)
const detectorCache = new Map<string, Promise<any>>();

export function useSAM2Detection(config: SAM2DetectionConfig = {}) {
  const [detector, setDetector] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const {
    modelType = "tiny",
    imageSize = 1024,
    maskThreshold = 0.0,
    returnMultipleMasks = false,
    enabled = true,
    encoderPath = `/models/sam2_${modelType}_encoder.onnx`,
    decoderPath = `/models/sam2_${modelType}_decoder.onnx`,
  } = config;

  // Initialize the SAM 2 detector
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

        console.log("🔧 Initializing SAM 2 detector...");

        // Generate unique config key for caching
        const configKey = JSON.stringify({
          modelType,
          imageSize,
          maskThreshold,
          returnMultipleMasks,
        });

        // Check if we already have a detector for this configuration
        if (detectorCache.has(configKey)) {
          console.log(`Using cached SAM 2 detector for ${modelType}`);
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
        console.log(`Loading SAM 2 ${modelType} detector...`);

        const startTime = performance.now();

        // Dynamic import to code-split SAM2Detector and ONNX Runtime (~3-4MB)
        console.log('📦 Dynamically importing SAM2Detector...');
        const { SAM2Detector } = await import("@/utils/sam2-detector");

        const sam2 = new SAM2Detector({
          modelType,
          imageSize,
          maskThreshold,
          returnMultipleMasks,
        });

        // Load the models
        await sam2.load(encoderPath, decoderPath);

        const loadTime = performance.now() - startTime;
        console.log(`✅ SAM 2 ${modelType} loaded in ${(loadTime / 1000).toFixed(2)}s`);

        // Cache the detector
        const detectorPromise = Promise.resolve(sam2);
        detectorCache.set(configKey, detectorPromise);

        if (mounted) {
          setDetector(sam2);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize SAM 2 detector:", err);
        if (mounted) {
          let errorMessage = "Failed to load SAM 2 model.";
          if (err instanceof Error) {
            if (err.message.includes("Failed to fetch") || err.message.includes("404")) {
              errorMessage = `Model files not found. Please ensure SAM 2 models are in public/models/\n` +
                `Expected files:\n` +
                `- ${encoderPath}\n` +
                `- ${decoderPath}\n\n` +
                `See docs for instructions on exporting SAM 2 models.`;
            } else if (err.message.includes("32133488") || err.message.includes("model")) {
              errorMessage = `Model file format error. The ONNX files may be:\n` +
                `1. Corrupted or incomplete (check file sizes: encoder ~134MB, decoder ~20MB)\n` +
                `2. Wrong format or version\n` +
                `3. Downloaded incorrectly\n\n` +
                `Try re-downloading from: https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx\n` +
                `Use 'git lfs' or direct download links to ensure complete files.`;
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
  }, [modelType, imageSize, maskThreshold, returnMultipleMasks, enabled, encoderPath, decoderPath]);

  // Segment with point prompts
  const segmentWithPoints = useCallback(
    async (
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      points: SAM2Point[]
    ): Promise<SAM2Detection | null> => {
      if (!detector) {
        console.warn("Detector not loaded yet");
        return null;
      }

      try {
        setIsSegmenting(true);
        const result = await detector.segmentWithPoints(element, points);
        return result;
      } catch (err) {
        console.error("SAM 2 point segmentation error:", err);
        return null;
      } finally {
        setIsSegmenting(false);
      }
    },
    [detector]
  );

  // Segment with box prompt
  const segmentWithBox = useCallback(
    async (
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      box: SAM2Box
    ): Promise<SAM2Detection | null> => {
      if (!detector) {
        console.warn("Detector not loaded yet");
        return null;
      }

      try {
        setIsSegmenting(true);
        const result = await detector.segmentWithBox(element, box);
        return result;
      } catch (err) {
        console.error("SAM 2 box segmentation error:", err);
        return null;
      } finally {
        setIsSegmenting(false);
      }
    },
    [detector]
  );

  // Auto-segment entire frame
  const autoSegment = useCallback(
    async (
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      gridSize: number = 32
    ): Promise<SAM2Detection[]> => {
      if (!detector) {
        console.warn("Detector not loaded yet");
        return [];
      }

      try {
        setIsSegmenting(true);
        const results = await detector.autoSegment(element, gridSize);
        return results;
      } catch (err) {
        console.error("SAM 2 auto-segmentation error:", err);
        return [];
      } finally {
        setIsSegmenting(false);
      }
    },
    [detector]
  );

  // Clear embedding cache
  const clearCache = useCallback(() => {
    if (detector) {
      detector.clearCache();
    }
  }, [detector]);

  return {
    detector,
    isLoading,
    loadingFromCache,
    error,
    isSegmenting,
    segmentWithPoints,
    segmentWithBox,
    autoSegment,
    clearCache,
  };
}


