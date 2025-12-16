/**
 * Pose Data Service
 * 
 * Handles saving and loading pose data to/from S3 for persistence.
 * 
 * Data stored:
 * - Pose keypoints per frame (expensive to regenerate)
 * - Swing thumbnails (require video to extract)
 * 
 * Data derived on load (uses latest protocols):
 * - Swing detection results
 * - Protocol events
 */

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

// Custom event type for user-created markers
export interface StoredCustomEvent {
  id: string;
  name: string;
  color: string;
  time: number;
  frame: number;
  createdAt: number;
}

// Protocol event adjustment (user-modified position of AI-detected events)
export interface StoredProtocolAdjustment {
  /** Original event ID from the protocol */
  eventId: string;
  /** Protocol that generated this event */
  protocolId: string;
  /** Adjusted time in seconds */
  time: number;
  /** Adjusted frame number */
  frame: number;
  /** When the adjustment was made */
  adjustedAt: number;
}

// Video comment type for position-based comments on video frames
export interface StoredVideoComment {
  id: string;
  /** Short title for the comment */
  title: string;
  /** Full description (supports multi-line) */
  description: string;
  /** Color for the comment marker */
  color: string;
  /** X position as percentage (0-1) of video width */
  x: number;
  /** Y position as percentage (0-1) of video height */
  y: number;
  /** Time in seconds where the comment was placed */
  time: number;
  /** Frame number where the comment was placed */
  frame: number;
  /** Timestamp when the comment was created */
  createdAt: number;
}

// Swing boundary adjustment (user-modified start/end of detected swings)
export interface StoredSwingBoundaryAdjustment {
  /** Original event ID from the swing detection protocol */
  eventId: string;
  /** Adjusted start time in seconds (if modified) */
  startTime?: number;
  /** Adjusted start frame number (if modified) */
  startFrame?: number;
  /** Adjusted end time in seconds (if modified) */
  endTime?: number;
  /** Adjusted end frame number (if modified) */
  endFrame?: number;
  /** When the adjustment was made */
  adjustedAt: number;
}

// Standard MoveNet keypoint order (17 keypoints)
export const MOVENET_KEYPOINT_ORDER = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
] as const;

// What we store in S3
export interface StoredPoseData {
  version: string;
  createdAt: string;
  videoFPS: number;
  totalFrames: number;
  modelUsed: string;
  
  // Keypoint name order (for optimized format without name in each keypoint)
  keypointOrder?: string[];
  
  // Pose data per frame (keyed by frame number)
  poses: Record<number, PoseDetectionResult[]>;
  
  // Swing thumbnails (keyed by frame number)
  thumbnails?: Record<number, string>; // frame -> S3 URL
  
  // User-created custom events/markers
  customEvents?: StoredCustomEvent[];
  
  // User adjustments to AI-detected protocol events
  protocolAdjustments?: StoredProtocolAdjustment[];
  
  // User-created video comments (position-based)
  videoComments?: StoredVideoComment[];
  
  // User adjustments to swing boundaries (start/end times)
  swingBoundaryAdjustments?: StoredSwingBoundaryAdjustment[];
  
  // User preferences for data analysis view
  userPreferences?: {
    /** Confidence threshold for highlighting low-confidence frames (0-1) */
    confidenceThreshold?: number;
  };
  
  // Metadata
  metadata?: {
    videoDuration?: number;
    videoWidth?: number;
    videoHeight?: number;
    handedness?: "left" | "right";
  };
}

// API response types
export interface SavePoseDataResponse {
  success: boolean;
  s3Key?: string;
  error?: string;
}

export interface LoadPoseDataResponse {
  success: boolean;
  data?: StoredPoseData;
  error?: string;
}

// ============================================================================
// Pose Data Optimization Helpers
// ============================================================================

/**
 * Round a number to specified decimal places for storage efficiency.
 */
function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Optimize a single keypoint for storage.
 * - Rounds coordinates to 2 decimal places (sufficient for pixel precision)
 * - Rounds score to 3 decimal places
 * - Removes name field (keypoints are always in fixed order for MoveNet/BlazePose)
 */
function optimizeKeypoint(kp: { x: number; y: number; score?: number; name?: string }): { x: number; y: number; score?: number } {
  const optimized: { x: number; y: number; score?: number } = {
    x: roundToDecimals(kp.x, 4),
    y: roundToDecimals(kp.y, 4),
  };
  
  // Only include score if meaningful (> 0.01)
  if (kp.score !== undefined && kp.score > 0.01) {
    optimized.score = roundToDecimals(kp.score, 3);
  }
  
  return optimized;
}

