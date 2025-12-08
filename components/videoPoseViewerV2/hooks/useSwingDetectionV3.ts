/**
 * Swing Detection V3
 * 
 * Enhanced swing detection using body orientation + wrist velocity.
 * Key improvements over V2:
 * - Correlates body rotation with wrist velocity for better swing detection
 * - Classifies swing type (forehand/backhand) based on rotation direction
 * - Detects swing phases (loading, swing, contact, follow-through, recovery)
 * - Reduces false positives by requiring coordinated rotation + velocity
 */

import { useState, useCallback, useMemo } from "react";
import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";
import { calculateBodyOrientation } from "@/components/chat/viewers/videoPoseViewer/utils/canvasDrawing";

// ============================================================================
// Types
// ============================================================================

export type SwingType = "forehand" | "backhand" | "unknown";
export type SwingPhase = "neutral" | "loading" | "swing" | "contact" | "follow" | "recovery";

/**
 * A detected swing with orientation data
 */
export interface DetectedSwingV3 {
  id: string;
  frame: number;
  timestamp: number;
  
  // Velocity metrics
  peakVelocity: number;           // px/frame at contact
  velocityKmh: number;            // estimated real-world speed
  
  // Orientation metrics
  orientationAtContact: number;   // body orientation at peak (degrees)
  rotationRange: number;          // total rotation during swing (degrees)
  peakRotationVelocity: number;   // max rotation speed (degrees/frame)
  
  // Classification
  swingType: SwingType;
  dominantSide: "left" | "right" | "both";
  confidence: number;
  
  // Phase timing (frame numbers)
  loadingStart: number;
  swingStart: number;
  contactFrame: number;
  followEnd: number;
  
  // Clip boundaries for analysis (anchored to followEnd)
  clipStartTime: number;          // followEnd - clipLeadTime (seconds)
  clipEndTime: number;            // followEnd + clipTrailTime (seconds)
  clipStartFrame: number;         // clipStartTime * fps
  clipEndFrame: number;           // clipEndTime * fps
  clipDuration: number;           // clipEndTime - clipStartTime (seconds)
  
  // Combined score
  swingScore: number;             // velocity * rotation correlation
}

/**
 * Per-frame data for analysis and visualization
 */
export interface SwingFrameDataV3 {
  frame: number;
  timestamp: number;
  
  // Velocity
  wristVelocity: number | null;
  leftWristVelocity: number | null;
  rightWristVelocity: number | null;
  radialVelocity: number | null;
  
  // Orientation
  bodyOrientation: number | null;
  orientationVelocity: number | null;  // degrees/frame
  
  // Combined metrics
  swingScore: number | null;           // velocity * |orientationVelocity|
  
  // Phase detection
  phase: SwingPhase;
}

/**
 * Complete swing detection result
 */
export interface SwingDetectionResultV3 {
  swings: DetectedSwingV3[];
  frameData: SwingFrameDataV3[];
  
  // Summary
  totalSwings: number;
  forehandCount: number;
  backhandCount: number;
  averageVelocity: number;
  maxVelocity: number;
  averageRotation: number;
  
  // Metadata
  framesAnalyzed: number;
  videoDuration: number;
  analysisTimestamp: string;
}

/**
 * Which wrist(s) to use for velocity calculation
 */
export type WristMode = "both" | "max" | "dominant";

/**
 * Configuration for V3 detection
 */
export interface SwingDetectionConfigV3 {
  // Velocity thresholds
  minVelocityThreshold: number;      // Min wrist velocity to consider (px/frame)
  minVelocityKmh: number;            // Min velocity in km/h to count as valid swing
  velocityPercentile: number;        // Percentile for adaptive threshold
  
  // Wrist selection
  wristMode: WristMode;              // Which wrist(s) to use: "both" (sum), "max", or "dominant"
  
  // Rotation thresholds
  minRotationVelocity: number;       // Min rotation speed to count (degrees/frame)
  requireRotation: boolean;          // Reject peaks without body rotation
  rotationWeight: number;            // Weight for rotation in swing score (0-1)
  
