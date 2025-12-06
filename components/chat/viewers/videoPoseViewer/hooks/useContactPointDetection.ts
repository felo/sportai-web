import { useState, useCallback } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";

interface FrameSignals {
  frame: number;
  timestamp: number;
  // Arm tip signals (wrist or elbow, whichever is higher)
  armTipY: number; // Raw Y position of arm tip
  armTipHeight: number; // Normalized 0-1, 1 = highest (lowest Y)
  armTipVelocity: number;
  armTipAcceleration: number;
  usedElbowAsTip: boolean; // True if elbow was higher than wrist
  // Arm extension signals
  armExtensionAngle: number; // Shoulder-elbow-wrist angle (180 = fully extended)
  armExtensionScore: number; // Normalized 0-1
  // Body extension
  shoulderHeight: number; // Normalized 0-1
  hipHeight: number; // Normalized 0-1
  bodyExtensionScore: number; // Combined shoulder + hip height
  // Combined score
  contactScore: number;
}

export interface ContactPointDetectionResult {
  contactFrame: number;
  contactTimestamp: number;
  peakVelocityFrame: number;
  peakVelocity: number;
  confidence: number;
  dominantHand: "left" | "right";
  analysisData: {
    signals: FrameSignals[];
    handednessConfidence: number;
  };
}

interface UseContactPointDetectionProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

/**
 * Hook to detect the contact point in a tennis/padel serve
 * 
 * Contact point characteristics:
 * 1. Racket wrist at maximum height (highest reach)
 * 2. Arm fully extended (shoulder-elbow-wrist ~180°)
 * 3. Peak upward velocity just passed (deceleration phase)
 * 4. Body fully extended (shoulders and hips at peak height)
 * 5. Occurs AFTER trophy position and peak swing acceleration
 */