/**
 * Optimize pose detection results for storage efficiency.
 * Reduces file size by ~75% through:
 * - Rounding coordinates to 2 decimal places
 * - Rounding scores to 3 decimal places
 * - Removing redundant keypoint name fields
 */
function optimizePoses(poses: Map<number, PoseDetectionResult[]>): Record<number, Array<{ keypoints: Array<{ x: number; y: number; score?: number }>; score?: number }>> {
  const optimized: Record<number, Array<{ keypoints: Array<{ x: number; y: number; score?: number }>; score?: number }>> = {};
  
  poses.forEach((framePoses, frame) => {
    optimized[frame] = framePoses.map(pose => ({
      keypoints: pose.keypoints.map(optimizeKeypoint),
      ...(pose.score !== undefined && { score: roundToDecimals(pose.score, 3) }),
    }));
  });
  
  return optimized;
}

/**
 * Save pose data to S3 via API
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function savePoseData(
  videoS3Key: string,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  videoFPS: number,
  modelUsed: string,
  metadata?: StoredPoseData["metadata"]
): Promise<SavePoseDataResponse> {
  try {
    // Optimize poses for storage (reduces size by ~75%)
    const posesObject = optimizePoses(preprocessedPoses);

    const data = {
      videoS3Key,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      videoFPS,
      totalFrames: preprocessedPoses.size,
      modelUsed,
      keypointOrder: [...MOVENET_KEYPOINT_ORDER], // Store keypoint order for name restoration
      poses: posesObject,
      metadata,
    };

    const response = await fetch("/api/pose-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, s3Key: result.s3Key };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Load pose data from S3 via API or from a direct URL
 * @param videoS3Key - The S3 key of the video (unique identifier)
 * @param directUrl - Optional direct URL to fetch pose data from (for public buckets)
 */
