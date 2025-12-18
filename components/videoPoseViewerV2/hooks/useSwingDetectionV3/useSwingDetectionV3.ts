/**
 * Swing Detection V3 Hook
 * 
 * Enhanced swing detection using body orientation + wrist velocity.
 * Key improvements over V2:
 * - Correlates body rotation with wrist velocity for better swing detection
 * - Classifies swing type (forehand/backhand) based on rotation direction
 * - Detects swing phases (loading, swing, contact, follow-through, recovery)
 * - Reduces false positives by requiring coordinated rotation + velocity
 */

import { useState, useCallback, useMemo } from "react";
import { calculateBodyOrientation } from "@/components/chat/viewers/videoPoseViewer/utils/canvasDrawing";

// Types
import type {
  SwingFrameDataV3,
  SwingDetectionResultV3,
  DetectedSwingV3,
  UseSwingDetectionV3Props,
  KeypointIndices,
} from "./types";

// Constants
import { DEFAULT_CONFIG_V3, OVERLAP_THRESHOLD, TROPHY_OFFSET_SECONDS } from "./constants";

// Utilities
import {
  calculateMetersPerPixel,
  convertVelocityToKmh,
  calculateKneeAngle,
  calculateShoulderAngle,
  calculateElbowAngle,
  calculateHipAngle,
  fillDrops,
  smoothData,
  findPeaks,
  getBodyCenter,
  calculateKeypointVelocity,
  calculateRadialVelocity,
  classifySwingType,
  detectPhases,
} from "./utils";

// ============================================================================
// Keypoint Indices Helper
// ============================================================================

function getKeypointIndices(selectedModel: string): KeypointIndices {
  if (selectedModel === "BlazePose") {
    return {
      leftWrist: 15,
      rightWrist: 16,
      leftElbow: 13,
      rightElbow: 14,
      leftShoulder: 11,
      rightShoulder: 12,
      leftHip: 23,
      rightHip: 24,
      leftKnee: 25,
      rightKnee: 26,
      leftAnkle: 27,
      rightAnkle: 28,
      nose: 0,
    };
  }
  return {
    leftWrist: 9,
    rightWrist: 10,
    leftElbow: 7,
    rightElbow: 8,
    leftShoulder: 5,
    rightShoulder: 6,
    leftHip: 11,
    rightHip: 12,
    leftKnee: 13,
    rightKnee: 14,
    leftAnkle: 15,
    rightAnkle: 16,
    nose: 0,
  };
}