export function useContactPointDetection({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseContactPointDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ContactPointDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get keypoint indices based on model
  const getKeypointIndices = useCallback(() => {
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
      };
    }
    // MoveNet
    return {
      leftWrist: 9,
      rightWrist: 10,
      leftElbow: 7,
      rightElbow: 8,
      leftShoulder: 5,
      rightShoulder: 6,
      leftHip: 11,
      rightHip: 12,
    };
  }, [selectedModel]);

  // Calculate angle between three points (in degrees)
  const calculateAngle = useCallback((
    p1: { x: number; y: number },
    p2: { x: number; y: number }, // vertex
    p3: { x: number; y: number }
  ): number => {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }, []);

  // Detect which hand is dominant (racket hand) based on motion analysis
  const detectHandedness = useCallback((): { 
    dominant: "left" | "right"; 
    confidence: number;
  } => {
    const indices = getKeypointIndices();
    const sortedFrames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    let leftTotalMotion = 0;
    let rightTotalMotion = 0;
    let lastLeftWrist: { x: number; y: number } | null = null;
    let lastRightWrist: { x: number; y: number } | null = null;
    
    for (const frame of sortedFrames) {
      const poses = preprocessedPoses.get(frame);
      if (!poses || poses.length <= selectedPoseIndex) continue;
      
      const pose = poses[selectedPoseIndex];
      const leftWrist = pose.keypoints[indices.leftWrist];
      const rightWrist = pose.keypoints[indices.rightWrist];
      
      if (leftWrist && (leftWrist.score ?? 0) > 0.3) {
        if (lastLeftWrist) {
          const dx = leftWrist.x - lastLeftWrist.x;
          const dy = leftWrist.y - lastLeftWrist.y;
          leftTotalMotion += Math.sqrt(dx * dx + dy * dy);
        }
        lastLeftWrist = { x: leftWrist.x, y: leftWrist.y };
      }
      
      if (rightWrist && (rightWrist.score ?? 0) > 0.3) {
        if (lastRightWrist) {
          const dx = rightWrist.x - lastRightWrist.x;
          const dy = rightWrist.y - lastRightWrist.y;
          rightTotalMotion += Math.sqrt(dx * dx + dy * dy);
        }
        lastRightWrist = { x: rightWrist.x, y: rightWrist.y };
      }
    }
    
    const total = leftTotalMotion + rightTotalMotion;
    const rightRatio = total > 0 ? rightTotalMotion / total : 0.5;
    const confidence = Math.abs(rightRatio - 0.5) * 2;
    
    detectionLogger.debug(`🎯 Contact detection - Handedness: Left=${leftTotalMotion.toFixed(0)}px, Right=${rightTotalMotion.toFixed(0)}px`);
    
    return {
      dominant: rightTotalMotion > leftTotalMotion ? "right" : "left",
      confidence,
    };
  }, [preprocessedPoses, selectedPoseIndex, getKeypointIndices]);

  // Extract all signals for each frame
  const extractFrameSignals = useCallback((
    dominantHand: "left" | "right"
  ): FrameSignals[] => {
    const indices = getKeypointIndices();
    const sortedFrames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    const racketWristIdx = dominantHand === "right" ? indices.rightWrist : indices.leftWrist;
    const racketElbowIdx = dominantHand === "right" ? indices.rightElbow : indices.leftElbow;
    const racketShoulderIdx = dominantHand === "right" ? indices.rightShoulder : indices.leftShoulder;
    
    // First pass: collect raw data
    const rawData: Array<{
      frame: number;
      timestamp: number;
      racketWrist: { x: number; y: number } | null;
      racketElbow: { x: number; y: number } | null;
      racketShoulder: { x: number; y: number } | null;
      leftShoulder: { x: number; y: number } | null;
      rightShoulder: { x: number; y: number } | null;
      leftHip: { x: number; y: number } | null;
      rightHip: { x: number; y: number } | null;
    }> = [];
    
    for (const frame of sortedFrames) {
      const poses = preprocessedPoses.get(frame);
      if (!poses || poses.length <= selectedPoseIndex) continue;
      
      const pose = poses[selectedPoseIndex];
      const kp = pose.keypoints;
      
      // Racket arm keypoints
      const racketWrist = kp[racketWristIdx];
      const racketElbow = kp[racketElbowIdx];
      const racketShoulder = kp[racketShoulderIdx];
      
      // Body keypoints
      const leftShoulder = kp[indices.leftShoulder];
      const rightShoulder = kp[indices.rightShoulder];
      const leftHip = kp[indices.leftHip];
      const rightHip = kp[indices.rightHip];
      
      rawData.push({
        frame,
        timestamp: frame / videoFPS,
        racketWrist: racketWrist && (racketWrist.score ?? 0) > 0.3 
          ? { x: racketWrist.x, y: racketWrist.y } : null,
        racketElbow: racketElbow && (racketElbow.score ?? 0) > 0.3 
          ? { x: racketElbow.x, y: racketElbow.y } : null,
        racketShoulder: racketShoulder && (racketShoulder.score ?? 0) > 0.3 
          ? { x: racketShoulder.x, y: racketShoulder.y } : null,
        leftShoulder: leftShoulder && (leftShoulder.score ?? 0) > 0.3 
          ? { x: leftShoulder.x, y: leftShoulder.y } : null,
        rightShoulder: rightShoulder && (rightShoulder.score ?? 0) > 0.3 
          ? { x: rightShoulder.x, y: rightShoulder.y } : null,
        leftHip: leftHip && (leftHip.score ?? 0) > 0.3 
          ? { x: leftHip.x, y: leftHip.y } : null,
        rightHip: rightHip && (rightHip.score ?? 0) > 0.3 
          ? { x: rightHip.x, y: rightHip.y } : null,
      });
    }
    
    if (rawData.length < 10) return [];
    
    // Helper function to get the "arm tip" - wrist or elbow, whichever is higher
    // Returns { point, usedElbow } where point is the highest point
    const getArmTip = (wrist: { x: number; y: number } | null, elbow: { x: number; y: number } | null): 
      { point: { x: number; y: number } | null; usedElbow: boolean } => {
      if (!wrist && !elbow) return { point: null, usedElbow: false };
      if (!wrist) return { point: elbow, usedElbow: true };
      if (!elbow) return { point: wrist, usedElbow: false };
      
      // Lower Y = higher in image. If elbow.y < wrist.y, elbow is higher
      if (elbow.y < wrist.y) {
        return { point: elbow, usedElbow: true };
      }
      return { point: wrist, usedElbow: false };
    };
    
    // Find min/max for normalization using arm tip (wrist or elbow)
    let minArmTipY = Infinity, maxArmTipY = -Infinity;
    let minShoulderY = Infinity, maxShoulderY = -Infinity;
    let minHipY = Infinity, maxHipY = -Infinity;
    let elbowFallbackCount = 0;
    
    for (const d of rawData) {
      const armTip = getArmTip(d.racketWrist, d.racketElbow);
      if (armTip.point) {
        minArmTipY = Math.min(minArmTipY, armTip.point.y);
        maxArmTipY = Math.max(maxArmTipY, armTip.point.y);
        if (armTip.usedElbow) elbowFallbackCount++;
      }
      // Average shoulder Y
      if (d.leftShoulder && d.rightShoulder) {
        const avgShoulderY = (d.leftShoulder.y + d.rightShoulder.y) / 2;
        minShoulderY = Math.min(minShoulderY, avgShoulderY);
        maxShoulderY = Math.max(maxShoulderY, avgShoulderY);
      }
      // Average hip Y
      if (d.leftHip && d.rightHip) {
        const avgHipY = (d.leftHip.y + d.rightHip.y) / 2;
        minHipY = Math.min(minHipY, avgHipY);
        maxHipY = Math.max(maxHipY, avgHipY);
      }
    }
    
    if (elbowFallbackCount > 0) {
      detectionLogger.debug(`🎯 Using elbow as arm tip fallback in ${elbowFallbackCount}/${rawData.length} frames (wrist tracking lost or arm fully extended)`);
    }
    
    // Calculate velocities and accelerations using arm tip
    const signals: FrameSignals[] = [];
    
    for (let i = 2; i < rawData.length; i++) {
      const prev2 = rawData[i - 2];
      const prev = rawData[i - 1];
      const curr = rawData[i];
      
      // Get arm tip for current and previous frames
      const currArmTip = getArmTip(curr.racketWrist, curr.racketElbow);
      const prevArmTip = getArmTip(prev.racketWrist, prev.racketElbow);
      const prev2ArmTip = getArmTip(prev2.racketWrist, prev2.racketElbow);
      
      // Arm tip height (normalized, 1 = highest = lowest Y)
      let armTipY = 0;
      let armTipHeight = 0;
      if (currArmTip.point && maxArmTipY > minArmTipY) {
        armTipY = currArmTip.point.y;
        // Invert because lower Y = higher in image
        armTipHeight = 1 - (currArmTip.point.y - minArmTipY) / (maxArmTipY - minArmTipY);
      }
      
      // Calculate velocity and acceleration using arm tip
      let velocity = 0;
      let acceleration = 0;
      
      if (prevArmTip.point && currArmTip.point) {
        const dx = currArmTip.point.x - prevArmTip.point.x;
        const dy = currArmTip.point.y - prevArmTip.point.y;
        const dt = curr.timestamp - prev.timestamp;
        velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;
      }
      
      if (prev2ArmTip.point && prevArmTip.point && currArmTip.point) {
        const dx1 = prevArmTip.point.x - prev2ArmTip.point.x;
        const dy1 = prevArmTip.point.y - prev2ArmTip.point.y;
        const dt1 = prev.timestamp - prev2.timestamp;
        const v1 = dt1 > 0 ? Math.sqrt(dx1 * dx1 + dy1 * dy1) / dt1 : 0;
        
        const dx2 = currArmTip.point.x - prevArmTip.point.x;
        const dy2 = currArmTip.point.y - prevArmTip.point.y;
        const dt2 = curr.timestamp - prev.timestamp;
        const v2 = dt2 > 0 ? Math.sqrt(dx2 * dx2 + dy2 * dy2) / dt2 : 0;
        
        const dt = (curr.timestamp - prev2.timestamp) / 2;
        acceleration = dt > 0 ? (v2 - v1) / dt : 0;
      }
      
      // Arm extension angle (shoulder-elbow-wrist)
      // 180° = fully extended, lower = more bent
      // If wrist is missing but elbow is higher, assume near-full extension
      let armExtensionAngle = 90; // Default
      if (curr.racketShoulder && curr.racketElbow && curr.racketWrist) {
        armExtensionAngle = calculateAngle(
          curr.racketShoulder,
          curr.racketElbow,
          curr.racketWrist
        );
      } else if (currArmTip.usedElbow && curr.racketShoulder && curr.racketElbow) {
        // If using elbow because wrist is higher/missing, assume arm is extended
        // Use shoulder-elbow line angle to estimate extension (near vertical = extended)
        const shoulderToElbowAngle = Math.atan2(
          curr.racketElbow.y - curr.racketShoulder.y,
          curr.racketElbow.x - curr.racketShoulder.x
        ) * (180 / Math.PI);
        // Near -90° (pointing up) = fully extended, assume 160-170°
        const verticalness = Math.abs(Math.abs(shoulderToElbowAngle) - 90);
        if (verticalness < 30) {
          armExtensionAngle = 160 + (30 - verticalness); // 160-190° based on how vertical
        }
      }
      // Normalize: 180 = 1, 90 = 0
      const armExtensionScore = Math.max(0, Math.min(1, (armExtensionAngle - 90) / 90));
      
      // Shoulder height (body extension)
      let shoulderHeight = 0;
      if (curr.leftShoulder && curr.rightShoulder && maxShoulderY > minShoulderY) {
        const avgY = (curr.leftShoulder.y + curr.rightShoulder.y) / 2;
        shoulderHeight = 1 - (avgY - minShoulderY) / (maxShoulderY - minShoulderY);
      }
      
      // Hip height (body extension)
      let hipHeight = 0;
      if (curr.leftHip && curr.rightHip && maxHipY > minHipY) {
        const avgY = (curr.leftHip.y + curr.rightHip.y) / 2;
        hipHeight = 1 - (avgY - minHipY) / (maxHipY - minHipY);
      }
      
      // Combined body extension (shoulders weighted more)
      const bodyExtensionScore = (shoulderHeight * 0.6) + (hipHeight * 0.4);
      
      signals.push({
        frame: curr.frame,
        timestamp: curr.timestamp,
        armTipY,
        armTipHeight,
        armTipVelocity: velocity,
        armTipAcceleration: acceleration,
        usedElbowAsTip: currArmTip.usedElbow,
        armExtensionAngle,
        armExtensionScore,
        shoulderHeight,
        hipHeight,
        bodyExtensionScore,
        contactScore: 0, // Will be calculated later
      });
    }
    
    return signals;
  }, [preprocessedPoses, selectedPoseIndex, getKeypointIndices, videoFPS, calculateAngle]);

  // Smooth signals using moving average
  const smoothSignals = useCallback((
    signals: FrameSignals[],
    windowSize: number = 5
  ): FrameSignals[] => {
    if (signals.length < windowSize) return signals;
    
    const smoothed: FrameSignals[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < signals.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(signals.length - 1, i + halfWindow);
      let count = 0;
      
      let sumHeight = 0, sumVel = 0, sumAcc = 0, sumArm = 0, sumBody = 0;
      
      for (let j = start; j <= end; j++) {
        sumHeight += signals[j].armTipHeight;
        sumVel += signals[j].armTipVelocity;
        sumAcc += signals[j].armTipAcceleration;
        sumArm += signals[j].armExtensionScore;
        sumBody += signals[j].bodyExtensionScore;
        count++;
      }
      
      smoothed.push({
        ...signals[i],
        armTipHeight: sumHeight / count,
        armTipVelocity: sumVel / count,
        armTipAcceleration: sumAcc / count,
        armExtensionScore: sumArm / count,
        bodyExtensionScore: sumBody / count,
      });
    }
    
    return smoothed;
  }, []);

  // Find contact point using combined signals
  const findContactPoint = useCallback((
    signals: FrameSignals[]
  ): { contactIdx: number; peakVelIdx: number; peakVelocity: number } | null => {
    if (signals.length < 10) return null;
    
    // Step 1: Find peak velocity (the maximum swing speed)
    let peakVelIdx = 0;
    let peakVelocity = signals[0].armTipVelocity;
    
    for (let i = 1; i < signals.length; i++) {
      if (signals[i].armTipVelocity > peakVelocity) {
        peakVelocity = signals[i].armTipVelocity;
        peakVelIdx = i;
      }
    }
    
    // Peak velocity should be in the middle-to-later part of the motion
    if (peakVelIdx < signals.length * 0.2) {
      detectionLogger.warn("⚠️ Peak velocity found very early, might not be a serve");
    }
    
    // Step 2: Find peak arm tip height in the region around/after peak velocity
    // Contact happens at or near the highest arm tip position
    const searchStart = Math.max(0, Math.floor(peakVelIdx * 0.7)); // Start a bit before peak velocity
    const searchEnd = Math.min(signals.length - 1, Math.floor(peakVelIdx * 1.3 + 5)); // Extend past peak
    
    // Find ranges for normalization within search window
    let maxArmTipHeight = 0;
    let maxArmExt = 0;
    let maxBodyExt = 0;
    
    for (let i = searchStart; i <= searchEnd; i++) {
      maxArmTipHeight = Math.max(maxArmTipHeight, signals[i].armTipHeight);
      maxArmExt = Math.max(maxArmExt, signals[i].armExtensionScore);
      maxBodyExt = Math.max(maxBodyExt, signals[i].bodyExtensionScore);
    }
    
    // Step 3: Score each frame in the search window
    let bestContactIdx = peakVelIdx;
    let bestContactScore = -Infinity;
    
    for (let i = searchStart; i <= searchEnd; i++) {
      const s = signals[i];
      
      // Arm tip height score (higher = better, this is the most important)
      const armTipHeightScore = maxArmTipHeight > 0 ? s.armTipHeight / maxArmTipHeight : 0.5;
      
      // Arm extension score (fully extended = better)
      const armScore = maxArmExt > 0 ? s.armExtensionScore / maxArmExt : 0.5;
      
      // Body extension score
      const bodyScore = maxBodyExt > 0 ? s.bodyExtensionScore / maxBodyExt : 0.5;
      
      // Velocity score - contact happens near peak velocity but slightly before
      // We want high velocity but with the arm at peak extension
      const distFromPeak = Math.abs(i - peakVelIdx);
      const proximityToPeak = 1 - Math.min(1, distFromPeak / 10); // 1 = at peak, 0 = 10+ frames away
      
      // Combined contact score
      // Weights: arm tip height (35%), arm extension (25%), body extension (15%), velocity proximity (25%)
      const contactScore = 
        (armTipHeightScore * 0.35) + 
        (armScore * 0.25) + 
        (bodyScore * 0.15) + 
        (proximityToPeak * 0.25);
      
      signals[i].contactScore = contactScore;
      
      if (contactScore > bestContactScore) {
        bestContactScore = contactScore;
        bestContactIdx = i;
      }
    }
    
    const contactSignal = signals[bestContactIdx];
    detectionLogger.debug(`🎯 Best contact score: ${bestContactScore.toFixed(3)} at frame ${contactSignal.frame}`);
    detectionLogger.debug(`   Arm tip height: ${(contactSignal.armTipHeight * 100).toFixed(1)}%${contactSignal.usedElbowAsTip ? ' (using elbow)' : ''}`);
    detectionLogger.debug(`   Arm extension: ${contactSignal.armExtensionAngle.toFixed(1)}°`);
    detectionLogger.debug(`   Body extension: ${(contactSignal.bodyExtensionScore * 100).toFixed(1)}%`);
    detectionLogger.debug(`   Velocity: ${contactSignal.armTipVelocity.toFixed(0)} px/s`);
    
    return {
      contactIdx: bestContactIdx,
      peakVelIdx,
      peakVelocity,
    };
  }, []);

  // Main detection function
  const detectContactPoint = useCallback(async (
    preferredHand: "left" | "right" | "auto" = "auto"
  ): Promise<ContactPointDetectionResult | null> => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available. Please run preprocessing first.");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Detect handedness (or use preferred)
      let dominantHand: "left" | "right";
      let handednessConfidence: number;
      
      if (preferredHand === "auto") {
        const handedness = detectHandedness();
        dominantHand = handedness.dominant;
        handednessConfidence = handedness.confidence;
        detectionLogger.debug(`🎯 Detected ${dominantHand}-handed player (${(handednessConfidence * 100).toFixed(0)}% confidence)`);
      } else {
        dominantHand = preferredHand;
        handednessConfidence = 1.0;
        detectionLogger.debug(`🎯 Using specified ${dominantHand} hand`);
      }
      
      // Step 2: Extract all signals
      const rawSignals = extractFrameSignals(dominantHand);
      
      if (rawSignals.length < 20) {
        setError("Not enough valid pose data. Make sure the player is clearly visible throughout the video.");
        setIsAnalyzing(false);
        return null;
      }
      
      // Step 3: Smooth the data
      const signals = smoothSignals(rawSignals, 5);
      
      // Step 4: Find contact point
      const contactResult = findContactPoint(signals);
      
      if (!contactResult) {
        setError("Could not detect contact point. Make sure the video shows a clear serving motion.");
        setIsAnalyzing(false);
        return null;
      }
      
      const contactSignal = signals[contactResult.contactIdx];
      
      // Calculate overall confidence
      const confidence = Math.min(1, (
        contactSignal.contactScore * 0.6 +
        handednessConfidence * 0.2 +
        0.2
      ));
      
      const detection: ContactPointDetectionResult = {
        contactFrame: contactSignal.frame,
        contactTimestamp: contactSignal.timestamp,
        peakVelocityFrame: signals[contactResult.peakVelIdx].frame,
        peakVelocity: contactResult.peakVelocity,
        confidence,
        dominantHand,
        analysisData: {
          signals,
          handednessConfidence,
        },
      };
      
      setResult(detection);
      detectionLogger.debug(`🎯 Contact point detected at frame ${detection.contactFrame} (${detection.contactTimestamp.toFixed(2)}s)`);
      detectionLogger.debug(`   Dominant hand: ${dominantHand}`);
      detectionLogger.debug(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      setIsAnalyzing(false);
      return detection;
    } catch (err) {
      detectionLogger.error("Contact point detection error:", err);
      setError(err instanceof Error ? err.message : "Unknown error during contact point detection");
      setIsAnalyzing(false);
      return null;
    }
  }, [
    preprocessedPoses,
    detectHandedness,
    extractFrameSignals,
    smoothSignals,
    findContactPoint,
  ]);

  // Clear results
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    detectContactPoint,
    clearResult,
    hasPreprocessedData: preprocessedPoses.size > 0,
  };
}