export async function loadPoseData(videoS3Key: string, directUrl?: string): Promise<LoadPoseDataResponse> {
  try {
    // If a direct URL is provided (e.g., for sample tasks in public buckets), fetch directly
    if (directUrl) {
      const response = await fetch(directUrl);
      
      if (response.status === 404) {
        return { success: false, error: "No pose data found" };
      }
      
      if (!response.ok) {
        return { success: false, error: `Failed to fetch pose data: ${response.statusText}` };
      }
      
      const data: StoredPoseData = await response.json();
      return { success: true, data };
    }
    
    // Otherwise, use the API to fetch from the private bucket
    const response = await fetch(`/api/pose-data?videoS3Key=${encodeURIComponent(videoS3Key)}`);

    if (response.status === 404) {
      return { success: false, error: "No pose data found" };
    }

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data: StoredPoseData = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert stored pose data back to Map format used by the viewer.
 * Handles both old format (with name in each keypoint) and new optimized format
 * (with keypointOrder at root level).
 */
export function convertToPreprocessedPoses(
  storedData: StoredPoseData
): Map<number, PoseDetectionResult[]> {
  const map = new Map<number, PoseDetectionResult[]>();
  
  // Determine keypoint order: use stored order, or fall back to MoveNet standard
  const keypointOrder = storedData.keypointOrder || MOVENET_KEYPOINT_ORDER;
  
  // Check if we need to restore keypoint names (optimized format)
  // by looking at the first keypoint of the first pose
  const firstFrame = Object.values(storedData.poses)[0];
  const needsNameRestoration = firstFrame?.[0]?.keypoints?.[0]?.name === undefined;
  
  for (const [frameStr, poses] of Object.entries(storedData.poses)) {
    const frame = parseInt(frameStr, 10);
    if (!isNaN(frame)) {
      if (needsNameRestoration) {
        // Restore keypoint names from the order array
        const restoredPoses = poses.map(pose => ({
          ...pose,
          keypoints: pose.keypoints.map((kp, index) => ({
            ...kp,
            name: keypointOrder[index] || `keypoint_${index}`,
          })),
        }));
        map.set(frame, restoredPoses);
      } else {
        map.set(frame, poses);
      }
    }
  }
  
  return map;
}

/**
 * Check if pose data exists for a video
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function hasPoseData(videoS3Key: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/pose-data?videoS3Key=${encodeURIComponent(videoS3Key)}`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete pose data for a video
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function deletePoseData(videoS3Key: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/pose-data?videoS3Key=${encodeURIComponent(videoS3Key)}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Save or update custom events for a video
 * This merges with existing pose data (if any) to avoid losing pose data
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function saveCustomEvents(
  videoS3Key: string,
  customEvents: StoredCustomEvent[]
): Promise<SavePoseDataResponse> {
  try {
    // First, load existing data
    const existing = await loadPoseData(videoS3Key);
    
    if (existing.success && existing.data) {
      // Update existing data with new custom events
      const updatedData = {
        videoS3Key,
        ...existing.data,
        customEvents,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    } else {
      // No existing pose data - create minimal structure with just custom events
      const data = {
        videoS3Key,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        videoFPS: 30, // Will be updated when pose data is added
        totalFrames: 0,
        modelUsed: "none",
        poses: {},
        customEvents,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Save or update protocol adjustments for a video
 * This stores user modifications to AI-detected event positions
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function saveProtocolAdjustments(
  videoS3Key: string,
  adjustments: Map<string, { time: number; frame: number; protocolId?: string }>
): Promise<SavePoseDataResponse> {
  try {
    // First, load existing data
    const existing = await loadPoseData(videoS3Key);
    
    // Convert Map to array for storage
    const protocolAdjustments: StoredProtocolAdjustment[] = [];
    adjustments.forEach((adj, eventId) => {
      protocolAdjustments.push({
        eventId,
        protocolId: adj.protocolId || "unknown",
        time: adj.time,
        frame: adj.frame,
        adjustedAt: Date.now(),
      });
    });
    
    if (existing.success && existing.data) {
      // Update existing data with new protocol adjustments
      const updatedData = {
        videoS3Key,
        ...existing.data,
        protocolAdjustments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    } else {
      // No existing pose data - create minimal structure with just adjustments
      const data = {
        videoS3Key,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        videoFPS: 30,
        totalFrames: 0,
        modelUsed: "none",
        poses: {},
        protocolAdjustments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert stored protocol adjustments to Map format used by the viewer
 */
export function convertToProtocolAdjustments(
  storedData: StoredPoseData
): Map<string, { time: number; frame: number }> {
  const map = new Map<string, { time: number; frame: number }>();
  
  if (storedData.protocolAdjustments) {
    for (const adj of storedData.protocolAdjustments) {
      map.set(adj.eventId, { time: adj.time, frame: adj.frame });
    }
  }
  
  return map;
}

/**
 * Save or update video comments for a video
 * Video comments are position-based markers tied to specific pixels on the video
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function saveVideoComments(
  videoS3Key: string,
  videoComments: StoredVideoComment[]
): Promise<SavePoseDataResponse> {
  try {
    // First, load existing data
    const existing = await loadPoseData(videoS3Key);
    
    if (existing.success && existing.data) {
      // Update existing data with new video comments
      const updatedData = {
        videoS3Key,
        ...existing.data,
        videoComments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    } else {
      // No existing pose data - create minimal structure with just video comments
      const data = {
        videoS3Key,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        videoFPS: 30,
        totalFrames: 0,
        modelUsed: "none",
        poses: {},
        videoComments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Save or update swing boundary adjustments for a video
 * This stores user modifications to swing start/end times
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function saveSwingBoundaryAdjustments(
  videoS3Key: string,
  adjustments: Map<string, { startTime?: number; startFrame?: number; endTime?: number; endFrame?: number }>
): Promise<SavePoseDataResponse> {
  try {
    // First, load existing data
    const existing = await loadPoseData(videoS3Key);
    
    // Convert Map to array for storage
    const swingBoundaryAdjustments: StoredSwingBoundaryAdjustment[] = [];
    adjustments.forEach((adj, eventId) => {
      swingBoundaryAdjustments.push({
        eventId,
        startTime: adj.startTime,
        startFrame: adj.startFrame,
        endTime: adj.endTime,
        endFrame: adj.endFrame,
        adjustedAt: Date.now(),
      });
    });
    
    if (existing.success && existing.data) {
      // Update existing data with new swing boundary adjustments
      const updatedData = {
        videoS3Key,
        ...existing.data,
        swingBoundaryAdjustments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    } else {
      // No existing pose data - create minimal structure with just adjustments
      const data = {
        videoS3Key,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        videoFPS: 30,
        totalFrames: 0,
        modelUsed: "none",
        poses: {},
        swingBoundaryAdjustments,
      };
      
      const response = await fetch("/api/pose-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result = await response.json();
      return { success: true, s3Key: result.s3Key };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert stored swing boundary adjustments to Map format used by the viewer
 */
export function convertToSwingBoundaryAdjustments(
  storedData: StoredPoseData
): Map<string, { startTime?: number; startFrame?: number; endTime?: number; endFrame?: number }> {
  const map = new Map<string, { startTime?: number; startFrame?: number; endTime?: number; endFrame?: number }>();
  
  if (storedData.swingBoundaryAdjustments) {
    for (const adj of storedData.swingBoundaryAdjustments) {
      map.set(adj.eventId, {
        startTime: adj.startTime,
        startFrame: adj.startFrame,
        endTime: adj.endTime,
        endFrame: adj.endFrame,
      });
    }
  }
  
  return map;
}

