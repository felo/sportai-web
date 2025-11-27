/**
 * Frame Analysis Types
 * 
 * Type definitions for Gemini-powered single-frame analysis.
 * Supports multiple analysis types through a discriminated union pattern.
 */

// ============================================================================
// Analysis Types
// ============================================================================

export type AnalysisType = "court" | "camera-angle";

// ============================================================================
// Court Analysis
// ============================================================================

export interface CourtCorner {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

export interface CourtCorners {
  topLeft: CourtCorner;
  topRight: CourtCorner;
  bottomLeft: CourtCorner;
  bottomRight: CourtCorner;
}

export interface CourtBoundingBox {
  x: number;      // Normalized 0-1
  y: number;      // Normalized 0-1
  width: number;  // Normalized 0-1
  height: number; // Normalized 0-1
}

export type CourtType = "tennis" | "pickleball" | "padel" | "unknown";

export interface CourtAnalysisResult {
  type: "court";
  found: boolean;
  courtType?: CourtType;
  corners?: CourtCorners;
  boundingBox?: CourtBoundingBox;
  confidence: number;
  error?: string;
}

// ============================================================================
// Camera Angle Analysis
// ============================================================================

export type CameraAngle = "behind" | "side" | "overhead" | "diagonal" | "other";

export interface CameraAngleResult {
  type: "camera-angle";
  angle: CameraAngle;
  confidence: number;
  description?: string; // Optional description of the camera position
  error?: string;
}

// ============================================================================
// Unified Response Types (Discriminated Union)
// ============================================================================

export type FrameAnalysisResult = CourtAnalysisResult | CameraAngleResult;

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface FrameAnalysisRequest {
  image: Blob;
  analysisType: AnalysisType;
}

export interface FrameAnalysisResponse {
  success: boolean;
  result?: FrameAnalysisResult;
  error?: string;
  processingTimeMs?: number;
}

// ============================================================================
// Hook State Types
// ============================================================================

export interface FrameAnalysisState {
  isAnalyzing: boolean;
  lastResult: FrameAnalysisResult | null;
  error: string | null;
}

export interface CourtAnalysisState extends FrameAnalysisState {
  lastResult: CourtAnalysisResult | null;
}

export interface CameraAngleState extends FrameAnalysisState {
  lastResult: CameraAngleResult | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Convert normalized coordinates to pixel coordinates
 */
export interface PixelCoordinates {
  x: number;
  y: number;
}

export interface PixelCorners {
  topLeft: PixelCoordinates;
  topRight: PixelCoordinates;
  bottomLeft: PixelCoordinates;
  bottomRight: PixelCoordinates;
}

/**
 * Helper to convert normalized court corners to pixel coordinates
 */
export function cornersToPixels(
  corners: CourtCorners,
  width: number,
  height: number
): PixelCorners {
  return {
    topLeft: {
      x: corners.topLeft.x * width,
      y: corners.topLeft.y * height,
    },
    topRight: {
      x: corners.topRight.x * width,
      y: corners.topRight.y * height,
    },
    bottomLeft: {
      x: corners.bottomLeft.x * width,
      y: corners.bottomLeft.y * height,
    },
    bottomRight: {
      x: corners.bottomRight.x * width,
      y: corners.bottomRight.y * height,
    },
  };
}

/**
 * Helper to convert normalized bounding box to pixel coordinates
 */
export function boundingBoxToPixels(
  box: CourtBoundingBox,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: box.x * width,
    y: box.y * height,
    width: box.width * width,
    height: box.height * height,
  };
}