// ============================================================================
// Hook
// ============================================================================

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

  const indices = useMemo(() => getKeypointIndices(selectedModel), [selectedModel]);

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
      
      // Track torso heights for velocity normalization
      let totalTorsoHeight = 0;
      let torsoHeightCount = 0;
      
      // ========================================================================
      // PASS 1: Calculate per-frame metrics
      // ========================================================================
      for (let i = 0; i < totalFrames; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        
        const timestamp = frame / videoFPS;
        const dataPoint: SwingFrameDataV3 = createEmptyFrameData(frame, timestamp);
        
        if (!pose) {
          frameData.push(dataPoint);
          continue;
        }
        
        // Track keypoint confidence scores
        populateConfidenceScores(dataPoint, pose, indices);
        
        // Track torso height for velocity normalization
        const torsoHeight = calculateTorsoHeight(pose, indices, config.minConfidence);
        if (torsoHeight !== null) {
          totalTorsoHeight += torsoHeight;
          torsoHeightCount++;
        }
        
        // Calculate body orientation
        const orientation = calculateBodyOrientation(
          pose.keypoints,
          selectedModel === "BlazePose" ? "BlazePose" : "MoveNet",
          config.minConfidence
        );
        dataPoint.bodyOrientation = orientation?.angle ?? null;
        
        // Calculate segment line angles
        calculateSegmentAngles(dataPoint, pose, indices, config.minConfidence);
        
        // Calculate joint angles
        calculateAllJointAngles(dataPoint, pose, indices, config.minConfidence);
        
        // Calculate velocities (need previous frame)
        if (i > 0) {
          const prevFrame = frames[i - 1];
          const prevPoses = preprocessedPoses.get(prevFrame);
          const prevPose = prevPoses?.[selectedPoseIndex];
          
          if (prevPose) {
            calculateAllVelocities(
              dataPoint, pose, prevPose, indices, config,
              orientation, selectedModel, videoFPS
            );
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
      
      // ========================================================================
      // PASS 2: Convert to km/h, apply processing, and detect swings
      // ========================================================================
      const avgTorsoHeight = torsoHeightCount > 0 ? totalTorsoHeight / torsoHeightCount : 100;
      const metersPerPixel = calculateMetersPerPixel(avgTorsoHeight);
      
      // Calculate raw km/h values
      calculateRawKmhValues(frameData, metersPerPixel, videoFPS);
      
      // Apply drop filling and smoothing
      const processedData = applyDataProcessing(frameData, config.smoothingWindow);
      
      // Update frameData with processed values
      updateFrameDataWithProcessed(frameData, processedData, metersPerPixel, videoFPS, config);
      
      // Calculate accelerations
      calculateAccelerations(frameData, processedData, metersPerPixel, videoFPS);
      
      // Find peaks and build swing objects
      const swings = detectAndBuildSwings(
        frameData, config, videoFPS, totalFrames, metersPerPixel,
        preprocessedPoses, selectedPoseIndex, indices, frames
      );
      
      // Mark phases in frame data
      markPhasesInFrameData(frameData, swings);
      
      // Calculate summary stats
      const velocities = swings.map(s => s.peakVelocity);
      const rotations = swings.map(s => s.rotationRange);
      
      const analysisResult: SwingDetectionResultV3 = {
        swings,
        frameData,
        totalSwings: swings.length,
        forehandCount: swings.filter(s => s.swingType === "forehand").length,
        backhandCount: swings.filter(s => s.swingType === "backhand").length,
        serveCount: swings.filter(s => s.swingType === "serve").length,
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
  }, [preprocessedPoses, selectedModel, videoFPS, selectedPoseIndex, config, indices]);

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

// ============================================================================
// Helper Functions (Internal to hook file)
// ============================================================================

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SwingDetectionConfigV3 } from "./types";

/**
 * Create an empty frame data object with all null values
 */
function createEmptyFrameData(frame: number, timestamp: number): SwingFrameDataV3 {
  return {
    frame,
    timestamp,
    wristVelocity: null,
    wristVelocityKmh: null,
    rawWristVelocityKmh: null,
    leftWristVelocity: null,
    rightWristVelocity: null,
    rawLeftWristVelocityKmh: null,
    rawRightWristVelocityKmh: null,
    leftWristVelocityKmh: null,
    rightWristVelocityKmh: null,
    maxWristVelocityKmh: null,
    rawMaxWristVelocityKmh: null,
    leftWristConfidence: null,
    rightWristConfidence: null,
    leftElbowConfidence: null,
    rightElbowConfidence: null,
    leftShoulderConfidence: null,
    rightShoulderConfidence: null,
    leftHipConfidence: null,
    rightHipConfidence: null,
    leftKneeConfidence: null,
    rightKneeConfidence: null,
    leftAnkleConfidence: null,
    rightAnkleConfidence: null,
    rawLeftAnkleVelocity: null,
    rawRightAnkleVelocity: null,
    leftAnkleVelocity: null,
    rightAnkleVelocity: null,
    rawLeftAnkleVelocityKmh: null,
    rawRightAnkleVelocityKmh: null,
    leftAnkleVelocityKmh: null,
    rightAnkleVelocityKmh: null,
    rawLeftKneeVelocity: null,
    rawRightKneeVelocity: null,
    leftKneeVelocity: null,
    rightKneeVelocity: null,
    rawLeftKneeVelocityKmh: null,
    rawRightKneeVelocityKmh: null,
    leftKneeVelocityKmh: null,
    rightKneeVelocityKmh: null,
    rawLeftHipVelocity: null,
    rawRightHipVelocity: null,
    leftHipVelocity: null,
    rightHipVelocity: null,
    rawLeftHipVelocityKmh: null,
    rawRightHipVelocityKmh: null,
    leftHipVelocityKmh: null,
    rightHipVelocityKmh: null,
    rawLeftShoulderVelocity: null,
    rawRightShoulderVelocity: null,
    leftShoulderVelocity: null,
    rightShoulderVelocity: null,
    rawLeftShoulderVelocityKmh: null,
    rawRightShoulderVelocityKmh: null,
    leftShoulderVelocityKmh: null,
    rightShoulderVelocityKmh: null,
    rawLeftElbowVelocity: null,
    rawRightElbowVelocity: null,
    leftElbowVelocity: null,
    rightElbowVelocity: null,
    rawLeftElbowVelocityKmh: null,
    rawRightElbowVelocityKmh: null,
    leftElbowVelocityKmh: null,
    rightElbowVelocityKmh: null,
    leftWristAcceleration: null,
    rightWristAcceleration: null,
    maxWristAcceleration: null,
    leftAnkleAcceleration: null,
    rightAnkleAcceleration: null,
    maxAnkleAcceleration: null,
    leftKneeAcceleration: null,
    rightKneeAcceleration: null,
    maxKneeAcceleration: null,
    leftHipAcceleration: null,
    rightHipAcceleration: null,
    maxHipAcceleration: null,
    leftShoulderAcceleration: null,
    rightShoulderAcceleration: null,
    maxShoulderAcceleration: null,
    leftElbowAcceleration: null,
    rightElbowAcceleration: null,
    maxElbowAcceleration: null,
    radialVelocity: null,
    rawLeftKneeBend: null,
    rawRightKneeBend: null,
    rawMaxKneeBend: null,
    leftKneeBend: null,
    rightKneeBend: null,
    maxKneeBend: null,
    rawLeftShoulderAngle: null,
    rawRightShoulderAngle: null,
    leftShoulderAngle: null,
    rightShoulderAngle: null,
    rawLeftElbowAngle: null,
    rawRightElbowAngle: null,
    leftElbowAngle: null,
    rightElbowAngle: null,
    rawLeftHipAngle: null,
    rawRightHipAngle: null,
    leftHipAngle: null,
    rightHipAngle: null,
    bodyOrientation: null,
    orientationVelocity: null,
    hipLineAngle: null,
    shoulderLineAngle: null,
    hipAngularVelocity: null,
    shoulderAngularVelocity: null,
    xFactor: null,
    swingScore: null,
    phase: "neutral",
  };
}

/**
 * Populate confidence scores from pose keypoints
 */
function populateConfidenceScores(
  dataPoint: SwingFrameDataV3,
  pose: PoseDetectionResult,
  indices: KeypointIndices
): void {
  dataPoint.leftWristConfidence = pose.keypoints[indices.leftWrist]?.score ?? null;
  dataPoint.rightWristConfidence = pose.keypoints[indices.rightWrist]?.score ?? null;
  dataPoint.leftElbowConfidence = pose.keypoints[indices.leftElbow]?.score ?? null;
  dataPoint.rightElbowConfidence = pose.keypoints[indices.rightElbow]?.score ?? null;
  dataPoint.leftShoulderConfidence = pose.keypoints[indices.leftShoulder]?.score ?? null;
  dataPoint.rightShoulderConfidence = pose.keypoints[indices.rightShoulder]?.score ?? null;
  dataPoint.leftHipConfidence = pose.keypoints[indices.leftHip]?.score ?? null;
  dataPoint.rightHipConfidence = pose.keypoints[indices.rightHip]?.score ?? null;
  dataPoint.leftKneeConfidence = pose.keypoints[indices.leftKnee]?.score ?? null;
  dataPoint.rightKneeConfidence = pose.keypoints[indices.rightKnee]?.score ?? null;
  dataPoint.leftAnkleConfidence = pose.keypoints[indices.leftAnkle]?.score ?? null;
  dataPoint.rightAnkleConfidence = pose.keypoints[indices.rightAnkle]?.score ?? null;
}

/**
 * Calculate torso height from pose
 */
function calculateTorsoHeight(
  pose: PoseDetectionResult,
  indices: KeypointIndices,
  minConfidence: number
): number | null {
  const leftShoulder = pose.keypoints[indices.leftShoulder];
  const rightShoulder = pose.keypoints[indices.rightShoulder];
  const leftHip = pose.keypoints[indices.leftHip];
  const rightHip = pose.keypoints[indices.rightHip];
  
  if (leftShoulder && rightShoulder && leftHip && rightHip &&
      (leftShoulder.score ?? 0) >= minConfidence &&
      (rightShoulder.score ?? 0) >= minConfidence &&
      (leftHip.score ?? 0) >= minConfidence &&
      (rightHip.score ?? 0) >= minConfidence) {
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const torsoHeight = Math.abs(hipMidY - shoulderMidY);
    if (torsoHeight > 20) {
      return torsoHeight;
    }
  }
  return null;
}

/**
 * Calculate hip and shoulder line angles, and X-Factor
 */
function calculateSegmentAngles(
  dataPoint: SwingFrameDataV3,
  pose: PoseDetectionResult,
  indices: KeypointIndices,
  minConfidence: number
): void {
  const leftHipKp = pose.keypoints[indices.leftHip];
  const rightHipKp = pose.keypoints[indices.rightHip];
  const leftShoulderKp = pose.keypoints[indices.leftShoulder];
  const rightShoulderKp = pose.keypoints[indices.rightShoulder];
  
  // Hip line angle
  if (leftHipKp && rightHipKp && 
      (leftHipKp.score ?? 0) >= minConfidence && 
      (rightHipKp.score ?? 0) >= minConfidence) {
    dataPoint.hipLineAngle = Math.atan2(
      rightHipKp.y - leftHipKp.y,
      rightHipKp.x - leftHipKp.x
    ) * (180 / Math.PI);
  }
  
  // Shoulder line angle
  if (leftShoulderKp && rightShoulderKp && 
      (leftShoulderKp.score ?? 0) >= minConfidence && 
      (rightShoulderKp.score ?? 0) >= minConfidence) {
    dataPoint.shoulderLineAngle = Math.atan2(
      rightShoulderKp.y - leftShoulderKp.y,
      rightShoulderKp.x - leftShoulderKp.x
    ) * (180 / Math.PI);
  }
  
  // X-Factor
  if (dataPoint.hipLineAngle !== null && dataPoint.shoulderLineAngle !== null) {
    let xFactor = dataPoint.shoulderLineAngle - dataPoint.hipLineAngle;
    if (xFactor > 180) xFactor -= 360;
    if (xFactor < -180) xFactor += 360;
    dataPoint.xFactor = xFactor;
  }
}

/**
 * Calculate all joint angles (knee, shoulder, elbow, hip)
 */
function calculateAllJointAngles(
  dataPoint: SwingFrameDataV3,
  pose: PoseDetectionResult,
  indices: KeypointIndices,
  minConfidence: number
): void {
  // Knee angles
  dataPoint.rawLeftKneeBend = calculateKneeAngle(
    pose, indices.leftHip, indices.leftKnee, indices.leftAnkle, minConfidence
  );
  dataPoint.rawRightKneeBend = calculateKneeAngle(
    pose, indices.rightHip, indices.rightKnee, indices.rightAnkle, minConfidence
  );
  if (dataPoint.rawLeftKneeBend !== null || dataPoint.rawRightKneeBend !== null) {
    dataPoint.rawMaxKneeBend = Math.min(
      dataPoint.rawLeftKneeBend ?? 180, 
      dataPoint.rawRightKneeBend ?? 180
    );
  }
  
  // Shoulder angles
  dataPoint.rawLeftShoulderAngle = calculateShoulderAngle(
    pose, indices.leftHip, indices.leftShoulder, indices.leftElbow, minConfidence
  );
  dataPoint.rawRightShoulderAngle = calculateShoulderAngle(
    pose, indices.rightHip, indices.rightShoulder, indices.rightElbow, minConfidence
  );
  
  // Elbow angles
  dataPoint.rawLeftElbowAngle = calculateElbowAngle(
    pose, indices.leftShoulder, indices.leftElbow, indices.leftWrist, minConfidence
  );
  dataPoint.rawRightElbowAngle = calculateElbowAngle(
    pose, indices.rightShoulder, indices.rightElbow, indices.rightWrist, minConfidence
  );
  
  // Hip angles
  dataPoint.rawLeftHipAngle = calculateHipAngle(
    pose, indices.leftShoulder, indices.leftHip, indices.leftKnee, minConfidence
  );
  dataPoint.rawRightHipAngle = calculateHipAngle(
    pose, indices.rightShoulder, indices.rightHip, indices.rightKnee, minConfidence
  );
}

/**
 * Calculate all velocity metrics
 */
function calculateAllVelocities(
  dataPoint: SwingFrameDataV3,
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult,
  indices: KeypointIndices,
  config: SwingDetectionConfigV3,
  orientation: { angle: number } | null,
  selectedModel: string,
  videoFPS: number
): void {
  const currCenter = getBodyCenter(pose, indices, config.minConfidence);
  const prevCenter = getBodyCenter(prevPose, indices, config.minConfidence);
  
  if (currCenter && prevCenter) {
    // Wrist velocities
    const leftWristVel = calculateKeypointVelocity(
      pose, prevPose, indices.leftWrist, currCenter, prevCenter, config.minConfidence
    );
    const rightWristVel = calculateKeypointVelocity(
      pose, prevPose, indices.rightWrist, currCenter, prevCenter, config.minConfidence
    );
    
    dataPoint.leftWristVelocity = leftWristVel;
    dataPoint.rightWristVelocity = rightWristVel;
    
    // Combined wrist velocity based on mode
    if (leftWristVel !== null || rightWristVel !== null) {
      switch (config.wristMode) {
        case "both":
          dataPoint.wristVelocity = (leftWristVel ?? 0) + (rightWristVel ?? 0);
          break;
        case "max":
          dataPoint.wristVelocity = Math.max(leftWristVel ?? 0, rightWristVel ?? 0);
          break;
        case "dominant":
          dataPoint.wristVelocity = config.handedness === "right" 
            ? (rightWristVel ?? 0) 
            : (leftWristVel ?? 0);
          break;
        default:
          dataPoint.wristVelocity = (leftWristVel ?? 0) + (rightWristVel ?? 0);
      }
    }
    
    // Other body part velocities
    dataPoint.rawLeftAnkleVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.leftAnkle, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawRightAnkleVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.rightAnkle, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawLeftKneeVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.leftKnee, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawRightKneeVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.rightKnee, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawLeftHipVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.leftHip, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawRightHipVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.rightHip, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawLeftShoulderVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.leftShoulder, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawRightShoulderVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.rightShoulder, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawLeftElbowVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.leftElbow, currCenter, prevCenter, config.minConfidence
    );
    dataPoint.rawRightElbowVelocity = calculateKeypointVelocity(
      pose, prevPose, indices.rightElbow, currCenter, prevCenter, config.minConfidence
    );
    
    // Radial velocity
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
    if (orientDiff > 180) orientDiff -= 360;
    if (orientDiff < -180) orientDiff += 360;
    dataPoint.orientationVelocity = orientDiff;
  }
  
  // Angular velocities
  calculateAngularVelocities(dataPoint, pose, prevPose, indices, config.minConfidence, videoFPS);
}

