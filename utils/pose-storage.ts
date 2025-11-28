/**
 * Pose Data Storage Utilities
 * 
 * Handles serialization, compression, upload, and download of preprocessed
 * pose detection data to/from S3.
 */

import type { StoredPoseData, StoredPoseResult, StoredKeypoint } from "@/types/pose";

// Type for runtime pose detection results (from TensorFlow.js)
interface PoseDetectionResult {
  keypoints: Array<{
    x: number;
    y: number;
    score?: number;
    name?: string;
  }>;
  score?: number;
  id?: number;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Round a number to specified decimal places for storage efficiency.
 * Default 4 decimal places gives ~0.01% precision which is sufficient for poses.
 */
function roundToDecimals(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Convert runtime keypoint to storage format with reduced precision.
 */
function keypointToStored(kp: PoseDetectionResult["keypoints"][0]): StoredKeypoint {
  const stored: StoredKeypoint = {
    x: roundToDecimals(kp.x),
    y: roundToDecimals(kp.y),
  };
  
  // Only include score if it exists and is meaningful
  if (kp.score !== undefined && kp.score > 0.01) {
    stored.score = roundToDecimals(kp.score, 3);
  }
  
  // Include name for debugging (can be stripped later if size is critical)
  if (kp.name) {
    stored.name = kp.name;
  }
  
  return stored;
}

/**
 * Convert runtime pose result to storage format.
 */
function poseToStored(pose: PoseDetectionResult): StoredPoseResult {
  const stored: StoredPoseResult = {
    keypoints: pose.keypoints.map(keypointToStored),
  };
  
  if (pose.score !== undefined) {
    stored.score = roundToDecimals(pose.score, 3);
  }
  
  if (pose.id !== undefined) {
    stored.id = pose.id;
  }
  
  return stored;
}

/**
 * Serialize preprocessed poses Map to StoredPoseData format.
 * 
 * @param poses - Map of frame number to pose detection results
 * @param metadata - Video and model metadata
 * @returns StoredPoseData object ready for JSON serialization
 */
export function serializePoseData(
  poses: Map<number, PoseDetectionResult[]>,
  metadata: {
    model: "MoveNet" | "BlazePose";
    modelType: string;
    videoFPS: number;
    videoDuration: number;
  }
): StoredPoseData {
  const frames: StoredPoseData["frames"] = {};
  
  poses.forEach((poseResults, frameNumber) => {
    // Only store frames that have pose data
    if (poseResults.length > 0) {
      frames[frameNumber.toString()] = poseResults.map(poseToStored);
    }
  });
  
  return {
    version: 1,
    model: metadata.model,
    modelType: metadata.modelType,
    videoFPS: metadata.videoFPS,
    totalFrames: poses.size,
    videoDuration: metadata.videoDuration,
    createdAt: new Date().toISOString(),
    frames,
  };
}

/**
 * Deserialize StoredPoseData back to Map format for runtime use.
 * 
 * @param data - StoredPoseData from S3
 * @returns Map of frame number to pose detection results
 */
export function deserializePoseData(
  data: StoredPoseData
): Map<number, PoseDetectionResult[]> {
  const poses = new Map<number, PoseDetectionResult[]>();
  
  for (const [frameStr, storedPoses] of Object.entries(data.frames)) {
    const frameNumber = parseInt(frameStr, 10);
    const poseResults: PoseDetectionResult[] = storedPoses.map(stored => ({
      keypoints: stored.keypoints.map(kp => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name,
      })),
      score: stored.score,
      id: stored.id,
    }));
    poses.set(frameNumber, poseResults);
  }
  
  return poses;
}

// ============================================================================
// S3 Upload/Download
// ============================================================================

/**
 * Generate S3 key for pose data based on video S3 key.
 * Pattern: users/{userId}/videos/{videoId}.mp4 -> users/{userId}/videos/{videoId}_poses.json
 */
export function getPoseDataS3Key(videoS3Key: string): string {
  // Remove file extension and add _poses.json
  const basePath = videoS3Key.replace(/\.[^.]+$/, "");
  return `${basePath}_poses.json`;
}