  // Timing
  minSwingDuration: number;          // Min frames for a valid swing
  maxSwingDuration: number;          // Max frames for a valid swing
  minTimeBetweenSwings: number;      // Min seconds between consecutive swings
  
  // Phase detection
  loadingRotationThreshold: number;  // Rotation velocity threshold for loading phase
  contactVelocityRatio: number;      // Ratio of peak to count as contact
  
  // Filtering
  smoothingWindow: number;           // Moving average window size
  minConfidence: number;             // Min keypoint confidence
  
  // Classification
  classifySwingType: boolean;        // Enable forehand/backhand classification
  handedness: "right" | "left";      // Player's dominant hand
  
  // Clip boundaries (for analysis export)
  clipLeadTime: number;              // Seconds before followEnd to start clip
  clipTrailTime: number;             // Seconds after followEnd to end clip
}

export const DEFAULT_CONFIG_V3: SwingDetectionConfigV3 = {
  minVelocityThreshold: 1,
  minVelocityKmh: 3,
  velocityPercentile: 75,
  wristMode: "both",
  minRotationVelocity: 0.5,
  requireRotation: true,
  rotationWeight: 0.3,
  minSwingDuration: 5,
  maxSwingDuration: 60,
  minTimeBetweenSwings: 0.8,
  loadingRotationThreshold: 1.5,
  contactVelocityRatio: 0.9,
  smoothingWindow: 3,
  minConfidence: 0.3,
  classifySwingType: true,
  handedness: "right",
  clipLeadTime: 2.0,
  clipTrailTime: 1.0,
};

// ============================================================================
// Hook
// ============================================================================

interface UseSwingDetectionV3Props {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
  config?: Partial<SwingDetectionConfigV3>;
}