/**
 * Calculate hip and shoulder angular velocities
 */
function calculateAngularVelocities(
  dataPoint: SwingFrameDataV3,
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult,
  indices: KeypointIndices,
  minConfidence: number,
  videoFPS: number
): void {
  // Hip angular velocity
  const prevLeftHipKp = prevPose.keypoints[indices.leftHip];
  const prevRightHipKp = prevPose.keypoints[indices.rightHip];
  if (dataPoint.hipLineAngle !== null &&
      prevLeftHipKp && prevRightHipKp &&
      (prevLeftHipKp.score ?? 0) >= minConfidence &&
      (prevRightHipKp.score ?? 0) >= minConfidence) {
    const prevHipLineAngle = Math.atan2(
      prevRightHipKp.y - prevLeftHipKp.y,
      prevRightHipKp.x - prevLeftHipKp.x
    ) * (180 / Math.PI);
    
    let hipAngleDiff = dataPoint.hipLineAngle - prevHipLineAngle;
    if (hipAngleDiff > 180) hipAngleDiff -= 360;
    if (hipAngleDiff < -180) hipAngleDiff += 360;
    dataPoint.hipAngularVelocity = hipAngleDiff * videoFPS;
  }
  
  // Shoulder angular velocity
  const prevLeftShoulderKp = prevPose.keypoints[indices.leftShoulder];
  const prevRightShoulderKp = prevPose.keypoints[indices.rightShoulder];
  if (dataPoint.shoulderLineAngle !== null &&
      prevLeftShoulderKp && prevRightShoulderKp &&
      (prevLeftShoulderKp.score ?? 0) >= minConfidence &&
      (prevRightShoulderKp.score ?? 0) >= minConfidence) {
    const prevShoulderLineAngle = Math.atan2(
      prevRightShoulderKp.y - prevLeftShoulderKp.y,
      prevRightShoulderKp.x - prevLeftShoulderKp.x
    ) * (180 / Math.PI);
    
    let shoulderAngleDiff = dataPoint.shoulderLineAngle - prevShoulderLineAngle;
    if (shoulderAngleDiff > 180) shoulderAngleDiff -= 360;
    if (shoulderAngleDiff < -180) shoulderAngleDiff += 360;
    dataPoint.shoulderAngularVelocity = shoulderAngleDiff * videoFPS;
  }
}