/**
 * Upload serialized pose data to S3.
 * 
 * @param videoS3Key - S3 key of the associated video
 * @param poseData - Serialized pose data
 * @returns S3 key where pose data was stored
 */
export async function uploadPoseData(
  videoS3Key: string,
  poseData: StoredPoseData
): Promise<string> {
  const poseS3Key = getPoseDataS3Key(videoS3Key);
  const jsonString = JSON.stringify(poseData);
  
  console.log(`📤 Uploading pose data to S3: ${poseS3Key} (${(jsonString.length / 1024).toFixed(1)} KB)`);
  
  // Get presigned upload URL
  const urlResponse = await fetch("/api/s3/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: poseS3Key.split("/").pop(),
      contentType: "application/json",
    }),
  });
  
  if (!urlResponse.ok) {
    throw new Error(`Failed to get upload URL: ${urlResponse.statusText}`);
  }
  
  const { uploadUrl, key } = await urlResponse.json();
  
  // Upload the JSON data
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: jsonString,
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload pose data: ${uploadResponse.statusText}`);
  }
  
  console.log(`✅ Pose data uploaded successfully: ${key}`);
  return key;
}

/**
 * Download pose data from S3.
 * 
 * @param poseS3Key - S3 key for the pose data
 * @returns Deserialized pose data Map, or null if not found
 */
export async function downloadPoseData(
  poseS3Key: string
): Promise<Map<number, PoseDetectionResult[]> | null> {
  console.log(`📥 Downloading pose data from S3: ${poseS3Key}`);
  
  try {
    // Get presigned download URL
    const urlResponse = await fetch("/api/s3/download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: poseS3Key,
        expiresIn: 3600, // 1 hour
      }),
    });
    
    if (!urlResponse.ok) {
      console.warn(`Failed to get download URL for pose data: ${urlResponse.statusText}`);
      return null;
    }
    
    const { downloadUrl } = await urlResponse.json();
    
    // Download the JSON data
    const dataResponse = await fetch(downloadUrl);
    
    if (!dataResponse.ok) {
      console.warn(`Failed to download pose data: ${dataResponse.statusText}`);
      return null;
    }
    
    const storedData: StoredPoseData = await dataResponse.json();
    
    console.log(`✅ Pose data downloaded: ${storedData.totalFrames} frames, model: ${storedData.model}`);
    
    return deserializePoseData(storedData);
  } catch (error) {
    console.error("Error downloading pose data:", error);
    return null;
  }
}

/**
 * Check if pose data exists in S3 for a given video.
 * Uses a HEAD request to check without downloading.
 * 
 * @param videoS3Key - S3 key of the video
 * @returns true if pose data exists
 */
export async function checkPoseDataExists(videoS3Key: string): Promise<boolean> {
  const poseS3Key = getPoseDataS3Key(videoS3Key);
  
  try {
    const urlResponse = await fetch("/api/s3/download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: poseS3Key,
        expiresIn: 60, // Short expiry for check
      }),
    });
    
    if (!urlResponse.ok) {
      return false;
    }
    
    const { downloadUrl } = await urlResponse.json();
    
    // HEAD request to check if file exists without downloading
    const headResponse = await fetch(downloadUrl, { method: "HEAD" });
    return headResponse.ok;
  } catch {
    return false;
  }
}

/**
 * Estimate the storage size of pose data in bytes.
 * Useful for UI feedback before upload.
 */
export function estimatePoseDataSize(poses: Map<number, PoseDetectionResult[]>): number {
  // Rough estimate: ~70 bytes per keypoint in JSON
  // MoveNet: 17 keypoints, BlazePose: 33 keypoints
  let totalKeypoints = 0;
  
  poses.forEach((poseResults) => {
    poseResults.forEach((pose) => {
      totalKeypoints += pose.keypoints.length;
    });
  });
  
  // ~70 bytes per keypoint + ~50 bytes overhead per frame
  return totalKeypoints * 70 + poses.size * 50;
}


