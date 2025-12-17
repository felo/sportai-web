import { useState, useCallback, useRef } from "react";
import { track } from "@/lib/analytics";
import type {
  AnalysisType,
  FrameAnalysisResult,
  CourtAnalysisResult,
  CameraAngleResult,
  FrameAnalysisResponse,
} from "@/types/frame-analysis";

// ============================================================================
// Types
// ============================================================================

interface UseFrameAnalysisOptions {
  /** JPEG quality for frame capture (0-1). Default: 0.85 */
  captureQuality?: number;
  /** Sport type to help with detection accuracy */
  sport?: string;
  /** Called when analysis starts */
  onAnalysisStart?: (type: AnalysisType) => void;
  /** Called when analysis completes */
  onAnalysisComplete?: (result: FrameAnalysisResult) => void;
  /** Called on analysis error */
  onAnalysisError?: (error: string, type: AnalysisType) => void;
}

interface UseFrameAnalysisReturn {
  /** Analyze a frame from a video element */
  analyzeFrame: (
    videoElement: HTMLVideoElement,
    analysisType: AnalysisType
  ) => Promise<FrameAnalysisResult | null>;
  
  /** Analyze multiple types in parallel */
  analyzeFrameMultiple: (
    videoElement: HTMLVideoElement,
    analysisTypes: AnalysisType[]
  ) => Promise<Map<AnalysisType, FrameAnalysisResult | null>>;
  
  /** Whether any analysis is currently in progress */
  isAnalyzing: boolean;
  
  /** Which analysis types are currently running */
  analyzingTypes: Set<AnalysisType>;
  
  /** Last court analysis result */
  courtResult: CourtAnalysisResult | null;
  
  /** Last camera angle result */
  cameraAngleResult: CameraAngleResult | null;
  
  /** Last error message */
  error: string | null;
  
  /** Clear all results */
  clearResults: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFrameAnalysis(
  options: UseFrameAnalysisOptions = {}
): UseFrameAnalysisReturn {
  const {
    captureQuality = 0.85,
    sport,
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError,
  } = options;

  // State
  const [analyzingTypes, setAnalyzingTypes] = useState<Set<AnalysisType>>(new Set());
  const [courtResult, setCourtResult] = useState<CourtAnalysisResult | null>(null);
  const [cameraAngleResult, setCameraAngleResult] = useState<CameraAngleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Canvas ref for frame capture (reused to avoid creating new canvases)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Capture a frame from a video element as a Blob
   */
  const captureFrame = useCallback((
    videoElement: HTMLVideoElement
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      // Create or reuse canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw current frame
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      ctx.drawImage(videoElement, 0, 0);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to capture frame"));
          }
        },
        "image/jpeg",
        captureQuality
      );
    });
  }, [captureQuality]);

  /**
   * Send frame to API for analysis
   */
  const sendForAnalysis = useCallback(async (
    frameBlob: Blob,
    analysisType: AnalysisType
  ): Promise<FrameAnalysisResult | null> => {
    const formData = new FormData();
    formData.append("image", frameBlob, "frame.jpg");
    formData.append("analysisType", analysisType);
    if (sport) {
      formData.append("sport", sport);
    }
    
    const response = await fetch("/api/analyze-frame", {
      method: "POST",
      body: formData,
    });
    
    const data: FrameAnalysisResponse = await response.json();
    
    if (!data.success || !data.result) {
      throw new Error(data.error || "Analysis failed");
    }
    
    return data.result;
  }, [sport]);

  /**
   * Analyze a single frame with a specific analysis type
   */
  const analyzeFrame = useCallback(async (
    videoElement: HTMLVideoElement,
    analysisType: AnalysisType
  ): Promise<FrameAnalysisResult | null> => {
    // Add to analyzing set
    setAnalyzingTypes((prev) => new Set(prev).add(analysisType));
    setError(null);
    onAnalysisStart?.(analysisType);
    
    // Track frame analysis request
    track('frame_analysis_requested', {
      analysisType: analysisType,
      sport,
    });
    
    try {
      // Capture frame
      const frameBlob = await captureFrame(videoElement);
      
      // Send for analysis
      const result = await sendForAnalysis(frameBlob, analysisType);
      
      // Update appropriate result state
      if (result) {
        if (result.type === "court") {
          setCourtResult(result);
        } else if (result.type === "camera-angle") {
          setCameraAngleResult(result);
        }
        
        // Track successful analysis
        track('analysis_completed', {
          analysisType: analysisType,
          sport,
          success: true,
        });
        
        onAnalysisComplete?.(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      
      // Track failed analysis
      track('analysis_failed', {
        analysisType: analysisType,
        sport,
        success: false,
        errorMessage,
      });
      
      setError(errorMessage);
      onAnalysisError?.(errorMessage, analysisType);
      return null;
    } finally {
      // Remove from analyzing set
      setAnalyzingTypes((prev) => {
        const next = new Set(prev);
        next.delete(analysisType);
        return next;
      });
    }
  }, [captureFrame, sendForAnalysis, onAnalysisStart, onAnalysisComplete, onAnalysisError]);

  /**
   * Analyze a frame with multiple analysis types in parallel
   */
  const analyzeFrameMultiple = useCallback(async (
    videoElement: HTMLVideoElement,
    analysisTypes: AnalysisType[]
  ): Promise<Map<AnalysisType, FrameAnalysisResult | null>> => {
    const results = new Map<AnalysisType, FrameAnalysisResult | null>();
    
    // Capture frame once
    let frameBlob: Blob;
    try {
      frameBlob = await captureFrame(videoElement);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Frame capture failed";
      setError(errorMessage);
      analysisTypes.forEach((type) => {
        results.set(type, null);
        onAnalysisError?.(errorMessage, type);
      });
      return results;
    }
    
    // Add all types to analyzing set
    setAnalyzingTypes(new Set(analysisTypes));
    setError(null);
    analysisTypes.forEach((type) => onAnalysisStart?.(type));
    
    // Run analyses in parallel
    const promises = analysisTypes.map(async (analysisType) => {
      try {
        const result = await sendForAnalysis(frameBlob, analysisType);
        
        // Update appropriate result state
        if (result) {
          if (result.type === "court") {
            setCourtResult(result);
          } else if (result.type === "camera-angle") {
            setCameraAngleResult(result);
          }
          onAnalysisComplete?.(result);
        }
        
        results.set(analysisType, result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        results.set(analysisType, null);
        onAnalysisError?.(errorMessage, analysisType);
      }
    });
    
    await Promise.all(promises);
    
    // Clear analyzing set
    setAnalyzingTypes(new Set());
    
    return results;
  }, [captureFrame, sendForAnalysis, onAnalysisStart, onAnalysisComplete, onAnalysisError]);

  /**
   * Clear all results
   */
  const clearResults = useCallback(() => {
    setCourtResult(null);
    setCameraAngleResult(null);
    setError(null);
  }, []);

  return {
    analyzeFrame,
    analyzeFrameMultiple,
    isAnalyzing: analyzingTypes.size > 0,
    analyzingTypes,
    courtResult,
    cameraAngleResult,
    error,
    clearResults,
  };
}