/**
 * Calculate raw km/h values for all velocity fields
 */
function calculateRawKmhValues(
  frameData: SwingFrameDataV3[],
  metersPerPixel: number,
  videoFPS: number
): void {
  for (const fd of frameData) {
    if (fd.wristVelocity !== null) {
      fd.rawWristVelocityKmh = convertVelocityToKmh(fd.wristVelocity, metersPerPixel, videoFPS);
    }
    if (fd.leftWristVelocity !== null) {
      fd.rawLeftWristVelocityKmh = convertVelocityToKmh(fd.leftWristVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rightWristVelocity !== null) {
      fd.rawRightWristVelocityKmh = convertVelocityToKmh(fd.rightWristVelocity, metersPerPixel, videoFPS);
    }
    if (fd.leftWristVelocity !== null || fd.rightWristVelocity !== null) {
      const maxVel = Math.max(fd.leftWristVelocity ?? 0, fd.rightWristVelocity ?? 0);
      fd.rawMaxWristVelocityKmh = convertVelocityToKmh(maxVel, metersPerPixel, videoFPS);
    }
    // Ankle
    if (fd.rawLeftAnkleVelocity !== null) {
      fd.rawLeftAnkleVelocityKmh = convertVelocityToKmh(fd.rawLeftAnkleVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rawRightAnkleVelocity !== null) {
      fd.rawRightAnkleVelocityKmh = convertVelocityToKmh(fd.rawRightAnkleVelocity, metersPerPixel, videoFPS);
    }
    // Knee
    if (fd.rawLeftKneeVelocity !== null) {
      fd.rawLeftKneeVelocityKmh = convertVelocityToKmh(fd.rawLeftKneeVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rawRightKneeVelocity !== null) {
      fd.rawRightKneeVelocityKmh = convertVelocityToKmh(fd.rawRightKneeVelocity, metersPerPixel, videoFPS);
    }
    // Hip
    if (fd.rawLeftHipVelocity !== null) {
      fd.rawLeftHipVelocityKmh = convertVelocityToKmh(fd.rawLeftHipVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rawRightHipVelocity !== null) {
      fd.rawRightHipVelocityKmh = convertVelocityToKmh(fd.rawRightHipVelocity, metersPerPixel, videoFPS);
    }
    // Shoulder
    if (fd.rawLeftShoulderVelocity !== null) {
      fd.rawLeftShoulderVelocityKmh = convertVelocityToKmh(fd.rawLeftShoulderVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rawRightShoulderVelocity !== null) {
      fd.rawRightShoulderVelocityKmh = convertVelocityToKmh(fd.rawRightShoulderVelocity, metersPerPixel, videoFPS);
    }
    // Elbow
    if (fd.rawLeftElbowVelocity !== null) {
      fd.rawLeftElbowVelocityKmh = convertVelocityToKmh(fd.rawLeftElbowVelocity, metersPerPixel, videoFPS);
    }
    if (fd.rawRightElbowVelocity !== null) {
      fd.rawRightElbowVelocityKmh = convertVelocityToKmh(fd.rawRightElbowVelocity, metersPerPixel, videoFPS);
    }
  }
}

interface ProcessedDataArrays {
  smoothedCombined: (number | null)[];
  smoothedLeft: (number | null)[];
  smoothedRight: (number | null)[];
  smoothedMax: (number | null)[];
  smoothedScores: (number | null)[];
  smoothedOrientation: (number | null)[];
  smoothedLeftKnee: (number | null)[];
  smoothedRightKnee: (number | null)[];
  smoothedMaxKnee: (number | null)[];
  smoothedLeftShoulder: (number | null)[];
  smoothedRightShoulder: (number | null)[];
  smoothedLeftElbow: (number | null)[];
  smoothedRightElbow: (number | null)[];
  smoothedLeftHipAngle: (number | null)[];
  smoothedRightHipAngle: (number | null)[];
  smoothedLeftAnkleVel: (number | null)[];
  smoothedRightAnkleVel: (number | null)[];
  smoothedLeftKneeVel: (number | null)[];
  smoothedRightKneeVel: (number | null)[];
  smoothedLeftHipVel: (number | null)[];
  smoothedRightHipVel: (number | null)[];
  smoothedLeftShoulderVel: (number | null)[];
  smoothedRightShoulderVel: (number | null)[];
  smoothedLeftElbowVel: (number | null)[];
  smoothedRightElbowVel: (number | null)[];
}

/**
 * Apply drop filling and smoothing to all data streams
 */
function applyDataProcessing(
  frameData: SwingFrameDataV3[],
  smoothingWindow: number
): ProcessedDataArrays {
  // Drop filling
  const dropFilledCombined = fillDrops(frameData.map(d => d.wristVelocity), 0.5);
  const dropFilledLeft = fillDrops(frameData.map(d => d.leftWristVelocity), 0.5);
  const dropFilledRight = fillDrops(frameData.map(d => d.rightWristVelocity), 0.5);
  const dropFilledScores = fillDrops(frameData.map(d => d.swingScore), 0.5);
  const dropFilledOrientation = fillDrops(frameData.map(d => d.bodyOrientation), 0.5);
  const dropFilledLeftKnee = fillDrops(frameData.map(d => d.rawLeftKneeBend), 0.5);
  const dropFilledRightKnee = fillDrops(frameData.map(d => d.rawRightKneeBend), 0.5);
  const dropFilledLeftShoulder = fillDrops(frameData.map(d => d.rawLeftShoulderAngle), 0.5);
  const dropFilledRightShoulder = fillDrops(frameData.map(d => d.rawRightShoulderAngle), 0.5);
  const dropFilledLeftElbow = fillDrops(frameData.map(d => d.rawLeftElbowAngle), 0.5);
  const dropFilledRightElbow = fillDrops(frameData.map(d => d.rawRightElbowAngle), 0.5);
  const dropFilledLeftHipAngle = fillDrops(frameData.map(d => d.rawLeftHipAngle), 0.5);
  const dropFilledRightHipAngle = fillDrops(frameData.map(d => d.rawRightHipAngle), 0.5);
  const dropFilledLeftAnkleVel = fillDrops(frameData.map(d => d.rawLeftAnkleVelocity), 0.5);
  const dropFilledRightAnkleVel = fillDrops(frameData.map(d => d.rawRightAnkleVelocity), 0.5);
  const dropFilledLeftKneeVel = fillDrops(frameData.map(d => d.rawLeftKneeVelocity), 0.5);
  const dropFilledRightKneeVel = fillDrops(frameData.map(d => d.rawRightKneeVelocity), 0.5);
  const dropFilledLeftHipVel = fillDrops(frameData.map(d => d.rawLeftHipVelocity), 0.5);
  const dropFilledRightHipVel = fillDrops(frameData.map(d => d.rawRightHipVelocity), 0.5);
  const dropFilledLeftShoulderVel = fillDrops(frameData.map(d => d.rawLeftShoulderVelocity), 0.5);
  const dropFilledRightShoulderVel = fillDrops(frameData.map(d => d.rawRightShoulderVelocity), 0.5);
  const dropFilledLeftElbowVel = fillDrops(frameData.map(d => d.rawLeftElbowVelocity), 0.5);
  const dropFilledRightElbowVel = fillDrops(frameData.map(d => d.rawRightElbowVelocity), 0.5);
  
  // Calculate max from drop-filled individual wrists
  const dropFilledMax = dropFilledLeft.map((left, i) => {
    const right = dropFilledRight[i];
    if (left === null && right === null) return null;
    return Math.max(left ?? 0, right ?? 0);
  });
  
  // Calculate max knee bend
  const dropFilledMaxKnee = dropFilledLeftKnee.map((left, i) => {
    const right = dropFilledRightKnee[i];
    if (left === null && right === null) return null;
    return Math.min(left ?? 180, right ?? 180);
  });
  
  // Smoothing
  return {
    smoothedCombined: smoothData(dropFilledCombined, smoothingWindow),
    smoothedLeft: smoothData(dropFilledLeft, smoothingWindow),
    smoothedRight: smoothData(dropFilledRight, smoothingWindow),
    smoothedMax: smoothData(dropFilledMax, smoothingWindow),
    smoothedScores: smoothData(dropFilledScores, smoothingWindow),
    smoothedOrientation: smoothData(dropFilledOrientation, smoothingWindow),
    smoothedLeftKnee: smoothData(dropFilledLeftKnee, smoothingWindow),
    smoothedRightKnee: smoothData(dropFilledRightKnee, smoothingWindow),
    smoothedMaxKnee: smoothData(dropFilledMaxKnee, smoothingWindow),
    smoothedLeftShoulder: smoothData(dropFilledLeftShoulder, smoothingWindow),
    smoothedRightShoulder: smoothData(dropFilledRightShoulder, smoothingWindow),
    smoothedLeftElbow: smoothData(dropFilledLeftElbow, smoothingWindow),
    smoothedRightElbow: smoothData(dropFilledRightElbow, smoothingWindow),
    smoothedLeftHipAngle: smoothData(dropFilledLeftHipAngle, smoothingWindow),
    smoothedRightHipAngle: smoothData(dropFilledRightHipAngle, smoothingWindow),
    smoothedLeftAnkleVel: smoothData(dropFilledLeftAnkleVel, smoothingWindow),
    smoothedRightAnkleVel: smoothData(dropFilledRightAnkleVel, smoothingWindow),
    smoothedLeftKneeVel: smoothData(dropFilledLeftKneeVel, smoothingWindow),
    smoothedRightKneeVel: smoothData(dropFilledRightKneeVel, smoothingWindow),
    smoothedLeftHipVel: smoothData(dropFilledLeftHipVel, smoothingWindow),
    smoothedRightHipVel: smoothData(dropFilledRightHipVel, smoothingWindow),
    smoothedLeftShoulderVel: smoothData(dropFilledLeftShoulderVel, smoothingWindow),
    smoothedRightShoulderVel: smoothData(dropFilledRightShoulderVel, smoothingWindow),
    smoothedLeftElbowVel: smoothData(dropFilledLeftElbowVel, smoothingWindow),
    smoothedRightElbowVel: smoothData(dropFilledRightElbowVel, smoothingWindow),
  };
}

/**
 * Update frame data with processed (smoothed) values
 */
function updateFrameDataWithProcessed(
  frameData: SwingFrameDataV3[],
  processed: ProcessedDataArrays,
  metersPerPixel: number,
  videoFPS: number,
  config: SwingDetectionConfigV3
): void {
  for (let i = 0; i < frameData.length; i++) {
    const fd = frameData[i];
    
    // Wrist velocities
    if (processed.smoothedCombined[i] !== null) {
      fd.wristVelocity = processed.smoothedCombined[i];
      fd.wristVelocityKmh = convertVelocityToKmh(processed.smoothedCombined[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedLeft[i] !== null) {
      fd.leftWristVelocity = processed.smoothedLeft[i];
      fd.leftWristVelocityKmh = convertVelocityToKmh(processed.smoothedLeft[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRight[i] !== null) {
      fd.rightWristVelocity = processed.smoothedRight[i];
      fd.rightWristVelocityKmh = convertVelocityToKmh(processed.smoothedRight[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedMax[i] !== null) {
      fd.maxWristVelocityKmh = convertVelocityToKmh(processed.smoothedMax[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedScores[i] !== null) {
      fd.swingScore = processed.smoothedScores[i];
    }
    if (processed.smoothedOrientation[i] !== null) {
      fd.bodyOrientation = processed.smoothedOrientation[i];
    }
    
    // Knee bend
    if (processed.smoothedLeftKnee[i] !== null) fd.leftKneeBend = processed.smoothedLeftKnee[i];
    if (processed.smoothedRightKnee[i] !== null) fd.rightKneeBend = processed.smoothedRightKnee[i];
    if (processed.smoothedMaxKnee[i] !== null) fd.maxKneeBend = processed.smoothedMaxKnee[i];
    
    // Joint angles
    if (processed.smoothedLeftShoulder[i] !== null) fd.leftShoulderAngle = processed.smoothedLeftShoulder[i];
    if (processed.smoothedRightShoulder[i] !== null) fd.rightShoulderAngle = processed.smoothedRightShoulder[i];
    if (processed.smoothedLeftElbow[i] !== null) fd.leftElbowAngle = processed.smoothedLeftElbow[i];
    if (processed.smoothedRightElbow[i] !== null) fd.rightElbowAngle = processed.smoothedRightElbow[i];
    if (processed.smoothedLeftHipAngle[i] !== null) fd.leftHipAngle = processed.smoothedLeftHipAngle[i];
    if (processed.smoothedRightHipAngle[i] !== null) fd.rightHipAngle = processed.smoothedRightHipAngle[i];
    
    // Body part velocities
    if (processed.smoothedLeftAnkleVel[i] !== null) {
      fd.leftAnkleVelocity = processed.smoothedLeftAnkleVel[i];
      fd.leftAnkleVelocityKmh = convertVelocityToKmh(processed.smoothedLeftAnkleVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRightAnkleVel[i] !== null) {
      fd.rightAnkleVelocity = processed.smoothedRightAnkleVel[i];
      fd.rightAnkleVelocityKmh = convertVelocityToKmh(processed.smoothedRightAnkleVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedLeftKneeVel[i] !== null) {
      fd.leftKneeVelocity = processed.smoothedLeftKneeVel[i];
      fd.leftKneeVelocityKmh = convertVelocityToKmh(processed.smoothedLeftKneeVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRightKneeVel[i] !== null) {
      fd.rightKneeVelocity = processed.smoothedRightKneeVel[i];
      fd.rightKneeVelocityKmh = convertVelocityToKmh(processed.smoothedRightKneeVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedLeftHipVel[i] !== null) {
      fd.leftHipVelocity = processed.smoothedLeftHipVel[i];
      fd.leftHipVelocityKmh = convertVelocityToKmh(processed.smoothedLeftHipVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRightHipVel[i] !== null) {
      fd.rightHipVelocity = processed.smoothedRightHipVel[i];
      fd.rightHipVelocityKmh = convertVelocityToKmh(processed.smoothedRightHipVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedLeftShoulderVel[i] !== null) {
      fd.leftShoulderVelocity = processed.smoothedLeftShoulderVel[i];
      fd.leftShoulderVelocityKmh = convertVelocityToKmh(processed.smoothedLeftShoulderVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRightShoulderVel[i] !== null) {
      fd.rightShoulderVelocity = processed.smoothedRightShoulderVel[i];
      fd.rightShoulderVelocityKmh = convertVelocityToKmh(processed.smoothedRightShoulderVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedLeftElbowVel[i] !== null) {
      fd.leftElbowVelocity = processed.smoothedLeftElbowVel[i];
      fd.leftElbowVelocityKmh = convertVelocityToKmh(processed.smoothedLeftElbowVel[i]!, metersPerPixel, videoFPS);
    }
    if (processed.smoothedRightElbowVel[i] !== null) {
      fd.rightElbowVelocity = processed.smoothedRightElbowVel[i];
      fd.rightElbowVelocityKmh = convertVelocityToKmh(processed.smoothedRightElbowVel[i]!, metersPerPixel, videoFPS);
    }
  }
}

/**
 * Calculate accelerations from smoothed velocity data
 */
function calculateAccelerations(
  frameData: SwingFrameDataV3[],
  processed: ProcessedDataArrays,
  metersPerPixel: number,
  videoFPS: number
): void {
  const dt = 1 / videoFPS;
  
  for (let i = 1; i < frameData.length - 1; i++) {
    const fd = frameData[i];
    const prev = frameData[i - 1];
    
    // Helper to calculate acceleration
    const calcAccel = (prevV: number | null, nextSmoothed: number | null): number | null => {
      if (prevV === null || nextSmoothed === null) return null;
      const nextV = convertVelocityToKmh(nextSmoothed, metersPerPixel, videoFPS);
      return (nextV - prevV) / (2 * dt);
    };
    
    // Helper to get max acceleration
    const maxAccel = (left: number | null, right: number | null): number | null => {
      if (left === null && right === null) return null;
      const leftAbs = Math.abs(left ?? 0);
      const rightAbs = Math.abs(right ?? 0);
      return leftAbs >= rightAbs ? left : right;
    };
    
    // Wrist acceleration
    fd.leftWristAcceleration = calcAccel(prev.leftWristVelocityKmh, processed.smoothedLeft[i + 1]);
    fd.rightWristAcceleration = calcAccel(prev.rightWristVelocityKmh, processed.smoothedRight[i + 1]);
    fd.maxWristAcceleration = maxAccel(fd.leftWristAcceleration, fd.rightWristAcceleration);
    
    // Ankle acceleration
    fd.leftAnkleAcceleration = calcAccel(prev.leftAnkleVelocityKmh, processed.smoothedLeftAnkleVel[i + 1]);
    fd.rightAnkleAcceleration = calcAccel(prev.rightAnkleVelocityKmh, processed.smoothedRightAnkleVel[i + 1]);
    fd.maxAnkleAcceleration = maxAccel(fd.leftAnkleAcceleration, fd.rightAnkleAcceleration);
    
    // Knee acceleration
    fd.leftKneeAcceleration = calcAccel(prev.leftKneeVelocityKmh, processed.smoothedLeftKneeVel[i + 1]);
    fd.rightKneeAcceleration = calcAccel(prev.rightKneeVelocityKmh, processed.smoothedRightKneeVel[i + 1]);
    fd.maxKneeAcceleration = maxAccel(fd.leftKneeAcceleration, fd.rightKneeAcceleration);
    
    // Hip acceleration
    fd.leftHipAcceleration = calcAccel(prev.leftHipVelocityKmh, processed.smoothedLeftHipVel[i + 1]);
    fd.rightHipAcceleration = calcAccel(prev.rightHipVelocityKmh, processed.smoothedRightHipVel[i + 1]);
    fd.maxHipAcceleration = maxAccel(fd.leftHipAcceleration, fd.rightHipAcceleration);
    
    // Shoulder acceleration
    fd.leftShoulderAcceleration = calcAccel(prev.leftShoulderVelocityKmh, processed.smoothedLeftShoulderVel[i + 1]);
    fd.rightShoulderAcceleration = calcAccel(prev.rightShoulderVelocityKmh, processed.smoothedRightShoulderVel[i + 1]);
    fd.maxShoulderAcceleration = maxAccel(fd.leftShoulderAcceleration, fd.rightShoulderAcceleration);
    
    // Elbow acceleration
    fd.leftElbowAcceleration = calcAccel(prev.leftElbowVelocityKmh, processed.smoothedLeftElbowVel[i + 1]);
    fd.rightElbowAcceleration = calcAccel(prev.rightElbowVelocityKmh, processed.smoothedRightElbowVel[i + 1]);
    fd.maxElbowAcceleration = maxAccel(fd.leftElbowAcceleration, fd.rightElbowAcceleration);
  }
}

/**
 * Detect swings and build swing objects
 */
function detectAndBuildSwings(
  frameData: SwingFrameDataV3[],
  config: SwingDetectionConfigV3,
  videoFPS: number,
  totalFrames: number,
  metersPerPixel: number,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices,
  frames: number[]
): DetectedSwingV3[] {
  // Calculate adaptive threshold
  const validScores = frameData
    .map(d => d.swingScore)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);
  
  const percentileIdx = Math.floor(validScores.length * config.velocityPercentile / 100);
  const adaptiveThreshold = validScores[percentileIdx] ?? config.minVelocityThreshold;
  const threshold = Math.max(adaptiveThreshold, config.minVelocityThreshold);
  
  // Find peaks
  const minDistanceFrames = Math.floor(config.minTimeBetweenSwings * videoFPS);
  const peakFrameIndices = findPeaks(
    frameData.map(d => d.swingScore),
    threshold,
    minDistanceFrames
  );
  
  // Build swing objects
  const swings: DetectedSwingV3[] = [];
  const orientationVelocities = frameData.map(d => d.orientationVelocity);
  let previousSwingFollowEndIdx = 0;
  
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
    const phases = detectPhases(frameData, peakIdx, config, previousSwingFollowEndIdx);
    
    // Calculate rotation metrics
    const { rotationRange, peakRotationVel } = calculateRotationMetrics(frameData, phases);
    
    // Classify swing type
    const swingType = config.classifySwingType
      ? classifySwingType(
          orientationVelocities, peakIdx, 10, config.handedness, frameData, config.minConfidence,
          preprocessedPoses, selectedPoseIndex, indices
        )
      : "unknown";
    
    // Determine dominant side
    const dominantSide = determineDominantSide(peakData);
    
    // Calculate velocity in km/h
    const velocityKmh = convertVelocityToKmh(peakData.wristVelocity ?? 0, metersPerPixel, videoFPS);
    if (velocityKmh < config.minVelocityKmh) continue;
    
    // Calculate clip boundaries
    const clipBounds = calculateClipBoundaries(
      frameData, phases, peakData, config, videoFPS, totalFrames
    );
    
    // Find key positions (loading peak for groundstrokes, trophy/contact for serves)
    const keyPositions = findKeyPositions(
      swingType, phases, peakIdx, peakData, frameData, config,
      clipBounds, preprocessedPoses, selectedPoseIndex, indices, frames, videoFPS
    );
    
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
      followEnd: clipBounds.followEndFrame,
      ...keyPositions,
      ...clipBounds,
      swingScore: peakData.swingScore!,
    });
    
    previousSwingFollowEndIdx = phases.followEnd;
  }
  
  // Merge overlapping swings
  return mergeOverlappingSwings(swings);
}

/**
 * Calculate rotation metrics for a swing
 */
function calculateRotationMetrics(
  frameData: SwingFrameDataV3[],
  phases: { loadingStart: number; followEnd: number }
): { rotationRange: number; peakRotationVel: number } {
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
  
  return {
    rotationRange: maxOrientation !== -Infinity ? maxOrientation - minOrientation : 0,
    peakRotationVel,
  };
}

/**
 * Determine dominant side based on wrist velocities
 */
function determineDominantSide(peakData: SwingFrameDataV3): "left" | "right" | "both" {
  const leftVel = peakData.leftWristVelocity ?? 0;
  const rightVel = peakData.rightWristVelocity ?? 0;
  const symmetry = Math.min(leftVel, rightVel) / Math.max(leftVel, rightVel, 0.001);
  if (symmetry < 0.5) {
    return leftVel > rightVel ? "left" : "right";
  }
  return "both";
}

/**
 * Calculate clip boundaries for a swing
 */
function calculateClipBoundaries(
  frameData: SwingFrameDataV3[],
  phases: { followEnd: number },
  peakData: SwingFrameDataV3,
  config: SwingDetectionConfigV3,
  videoFPS: number,
  totalFrames: number
): {
  followEndFrame: number;
  clipStartTime: number;
  clipEndTime: number;
  clipStartFrame: number;
  clipEndFrame: number;
  clipDuration: number;
} {
  const followEndFrame = frameData[phases.followEnd]?.frame ?? peakData.frame;
  const followEndTime = followEndFrame / videoFPS;
  const videoDuration = totalFrames / videoFPS;
  
  const clipStartTime = Math.max(0, followEndTime - config.clipLeadTime);
  const clipStartFrame = Math.floor(clipStartTime * videoFPS);
  const clipEndTime = Math.min(videoDuration, followEndTime + config.clipTrailTime);
  const clipEndFrame = Math.floor(clipEndTime * videoFPS);
  const clipDuration = clipEndTime - clipStartTime;
  
  return { followEndFrame, clipStartTime, clipEndTime, clipStartFrame, clipEndFrame, clipDuration };
}

/**
 * Find key positions for a swing (loading peak for groundstrokes, trophy/contact for serves)
 */
function findKeyPositions(
  swingType: string,
  phases: { loadingStart: number },
  peakIdx: number,
  peakData: SwingFrameDataV3,
  frameData: SwingFrameDataV3[],
  config: SwingDetectionConfigV3,
  clipBounds: { clipStartFrame: number; clipEndFrame: number },
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices,
  frames: number[],
  videoFPS: number
): {
  loadingPeakFrame: number | null;
  loadingPeakTimestamp: number | null;
  loadingPeakOrientation: number | null;
  trophyFrame: number | null;
  trophyTimestamp: number | null;
  trophyArmHeight: number | null;
  contactPointFrame: number | null;
  contactPointTimestamp: number | null;
  contactPointHeight: number | null;
  landingFrame: number | null;
  landingTimestamp: number | null;
} {
  let loadingPeakFrame: number | null = null;
  let loadingPeakTimestamp: number | null = null;
  let loadingPeakOrientation: number | null = null;
  let trophyFrame: number | null = null;
  let trophyTimestamp: number | null = null;
  let trophyArmHeight: number | null = null;
  let contactPointFrame: number | null = null;
  let contactPointTimestamp: number | null = null;
  let contactPointHeight: number | null = null;
  let landingFrame: number | null = null;
  let landingTimestamp: number | null = null;
  
  if (swingType === "serve") {
    // Find serve key positions
    const servePositions = findServeKeyPositions(
      clipBounds, config, preprocessedPoses, selectedPoseIndex, indices, frames, frameData, videoFPS
    );
    trophyFrame = servePositions.trophyFrame;
    trophyTimestamp = servePositions.trophyTimestamp;
    trophyArmHeight = servePositions.trophyArmHeight;
    contactPointFrame = servePositions.contactPointFrame;
    contactPointTimestamp = servePositions.contactPointTimestamp;
    contactPointHeight = servePositions.contactPointHeight;
    landingFrame = servePositions.landingFrame;
    landingTimestamp = servePositions.landingTimestamp;
  } else {
    // Find loading peak for groundstrokes
    const contactOrientation = peakData.bodyOrientation ?? 0;
    let maxOrientationDiff = 0;
    
    for (let i = phases.loadingStart; i < peakIdx; i++) {
      const fd = frameData[i];
      if (!fd || fd.bodyOrientation === null) continue;
      
      let orientDiff = fd.bodyOrientation - contactOrientation;
      if (orientDiff > 180) orientDiff -= 360;
      if (orientDiff < -180) orientDiff += 360;
      
      const absDiff = Math.abs(orientDiff);
      if (absDiff > maxOrientationDiff) {
        maxOrientationDiff = absDiff;
        loadingPeakFrame = fd.frame;
        loadingPeakTimestamp = fd.timestamp;
        loadingPeakOrientation = fd.bodyOrientation;
      }
    }
  }
  
  return {
    loadingPeakFrame,
    loadingPeakTimestamp,
    loadingPeakOrientation,
    trophyFrame,
    trophyTimestamp,
    trophyArmHeight,
    contactPointFrame,
    contactPointTimestamp,
    contactPointHeight,
    landingFrame,
    landingTimestamp,
  };
}

/**
 * Find key positions specific to serve swings
 */
function findServeKeyPositions(
  clipBounds: { clipStartFrame: number; clipEndFrame: number },
  config: SwingDetectionConfigV3,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices,
  frames: number[],
  frameData: SwingFrameDataV3[],
  videoFPS: number
): {
  trophyFrame: number | null;
  trophyTimestamp: number | null;
  trophyArmHeight: number | null;
  contactPointFrame: number | null;
  contactPointTimestamp: number | null;
  contactPointHeight: number | null;
  landingFrame: number | null;
  landingTimestamp: number | null;
} {
  let maxWristHeight = -Infinity;
  let lowestAnkleY = -Infinity;
  let contactPointFrame: number | null = null;
  let contactPointTimestamp: number | null = null;
  let contactPointHeight: number | null = null;
  let trophyFrame: number | null = null;
  let trophyTimestamp: number | null = null;
  let trophyArmHeight: number | null = null;
  let landingFrame: number | null = null;
  let landingTimestamp: number | null = null;
  
  const shoulderIdx = config.handedness === "right" ? indices.rightShoulder : indices.leftShoulder;
  const wristIdx = config.handedness === "right" ? indices.rightWrist : indices.leftWrist;
  const hipIdx = config.handedness === "right" ? indices.rightHip : indices.leftHip;
  const frontAnkleIdx = config.handedness === "right" ? indices.leftAnkle : indices.rightAnkle;
  
  // Find contact point (highest wrist)
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame < clipBounds.clipStartFrame || frame > clipBounds.clipEndFrame) continue;
    
    const poses = preprocessedPoses.get(frame);
    const pose = poses?.[selectedPoseIndex];
    if (!pose) continue;
    
    const keypoints = pose.keypoints;
    const shoulder = keypoints[shoulderIdx];
    const wrist = keypoints[wristIdx];
    const hip = keypoints[hipIdx];
    
    if (!shoulder || !wrist || !hip) continue;
    if ((shoulder.score ?? 0) < config.minConfidence) continue;
    if ((wrist.score ?? 0) < config.minConfidence) continue;
    if ((hip.score ?? 0) < config.minConfidence) continue;
    
    const torsoHeight = Math.abs(hip.y - shoulder.y);
    if (torsoHeight < 10) continue;
    
    const heightAboveShoulder = shoulder.y - wrist.y;
    const heightRatio = heightAboveShoulder / torsoHeight;
    
    if (heightRatio > maxWristHeight) {
      maxWristHeight = heightRatio;
      contactPointFrame = frame;
      contactPointTimestamp = frameData[i]?.timestamp ?? frame / videoFPS;
      contactPointHeight = heightRatio;
    }
  }
  
  // Find trophy position (fixed offset before contact)
  if (contactPointTimestamp !== null && contactPointFrame !== null) {
    const trophyTargetTime = contactPointTimestamp - TROPHY_OFFSET_SECONDS;
    let closestDiff = Infinity;
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame >= contactPointFrame) continue;
      
      const fd = frameData[i];
      if (!fd) continue;
      
      const timeDiff = Math.abs(fd.timestamp - trophyTargetTime);
      if (timeDiff < closestDiff) {
        closestDiff = timeDiff;
        trophyFrame = fd.frame;
        trophyTimestamp = fd.timestamp;
        
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        if (pose) {
          const keypoints = pose.keypoints;
          const shoulder = keypoints[shoulderIdx];
          const wrist = keypoints[wristIdx];
          const hip = keypoints[hipIdx];
          if (shoulder && wrist && hip) {
            const torsoHeight = Math.abs(hip.y - shoulder.y);
            if (torsoHeight > 10) {
              trophyArmHeight = (shoulder.y - wrist.y) / torsoHeight;
            }
          }
        }
      }
    }
  }
  
  // Find landing (lowest front ankle after contact)
  const searchStart = contactPointFrame ?? clipBounds.clipStartFrame + (clipBounds.clipEndFrame - clipBounds.clipStartFrame) / 2;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame < searchStart || frame > clipBounds.clipEndFrame) continue;
    
    const poses = preprocessedPoses.get(frame);
    const pose = poses?.[selectedPoseIndex];
    if (!pose) continue;
    
    const frontAnkle = pose.keypoints[frontAnkleIdx];
    if (!frontAnkle || (frontAnkle.score ?? 0) < config.minConfidence) continue;
    
    if (frontAnkle.y > lowestAnkleY) {
      lowestAnkleY = frontAnkle.y;
      landingFrame = frame;
      landingTimestamp = frameData[i]?.timestamp ?? frame / videoFPS;
    }
  }
  
  return {
    trophyFrame,
    trophyTimestamp,
    trophyArmHeight,
    contactPointFrame,
    contactPointTimestamp,
    contactPointHeight,
    landingFrame,
    landingTimestamp,
  };
}

/**
 * Merge overlapping swings
 */
function mergeOverlappingSwings(swings: DetectedSwingV3[]): DetectedSwingV3[] {
  const mergedSwings: DetectedSwingV3[] = [];
  
  for (const swing of swings) {
    let shouldMerge = false;
    let mergeTargetIdx = -1;
    
    for (let i = 0; i < mergedSwings.length; i++) {
      const existing = mergedSwings[i];
      
      const overlapStart = Math.max(swing.clipStartFrame, existing.clipStartFrame);
      const overlapEnd = Math.min(swing.clipEndFrame, existing.clipEndFrame);
      const overlapFrames = Math.max(0, overlapEnd - overlapStart);
      
      const swingDuration = swing.clipEndFrame - swing.clipStartFrame;
      const existingDuration = existing.clipEndFrame - existing.clipStartFrame;
      
      const swingCoverage = swingDuration > 0 ? overlapFrames / swingDuration : 0;
      const existingCoverage = existingDuration > 0 ? overlapFrames / existingDuration : 0;
      
      if (swingCoverage >= OVERLAP_THRESHOLD || existingCoverage >= OVERLAP_THRESHOLD) {
        shouldMerge = true;
        mergeTargetIdx = i;
        break;
      }
    }
    
    if (shouldMerge && mergeTargetIdx >= 0) {
      const existing = mergedSwings[mergeTargetIdx];
      if (swing.swingScore > existing.swingScore) {
        mergedSwings[mergeTargetIdx] = {
          ...swing,
          clipStartFrame: Math.min(swing.clipStartFrame, existing.clipStartFrame),
          clipEndFrame: Math.max(swing.clipEndFrame, existing.clipEndFrame),
          clipStartTime: Math.min(swing.clipStartTime, existing.clipStartTime),
          clipEndTime: Math.max(swing.clipEndTime, existing.clipEndTime),
          clipDuration: Math.max(swing.clipEndTime, existing.clipEndTime) - Math.min(swing.clipStartTime, existing.clipStartTime),
          loadingStart: Math.min(swing.loadingStart, existing.loadingStart),
          followEnd: Math.max(swing.followEnd, existing.followEnd),
        };
      } else {
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
  
  return mergedSwings;
}

/**
 * Mark phases in frame data based on detected swings
 */
function markPhasesInFrameData(frameData: SwingFrameDataV3[], swings: DetectedSwingV3[]): void {
  for (const swing of swings) {
    for (const fd of frameData) {
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
}