export function useSwingDetectionV3({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
  config: userConfig,
}: UseSwingDetectionV3Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwingDetectionResultV3 | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG_V3,
    ...userConfig,
  }), [userConfig]);

  // Get keypoint indices based on model
  const indices = useMemo(() => {
    if (selectedModel === "BlazePose") {
      return {
        leftWrist: 15,
        rightWrist: 16,
        leftShoulder: 11,
        rightShoulder: 12,
        leftHip: 23,
        rightHip: 24,
      };
    }
    return {
      leftWrist: 9,
      rightWrist: 10,
      leftShoulder: 5,
      rightShoulder: 6,
      leftHip: 11,
      rightHip: 12,
    };
  }, [selectedModel]);

  /**
   * Calculate body center from core keypoints
   */
  const getBodyCenter = useCallback((
    pose: PoseDetectionResult,
    minConfidence: number
  ): { x: number; y: number } | null => {
    const keypoints = pose.keypoints;
    const coreIndices = [
      indices.leftShoulder,
      indices.rightShoulder,
      indices.leftHip,
      indices.rightHip,
    ];

    let sumX = 0, sumY = 0, count = 0;
    for (const idx of coreIndices) {
      const kp = keypoints[idx];
      if (kp && (kp.score ?? 0) >= minConfidence) {
        sumX += kp.x;
        sumY += kp.y;
        count++;
      }
    }

    if (count < 2) return null;
    return { x: sumX / count, y: sumY / count };
  }, [indices]);

  /**
   * Calculate wrist velocity relative to body center
   */
  const calculateWristVelocity = useCallback((
    currPose: PoseDetectionResult,
    prevPose: PoseDetectionResult,
    wristIdx: number,
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number },
    minConfidence: number
  ): number | null => {
    const currWrist = currPose.keypoints[wristIdx];
    const prevWrist = prevPose.keypoints[wristIdx];
    
    if (!currWrist || !prevWrist) return null;
    if ((currWrist.score ?? 0) < minConfidence) return null;
    if ((prevWrist.score ?? 0) < minConfidence) return null;
    
    // Relative positions
    const currRelX = currWrist.x - currCenter.x;
    const currRelY = currWrist.y - currCenter.y;
    const prevRelX = prevWrist.x - prevCenter.x;
    const prevRelY = prevWrist.y - prevCenter.y;
    
    // Velocity
    const dx = currRelX - prevRelX;
    const dy = currRelY - prevRelY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Calculate radial velocity (positive = extending, negative = retracting)
   */
  const calculateRadialVelocity = useCallback((
    currPose: PoseDetectionResult,
    prevPose: PoseDetectionResult,
    wristIdx: number,
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number },
    minConfidence: number
  ): number | null => {
    const currWrist = currPose.keypoints[wristIdx];
    const prevWrist = prevPose.keypoints[wristIdx];
    
    if (!currWrist || !prevWrist) return null;
    if ((currWrist.score ?? 0) < minConfidence) return null;
    if ((prevWrist.score ?? 0) < minConfidence) return null;
    
    const currRelX = currWrist.x - currCenter.x;
    const currRelY = currWrist.y - currCenter.y;
    const prevRelX = prevWrist.x - prevCenter.x;
    const prevRelY = prevWrist.y - prevCenter.y;
    
    const velX = currRelX - prevRelX;
    const velY = currRelY - prevRelY;
    
    const radialDist = Math.sqrt(currRelX * currRelX + currRelY * currRelY);
    if (radialDist < 1) return 0;
    
    const radialX = currRelX / radialDist;
    const radialY = currRelY / radialDist;
    
    return velX * radialX + velY * radialY;
  }, []);

  /**
   * Apply moving average smoothing
   */
  const smoothData = useCallback((
    data: (number | null)[],
    windowSize: number
  ): (number | null)[] => {
    const result: (number | null)[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      if (data[i] === null) {
        result.push(null);
        continue;
      }

      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
        if (data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      result.push(count > 0 ? sum / count : null);
    }

    return result;
  }, []);

  /**
   * Find local maxima (peaks) in data
   */
  const findPeaks = useCallback((
    data: (number | null)[],
    minValue: number,
    minDistance: number
  ): number[] => {
    const peaks: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const curr = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];
      
      if (curr === null || prev === null || next === null) continue;
      if (curr < minValue) continue;
      if (curr <= prev || curr <= next) continue;
      
      // Check distance from last peak
      if (peaks.length > 0) {
        const lastPeak = peaks[peaks.length - 1];
        if (i - lastPeak < minDistance) {
          // Keep the higher peak
          if (curr > (data[lastPeak] ?? 0)) {
            peaks.pop();
            peaks.push(i);
          }
          continue;
        }
      }
      
      peaks.push(i);
    }
    
    return peaks;
  }, []);

  /**
   * Determine swing type based on rotation direction
   */
  const classifySwingType = useCallback((
    orientationVelocities: (number | null)[],
    peakFrame: number,
    windowSize: number,
    handedness: "right" | "left"
  ): SwingType => {
    // Look at average rotation direction around the peak
    let sumRotation = 0;
    let count = 0;
    
    for (let i = Math.max(0, peakFrame - windowSize); i <= Math.min(orientationVelocities.length - 1, peakFrame + windowSize); i++) {
      const rot = orientationVelocities[i];
      if (rot !== null) {
        sumRotation += rot;
        count++;
      }
    }
    
    if (count === 0) return "unknown";
    
    const avgRotation = sumRotation / count;
    
    // For right-handed player:
    // - Forehand: rotating toward right (positive orientation velocity)
    // - Backhand: rotating toward left (negative orientation velocity)
    // For left-handed player: opposite
    
    if (handedness === "right") {
      if (avgRotation > 0.5) return "forehand";
      if (avgRotation < -0.5) return "backhand";
    } else {
      if (avgRotation < -0.5) return "forehand";
      if (avgRotation > 0.5) return "backhand";
    }
    
    return "unknown";
  }, []);

  /**
   * Detect swing phases around a peak
   */
  const detectPhases = useCallback((
    frameData: SwingFrameDataV3[],
    peakFrame: number,
    config: SwingDetectionConfigV3
  ): { loadingStart: number; swingStart: number; followEnd: number } => {
    const peakVelocity = frameData[peakFrame]?.wristVelocity ?? 0;
    const threshold = peakVelocity * config.contactVelocityRatio;
    
    // Find loading start (where rotation begins)
    let loadingStart = peakFrame;
    for (let i = peakFrame - 1; i >= 0; i--) {
      const data = frameData[i];
      if (!data || data.orientationVelocity === null) break;
      if (Math.abs(data.orientationVelocity) < config.loadingRotationThreshold) {
        loadingStart = i + 1;
        break;
      }
      loadingStart = i;
    }
    
    // Find swing start (where velocity starts rising significantly)
    let swingStart = peakFrame;
    for (let i = peakFrame - 1; i >= loadingStart; i--) {
      const data = frameData[i];
      if (!data || data.wristVelocity === null) break;
      if (data.wristVelocity < threshold * 0.3) {
        swingStart = i + 1;
        break;
      }
      swingStart = i;
    }
    
    // Find follow-through end (where velocity drops and rotation stops)
    let followEnd = peakFrame;
    for (let i = peakFrame + 1; i < frameData.length; i++) {
      const data = frameData[i];
      if (!data || data.wristVelocity === null) break;
      if (data.wristVelocity < threshold * 0.2) {
        followEnd = i;
        break;
      }
      followEnd = i;
    }
    
    return { loadingStart, swingStart, followEnd };
  }, []);

  /**
   * Main analysis function
   */
  const analyzeSwings = useCallback(async () => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
      const totalFrames = frames.length;
      const frameData: SwingFrameDataV3[] = [];
      
      // First pass: calculate per-frame metrics
      for (let i = 0; i < totalFrames; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        
        const timestamp = frame / videoFPS;
        const dataPoint: SwingFrameDataV3 = {
          frame,
          timestamp,
          wristVelocity: null,
          leftWristVelocity: null,
          rightWristVelocity: null,
          radialVelocity: null,
          bodyOrientation: null,
          orientationVelocity: null,
          swingScore: null,
          phase: "neutral",
        };
        
        if (!pose) {
          frameData.push(dataPoint);
          continue;
        }
        
        // Calculate body orientation
        const orientation = calculateBodyOrientation(
          pose.keypoints,
          selectedModel === "BlazePose" ? "BlazePose" : "MoveNet",
          config.minConfidence
        );
        dataPoint.bodyOrientation = orientation?.angle ?? null;
        
        // Calculate velocities (need previous frame)
        if (i > 0) {
          const prevFrame = frames[i - 1];
          const prevPoses = preprocessedPoses.get(prevFrame);
          const prevPose = prevPoses?.[selectedPoseIndex];
          
          if (prevPose) {
            const currCenter = getBodyCenter(pose, config.minConfidence);
            const prevCenter = getBodyCenter(prevPose, config.minConfidence);
            
            if (currCenter && prevCenter) {
              // Wrist velocities
              const leftVel = calculateWristVelocity(
                pose, prevPose, indices.leftWrist, currCenter, prevCenter, config.minConfidence
              );
              const rightVel = calculateWristVelocity(
                pose, prevPose, indices.rightWrist, currCenter, prevCenter, config.minConfidence
              );
              
              dataPoint.leftWristVelocity = leftVel;
              dataPoint.rightWristVelocity = rightVel;
              
              // Calculate combined wrist velocity based on mode
              if (leftVel !== null || rightVel !== null) {
                switch (config.wristMode) {
                  case "both":
                    // Sum of both wrists (default)
                    dataPoint.wristVelocity = (leftVel ?? 0) + (rightVel ?? 0);
                    break;
                  case "max":
                    // Maximum of the two wrists
                    dataPoint.wristVelocity = Math.max(leftVel ?? 0, rightVel ?? 0);
                    break;
                  case "dominant":
                    // Only use the dominant hand based on handedness setting
                    dataPoint.wristVelocity = config.handedness === "right" 
                      ? (rightVel ?? 0) 
                      : (leftVel ?? 0);
                    break;
                  default:
                    dataPoint.wristVelocity = (leftVel ?? 0) + (rightVel ?? 0);
                }
              }
              
              // Radial velocity (use dominant wrist)
              const radialLeft = calculateRadialVelocity(
                pose, prevPose, indices.leftWrist, currCenter, prevCenter, config.minConfidence
              );
              const radialRight = calculateRadialVelocity(
                pose, prevPose, indices.rightWrist, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.radialVelocity = Math.max(radialLeft ?? 0, radialRight ?? 0);
            }
            
            // Orientation velocity
            const prevOrientation = calculateBodyOrientation(
              prevPose.keypoints,
              selectedModel === "BlazePose" ? "BlazePose" : "MoveNet",
              config.minConfidence
            );
            
            if (orientation && prevOrientation) {
              let orientDiff = orientation.angle - prevOrientation.angle;
              // Handle wrap-around
              if (orientDiff > 180) orientDiff -= 360;
              if (orientDiff < -180) orientDiff += 360;
              dataPoint.orientationVelocity = orientDiff;
            }
          }
        }
        
        // Calculate swing score
        if (dataPoint.wristVelocity !== null && dataPoint.orientationVelocity !== null) {
          const velocityComponent = dataPoint.wristVelocity;
          const rotationComponent = Math.abs(dataPoint.orientationVelocity);
          dataPoint.swingScore = velocityComponent * (1 - config.rotationWeight) + 
                                  velocityComponent * rotationComponent * config.rotationWeight;
        }
        
        frameData.push(dataPoint);
      }
      
      // Smooth the data
      const smoothedVelocities = smoothData(
        frameData.map(d => d.wristVelocity),
        config.smoothingWindow
      );
      const smoothedScores = smoothData(
        frameData.map(d => d.swingScore),
        config.smoothingWindow
      );
      
      // Update with smoothed values
      for (let i = 0; i < frameData.length; i++) {
        if (smoothedVelocities[i] !== null) {
          frameData[i].wristVelocity = smoothedVelocities[i];
        }
        if (smoothedScores[i] !== null) {
          frameData[i].swingScore = smoothedScores[i];
        }
      }
      
      // Calculate adaptive threshold
      const validScores = frameData
        .map(d => d.swingScore)
        .filter((s): s is number => s !== null)
        .sort((a, b) => a - b);
      
      const percentileIdx = Math.floor(validScores.length * config.velocityPercentile / 100);
      const adaptiveThreshold = validScores[percentileIdx] ?? config.minVelocityThreshold;
      const threshold = Math.max(adaptiveThreshold, config.minVelocityThreshold);
      
      // Find peaks in swing score
      const minDistanceFrames = Math.floor(config.minTimeBetweenSwings * videoFPS);
      const peakFrameIndices = findPeaks(
        frameData.map(d => d.swingScore),
        threshold,
        minDistanceFrames
      );
      
      // Build swing objects
      const swings: DetectedSwingV3[] = [];
      const orientationVelocities = frameData.map(d => d.orientationVelocity);
      
      for (const peakIdx of peakFrameIndices) {
        const peakData = frameData[peakIdx];
        if (!peakData || peakData.swingScore === null) continue;
        
        // Filter by rotation requirement
        if (config.requireRotation) {
          const rotVel = peakData.orientationVelocity;
          if (rotVel === null || Math.abs(rotVel) < config.minRotationVelocity) {
            continue;
          }
        }
        
        // Detect phases
        const phases = detectPhases(frameData, peakIdx, config);
        
        // Calculate rotation range during swing
        let minOrientation = Infinity;
        let maxOrientation = -Infinity;
        let peakRotationVel = 0;
        
        for (let i = phases.loadingStart; i <= phases.followEnd; i++) {
          const orient = frameData[i]?.bodyOrientation;
          const rotVel = frameData[i]?.orientationVelocity;
          if (orient !== null) {
            minOrientation = Math.min(minOrientation, orient);
            maxOrientation = Math.max(maxOrientation, orient);
          }
          if (rotVel !== null) {
            peakRotationVel = Math.max(peakRotationVel, Math.abs(rotVel));
          }
        }
        
        const rotationRange = maxOrientation !== -Infinity ? maxOrientation - minOrientation : 0;
        
        // Classify swing type
        const swingType = config.classifySwingType
          ? classifySwingType(orientationVelocities, peakIdx, 10, config.handedness)
          : "unknown";
        
        // Determine dominant side
        const leftVel = peakData.leftWristVelocity ?? 0;
        const rightVel = peakData.rightWristVelocity ?? 0;
        const symmetry = Math.min(leftVel, rightVel) / Math.max(leftVel, rightVel, 0.001);
        let dominantSide: "left" | "right" | "both" = "both";
        if (symmetry < 0.5) {
          dominantSide = leftVel > rightVel ? "left" : "right";
        }
        
        // Estimate real-world velocity (rough approximation)
        const pxPerMeter = 300; // Approximate
        const velocityKmh = (peakData.wristVelocity ?? 0) * videoFPS / pxPerMeter * 3.6;
        
        // Filter by minimum km/h threshold
        if (velocityKmh < config.minVelocityKmh) {
          continue;
        }
        
        // Calculate clip boundaries (anchored to followEnd)
        const followEndFrame = frameData[phases.followEnd]?.frame ?? peakData.frame;
        const followEndTime = followEndFrame / videoFPS;
        const videoDuration = totalFrames / videoFPS;
        
        // Clip start = followEnd - leadTime (clamped to 0)
        const clipStartTime = Math.max(0, followEndTime - config.clipLeadTime);
        const clipStartFrame = Math.floor(clipStartTime * videoFPS);
        
        // Clip end = followEnd + trailTime (clamped to video duration)
        const clipEndTime = Math.min(videoDuration, followEndTime + config.clipTrailTime);
        const clipEndFrame = Math.floor(clipEndTime * videoFPS);
        
        const clipDuration = clipEndTime - clipStartTime;
        
        swings.push({
          id: `swing-${peakData.frame}`,
          frame: peakData.frame,
          timestamp: peakData.timestamp,
          peakVelocity: peakData.wristVelocity ?? 0,
          velocityKmh,
          orientationAtContact: peakData.bodyOrientation ?? 0,
          rotationRange,
          peakRotationVelocity: peakRotationVel,
          swingType,
          dominantSide,
          confidence: peakData.swingScore! / (validScores[validScores.length - 1] ?? 1),
          loadingStart: frameData[phases.loadingStart]?.frame ?? peakData.frame,
          swingStart: frameData[phases.swingStart]?.frame ?? peakData.frame,
          contactFrame: peakData.frame,
          followEnd: followEndFrame,
          clipStartTime,
          clipEndTime,
          clipStartFrame,
          clipEndFrame,
          clipDuration,
          swingScore: peakData.swingScore!,
        });
      }
      
      // Merge overlapping swings (if one covers 70% or more of the other)
      const mergedSwings: DetectedSwingV3[] = [];
      const OVERLAP_THRESHOLD = 0.7; // 70% overlap triggers merge
      
      for (const swing of swings) {
        let shouldMerge = false;
        let mergeTargetIdx = -1;
        
        for (let i = 0; i < mergedSwings.length; i++) {
          const existing = mergedSwings[i];
          
          // Calculate overlap between clip ranges
          const overlapStart = Math.max(swing.clipStartFrame, existing.clipStartFrame);
          const overlapEnd = Math.min(swing.clipEndFrame, existing.clipEndFrame);
          const overlapFrames = Math.max(0, overlapEnd - overlapStart);
          
          // Calculate coverage for each swing
          const swingDuration = swing.clipEndFrame - swing.clipStartFrame;
          const existingDuration = existing.clipEndFrame - existing.clipStartFrame;
          
          const swingCoverage = swingDuration > 0 ? overlapFrames / swingDuration : 0;
          const existingCoverage = existingDuration > 0 ? overlapFrames / existingDuration : 0;
          
          // If either swing covers 70%+ of the other, merge them
          if (swingCoverage >= OVERLAP_THRESHOLD || existingCoverage >= OVERLAP_THRESHOLD) {
            shouldMerge = true;
            mergeTargetIdx = i;
            break;
          }
        }
        
        if (shouldMerge && mergeTargetIdx >= 0) {
          const existing = mergedSwings[mergeTargetIdx];
          // Keep the swing with higher swing score (peak velocity * rotation)
          if (swing.swingScore > existing.swingScore) {
            // Replace with new swing but extend clip boundaries to cover both
            const mergedSwing: DetectedSwingV3 = {
              ...swing,
              clipStartFrame: Math.min(swing.clipStartFrame, existing.clipStartFrame),
              clipEndFrame: Math.max(swing.clipEndFrame, existing.clipEndFrame),
              clipStartTime: Math.min(swing.clipStartTime, existing.clipStartTime),
              clipEndTime: Math.max(swing.clipEndTime, existing.clipEndTime),
              clipDuration: Math.max(swing.clipEndTime, existing.clipEndTime) - Math.min(swing.clipStartTime, existing.clipStartTime),
              loadingStart: Math.min(swing.loadingStart, existing.loadingStart),
              followEnd: Math.max(swing.followEnd, existing.followEnd),
            };
            mergedSwings[mergeTargetIdx] = mergedSwing;
          } else {
            // Keep existing but extend clip boundaries
            mergedSwings[mergeTargetIdx] = {
              ...existing,
              clipStartFrame: Math.min(swing.clipStartFrame, existing.clipStartFrame),
              clipEndFrame: Math.max(swing.clipEndFrame, existing.clipEndFrame),
              clipStartTime: Math.min(swing.clipStartTime, existing.clipStartTime),
              clipEndTime: Math.max(swing.clipEndTime, existing.clipEndTime),
              clipDuration: Math.max(swing.clipEndTime, existing.clipEndTime) - Math.min(swing.clipStartTime, existing.clipStartTime),
              loadingStart: Math.min(swing.loadingStart, existing.loadingStart),
              followEnd: Math.max(swing.followEnd, existing.followEnd),
            };
          }
        } else {
          mergedSwings.push(swing);
        }
      }
      
      // Use merged swings for the rest of the analysis
      const finalSwings = mergedSwings;
      
      // Mark phases in frame data
      for (const swing of finalSwings) {
        for (let i = 0; i < frameData.length; i++) {
          const fd = frameData[i];
          if (fd.frame >= swing.loadingStart && fd.frame < swing.swingStart) {
            fd.phase = "loading";
          } else if (fd.frame >= swing.swingStart && fd.frame < swing.contactFrame) {
            fd.phase = "swing";
          } else if (fd.frame === swing.contactFrame) {
            fd.phase = "contact";
          } else if (fd.frame > swing.contactFrame && fd.frame <= swing.followEnd) {
            fd.phase = "follow";
          }
        }
      }
      
      // Calculate summary stats
      const velocities = finalSwings.map(s => s.peakVelocity);
      const rotations = finalSwings.map(s => s.rotationRange);
      
      const analysisResult: SwingDetectionResultV3 = {
        swings: finalSwings,
        frameData,
        totalSwings: finalSwings.length,
        forehandCount: finalSwings.filter(s => s.swingType === "forehand").length,
        backhandCount: finalSwings.filter(s => s.swingType === "backhand").length,
        averageVelocity: velocities.length > 0 
          ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
          : 0,
        maxVelocity: velocities.length > 0 ? Math.max(...velocities) : 0,
        averageRotation: rotations.length > 0
          ? rotations.reduce((a, b) => a + b, 0) / rotations.length
          : 0,
        framesAnalyzed: totalFrames,
        videoDuration: totalFrames / videoFPS,
        analysisTimestamp: new Date().toISOString(),
      };
      
      setResult(analysisResult);
      return analysisResult;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    preprocessedPoses,
    selectedModel,
    videoFPS,
    selectedPoseIndex,
    config,
    indices,
    getBodyCenter,
    calculateWristVelocity,
    calculateRadialVelocity,
    smoothData,
    findPeaks,
    classifySwingType,
    detectPhases,
  ]);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyzeSwings,
    clearResults,
    isAnalyzing,
    result,
    error,
    config,
  };
}

