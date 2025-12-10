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

// What we store in S3
export interface StoredPoseData {
  version: string;
  createdAt: string;
  videoFPS: number;
  totalFrames: number;
  modelUsed: string;
  
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
    // Convert Map to plain object for JSON serialization
    const posesObject: Record<number, PoseDetectionResult[]> = {};
    preprocessedPoses.forEach((poses, frame) => {
      posesObject[frame] = poses;
    });

    const data = {
      videoS3Key,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      videoFPS,
      totalFrames: preprocessedPoses.size,
      modelUsed,
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
 * Load pose data from S3 via API
 * @param videoS3Key - The S3 key of the video (unique identifier)
 */
export async function loadPoseData(videoS3Key: string): Promise<LoadPoseDataResponse> {
  try {
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
 * Convert stored pose data back to Map format used by the viewer
 */
export function convertToPreprocessedPoses(
  storedData: StoredPoseData
): Map<number, PoseDetectionResult[]> {
  const map = new Map<number, PoseDetectionResult[]>();
  
  for (const [frameStr, poses] of Object.entries(storedData.poses)) {
    const frame = parseInt(frameStr, 10);
    if (!isNaN(frame)) {
      map.set(frame, poses);
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

