import { useState, useCallback } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";

interface FrameSignals {
  frame: number;
  timestamp: number;
  // Racket wrist signals
  racketWristVelocity: number;
  racketWristAcceleration: number;
  // Toss wrist signals (opposite hand)
  tossWristY: number; // Lower Y = higher in image
  tossWristHeight: number; // Normalized 0-1, 1 = highest
  // Both arms up signal
  bothArmsUpScore: number; // 0-1, how much both wrists are above shoulders
  leftArmUp: boolean; // Left wrist above left shoulder
  rightArmUp: boolean; // Right wrist above right shoulder
  // Knee signals
  leftKneeAngle: number;
  rightKneeAngle: number;
  avgKneeBend: number; // How bent the knees are (180 - angle)
  kneeDistance: number; // Distance between knees (lower = knees together)
  // Foot/ankle signals
  ankleDistance: number; // Distance between ankles (lower = feet together)
  ankleStability: number; // How stable the ankles are (normalized 0-1, 1 = most stable)
  legsTogetherScore: number; // Combined ankles + knees close together score (0-1)
  // Combined score
  trophyScore: number;
}

export interface TrophyDetectionResult {
  trophyFrame: number;
  trophyTimestamp: number;
  peakAccelerationFrame: number;
  peakAcceleration: number;
  confidence: number;
  dominantHand: "left" | "right";
  analysisData: {
    signals: FrameSignals[];
    handednessConfidence: number;
  };
}

interface UseTrophyDetectionProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

/**
 * Hook to detect the "trophy position" in a tennis/padel serve
 * 
 * Enhanced detection using multiple biomechanical signals:
 * 1. Racket wrist acceleration (local minimum before swing)
 * 2. Knee bend (maximum bend during loading phase)
 * 3. Toss wrist height (opposite hand at highest point)
 * 4. Feet together & stable (ankles close with minimal motion)
 * 5. Automatic handedness detection (left/right)
 */
export function useTrophyDetection({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseTrophyDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TrophyDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get keypoint indices based on model
  const getKeypointIndices = useCallback(() => {
    if (selectedModel === "BlazePose") {
      return {
        leftWrist: 15,
        rightWrist: 16,
        leftHip: 23,
        rightHip: 24,
        leftKnee: 25,
        rightKnee: 26,
        leftAnkle: 27,
        rightAnkle: 28,
        leftShoulder: 11,
        rightShoulder: 12,
      };
    }
    // MoveNet
    return {
      leftWrist: 9,
      rightWrist: 10,
      leftHip: 11,
      rightHip: 12,
      leftKnee: 13,
      rightKnee: 14,
      leftAnkle: 15,
      rightAnkle: 16,
      leftShoulder: 5,
      rightShoulder: 6,
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
    
    // The racket hand typically has MORE motion (swinging)
    const total = leftTotalMotion + rightTotalMotion;
    const rightRatio = total > 0 ? rightTotalMotion / total : 0.5;
    
    // Confidence is how different the two are
    const confidence = Math.abs(rightRatio - 0.5) * 2; // 0 to 1
    
    console.log(`🎾 Handedness analysis: Left=${leftTotalMotion.toFixed(0)}px, Right=${rightTotalMotion.toFixed(0)}px`);
    
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
    const tossWristIdx = dominantHand === "right" ? indices.leftWrist : indices.rightWrist;
    
    // First pass: collect raw data
    const rawData: Array<{
      frame: number;
      timestamp: number;
      racketWrist: { x: number; y: number } | null;
      tossWrist: { x: number; y: number } | null;
      leftWrist: { x: number; y: number } | null;
      rightWrist: { x: number; y: number } | null;
      leftShoulder: { x: number; y: number } | null;
      rightShoulder: { x: number; y: number } | null;
      leftKnee: { hip: { x: number; y: number }; knee: { x: number; y: number }; ankle: { x: number; y: number } } | null;
      rightKnee: { hip: { x: number; y: number }; knee: { x: number; y: number }; ankle: { x: number; y: number } } | null;
      leftAnkle: { x: number; y: number } | null;
      rightAnkle: { x: number; y: number } | null;
    }> = [];
    
    for (const frame of sortedFrames) {
      const poses = preprocessedPoses.get(frame);
      if (!poses || poses.length <= selectedPoseIndex) continue;
      
      const pose = poses[selectedPoseIndex];
      const kp = pose.keypoints;
      
      // Racket wrist
      const racketWrist = kp[racketWristIdx];
      const racketWristValid = racketWrist && (racketWrist.score ?? 0) > 0.3;
      
      // Toss wrist
      const tossWrist = kp[tossWristIdx];
      const tossWristValid = tossWrist && (tossWrist.score ?? 0) > 0.3;
      
      // Both wrists and shoulders for "arms up" detection
      const leftWrist = kp[indices.leftWrist];
      const rightWrist = kp[indices.rightWrist];
      const leftShoulder = kp[indices.leftShoulder];
      const rightShoulder = kp[indices.rightShoulder];
      
      const leftWristValid = leftWrist && (leftWrist.score ?? 0) > 0.3;
      const rightWristValid = rightWrist && (rightWrist.score ?? 0) > 0.3;
      const leftShoulderValid = leftShoulder && (leftShoulder.score ?? 0) > 0.3;
      const rightShoulderValid = rightShoulder && (rightShoulder.score ?? 0) > 0.3;
      
      // Left knee angle (hip-knee-ankle)
      const leftHip = kp[indices.leftHip];
      const leftKnee = kp[indices.leftKnee];
      const leftAnkle = kp[indices.leftAnkle];
      const leftKneeValid = leftHip && leftKnee && leftAnkle &&
        (leftHip.score ?? 0) > 0.3 && (leftKnee.score ?? 0) > 0.3 && (leftAnkle.score ?? 0) > 0.3;
      
      // Right knee angle
      const rightHip = kp[indices.rightHip];
      const rightKnee = kp[indices.rightKnee];
      const rightAnkle = kp[indices.rightAnkle];
      const rightKneeValid = rightHip && rightKnee && rightAnkle &&
        (rightHip.score ?? 0) > 0.3 && (rightKnee.score ?? 0) > 0.3 && (rightAnkle.score ?? 0) > 0.3;
      
      // Ankle positions (for feet together/stability check)
      const leftAnkleValid = leftAnkle && (leftAnkle.score ?? 0) > 0.3;
      const rightAnkleValid = rightAnkle && (rightAnkle.score ?? 0) > 0.3;
      
      rawData.push({
        frame,
        timestamp: frame / videoFPS,
        racketWrist: racketWristValid ? { x: racketWrist.x, y: racketWrist.y } : null,
        tossWrist: tossWristValid ? { x: tossWrist.x, y: tossWrist.y } : null,
        leftWrist: leftWristValid ? { x: leftWrist.x, y: leftWrist.y } : null,
        rightWrist: rightWristValid ? { x: rightWrist.x, y: rightWrist.y } : null,
        leftShoulder: leftShoulderValid ? { x: leftShoulder.x, y: leftShoulder.y } : null,
        rightShoulder: rightShoulderValid ? { x: rightShoulder.x, y: rightShoulder.y } : null,
        leftKnee: leftKneeValid ? {
          hip: { x: leftHip.x, y: leftHip.y },
          knee: { x: leftKnee.x, y: leftKnee.y },
          ankle: { x: leftAnkle.x, y: leftAnkle.y },
        } : null,
        rightKnee: rightKneeValid ? {
          hip: { x: rightHip.x, y: rightHip.y },
          knee: { x: rightKnee.x, y: rightKnee.y },
          ankle: { x: rightAnkle.x, y: rightAnkle.y },
        } : null,
        leftAnkle: leftAnkleValid ? { x: leftAnkle.x, y: leftAnkle.y } : null,
        rightAnkle: rightAnkleValid ? { x: rightAnkle.x, y: rightAnkle.y } : null,
      });
    }
    
    if (rawData.length < 10) return [];
    
    // Calculate velocities and accelerations
    const signals: FrameSignals[] = [];
    
    // Find min/max for normalization
    let minTossY = Infinity, maxTossY = -Infinity;
    let minAnkleDistance = Infinity, maxAnkleDistance = -Infinity;
    let minKneeDistance = Infinity, maxKneeDistance = -Infinity;
    
    for (const d of rawData) {
      if (d.tossWrist) {
        minTossY = Math.min(minTossY, d.tossWrist.y);
        maxTossY = Math.max(maxTossY, d.tossWrist.y);
      }
      // Calculate ankle distance for normalization
      if (d.leftAnkle && d.rightAnkle) {
        const dx = d.leftAnkle.x - d.rightAnkle.x;
        const dy = d.leftAnkle.y - d.rightAnkle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minAnkleDistance = Math.min(minAnkleDistance, dist);
        maxAnkleDistance = Math.max(maxAnkleDistance, dist);
      }
      // Calculate knee distance for normalization
      if (d.leftKnee && d.rightKnee) {
        const dx = d.leftKnee.knee.x - d.rightKnee.knee.x;
        const dy = d.leftKnee.knee.y - d.rightKnee.knee.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minKneeDistance = Math.min(minKneeDistance, dist);
        maxKneeDistance = Math.max(maxKneeDistance, dist);
      }
    }
    
    for (let i = 2; i < rawData.length; i++) {
      const prev2 = rawData[i - 2];
      const prev = rawData[i - 1];
      const curr = rawData[i];
      
      // Calculate racket wrist velocity and acceleration
      let velocity = 0;
      let acceleration = 0;
      
      if (prev.racketWrist && curr.racketWrist) {
        const dx = curr.racketWrist.x - prev.racketWrist.x;
        const dy = curr.racketWrist.y - prev.racketWrist.y;
        const dt = curr.timestamp - prev.timestamp;
        velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;
      }
      
      if (prev2.racketWrist && prev.racketWrist && curr.racketWrist) {
        const dx1 = prev.racketWrist.x - prev2.racketWrist.x;
        const dy1 = prev.racketWrist.y - prev2.racketWrist.y;
        const dt1 = prev.timestamp - prev2.timestamp;
        const v1 = dt1 > 0 ? Math.sqrt(dx1 * dx1 + dy1 * dy1) / dt1 : 0;
        
        const dx2 = curr.racketWrist.x - prev.racketWrist.x;
        const dy2 = curr.racketWrist.y - prev.racketWrist.y;
        const dt2 = curr.timestamp - prev.timestamp;
        const v2 = dt2 > 0 ? Math.sqrt(dx2 * dx2 + dy2 * dy2) / dt2 : 0;
        
        const dt = (curr.timestamp - prev2.timestamp) / 2;
        acceleration = dt > 0 ? (v2 - v1) / dt : 0;
      }
      
      // Toss wrist height (normalized, 1 = highest)
      let tossWristY = 0;
      let tossWristHeight = 0;
      if (curr.tossWrist && maxTossY > minTossY) {
        tossWristY = curr.tossWrist.y;
        // Invert because lower Y = higher in image
        tossWristHeight = 1 - (curr.tossWrist.y - minTossY) / (maxTossY - minTossY);
      }
      
      // Both arms up detection
      // Check if each wrist is above (lower Y) its corresponding shoulder
      let leftArmUp = false;
      let rightArmUp = false;
      let leftArmUpAmount = 0; // How far above shoulder (positive = above)
      let rightArmUpAmount = 0;
      
      if (curr.leftWrist && curr.leftShoulder) {
        // Lower Y = higher in image, so wrist.y < shoulder.y means arm is up
        leftArmUpAmount = curr.leftShoulder.y - curr.leftWrist.y;
        leftArmUp = leftArmUpAmount > 0;
      }
      
      if (curr.rightWrist && curr.rightShoulder) {
        rightArmUpAmount = curr.rightShoulder.y - curr.rightWrist.y;
        rightArmUp = rightArmUpAmount > 0;
      }
      
      // Calculate bothArmsUpScore (0-1)
      // Both arms need to be up for max score, partial credit if only one is up
      let bothArmsUpScore = 0;
      if (leftArmUp && rightArmUp) {
        // Both arms are above shoulders - calculate how far above
        // Normalize by shoulder height (approximate torso length)
        const avgShoulderY = ((curr.leftShoulder?.y || 0) + (curr.rightShoulder?.y || 0)) / 2;
        const avgHipY = ((curr.leftKnee?.hip.y || avgShoulderY + 100) + (curr.rightKnee?.hip.y || avgShoulderY + 100)) / 2;
        const torsoLength = Math.max(avgHipY - avgShoulderY, 50); // Approximate torso length
        
        // Score based on how far above shoulder (normalized by torso length)
        const leftScore = Math.min(1, leftArmUpAmount / torsoLength);
        const rightScore = Math.min(1, rightArmUpAmount / torsoLength);
        bothArmsUpScore = (leftScore + rightScore) / 2;
      } else if (leftArmUp || rightArmUp) {
        // Only one arm up - partial score
        bothArmsUpScore = 0.3;
      }
      
      // Knee angles
      let leftKneeAngle = 180;
      let rightKneeAngle = 180;
      
      if (curr.leftKnee) {
        leftKneeAngle = calculateAngle(curr.leftKnee.hip, curr.leftKnee.knee, curr.leftKnee.ankle);
      }
      if (curr.rightKnee) {
        rightKneeAngle = calculateAngle(curr.rightKnee.hip, curr.rightKnee.knee, curr.rightKnee.ankle);
      }
      
      // Average knee bend (180 - angle, higher = more bent)
      const avgKneeBend = 180 - (leftKneeAngle + rightKneeAngle) / 2;
      
      // Ankle distance (how far apart the feet are)
      let ankleDistance = 0;
      if (curr.leftAnkle && curr.rightAnkle) {
        const dx = curr.leftAnkle.x - curr.rightAnkle.x;
        const dy = curr.leftAnkle.y - curr.rightAnkle.y;
        ankleDistance = Math.sqrt(dx * dx + dy * dy);
      }
      
      // Knee distance (how far apart the knees are)
      let kneeDistance = 0;
      if (curr.leftKnee && curr.rightKnee) {
        const dx = curr.leftKnee.knee.x - curr.rightKnee.knee.x;
        const dy = curr.leftKnee.knee.y - curr.rightKnee.knee.y;
        kneeDistance = Math.sqrt(dx * dx + dy * dy);
      }
      
      // Ankle motion/stability (how much ankles moved from previous frame)
      let ankleMotion = 0;
      if (prev.leftAnkle && curr.leftAnkle && prev.rightAnkle && curr.rightAnkle) {
        const dt = curr.timestamp - prev.timestamp;
        if (dt > 0) {
          // Left ankle motion
          const leftDx = curr.leftAnkle.x - prev.leftAnkle.x;
          const leftDy = curr.leftAnkle.y - prev.leftAnkle.y;
          const leftMotion = Math.sqrt(leftDx * leftDx + leftDy * leftDy) / dt;
          
          // Right ankle motion
          const rightDx = curr.rightAnkle.x - prev.rightAnkle.x;
          const rightDy = curr.rightAnkle.y - prev.rightAnkle.y;
          const rightMotion = Math.sqrt(rightDx * rightDx + rightDy * rightDy) / dt;
          
          ankleMotion = (leftMotion + rightMotion) / 2;
        }
      }
      
      signals.push({
        frame: curr.frame,
        timestamp: curr.timestamp,
        racketWristVelocity: velocity,
        racketWristAcceleration: acceleration,
        tossWristY,
        tossWristHeight,
        bothArmsUpScore,
        leftArmUp,
        rightArmUp,
        leftKneeAngle,
        rightKneeAngle,
        avgKneeBend,
        kneeDistance,
        ankleDistance,
        ankleStability: 0, // Will be normalized later
        legsTogetherScore: 0, // Will be calculated later
        trophyScore: 0, // Will be calculated later
      });
    }
    
    // Normalize ankle stability (inverse of motion - less motion = more stable)
    if (signals.length > 0) {
      let maxMotion = 0;
      for (const s of signals) {
        // Temporarily store motion in ankleStability field
        maxMotion = Math.max(maxMotion, s.ankleStability);
      }
      
      // Re-calculate with actual motion values and normalize
      let motionValues: number[] = [];
      for (let i = 1; i < rawData.length - 1; i++) {
        const prev = rawData[i];
        const curr = rawData[i + 1];
        if (prev.leftAnkle && curr.leftAnkle && prev.rightAnkle && curr.rightAnkle) {
          const dt = curr.timestamp - prev.timestamp;
          if (dt > 0) {
            const leftDx = curr.leftAnkle.x - prev.leftAnkle.x;
            const leftDy = curr.leftAnkle.y - prev.leftAnkle.y;
            const rightDx = curr.rightAnkle.x - prev.rightAnkle.x;
            const rightDy = curr.rightAnkle.y - prev.rightAnkle.y;
            const motion = (Math.sqrt(leftDx * leftDx + leftDy * leftDy) + 
                           Math.sqrt(rightDx * rightDx + rightDy * rightDy)) / (2 * dt);
            motionValues.push(motion);
          } else {
            motionValues.push(0);
          }
        } else {
          motionValues.push(0);
        }
      }
      
      const maxMotionValue = Math.max(...motionValues, 1);
      
      for (let i = 0; i < signals.length; i++) {
        const motion = motionValues[i] || 0;
        // Stability is inverse of motion (1 = most stable, 0 = most motion)
        signals[i].ankleStability = 1 - Math.min(1, motion / maxMotionValue);
        
        // Ankle proximity score (lower distance = higher score)
        const ankleDistRange = maxAnkleDistance - minAnkleDistance;
        const ankleProximityScore = ankleDistRange > 0 
          ? 1 - (signals[i].ankleDistance - minAnkleDistance) / ankleDistRange 
          : 0.5;
        
        // Knee proximity score (lower distance = higher score)
        const kneeDistRange = maxKneeDistance - minKneeDistance;
        const kneeProximityScore = kneeDistRange > 0 
          ? 1 - (signals[i].kneeDistance - minKneeDistance) / kneeDistRange 
          : 0.5;
        
        // Combined legs together score:
        // - Ankle stability (40%) - feet planted and not moving
        // - Ankle proximity (35%) - feet close together
        // - Knee proximity (25%) - knees close together
        signals[i].legsTogetherScore = 
          (signals[i].ankleStability * 0.40) + 
          (ankleProximityScore * 0.35) + 
          (kneeProximityScore * 0.25);
      }
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
      
      let sumVel = 0, sumAcc = 0, sumHeight = 0, sumKneeBend = 0, sumLegsScore = 0, sumArmsUp = 0;
      
      for (let j = start; j <= end; j++) {
        sumVel += signals[j].racketWristVelocity;
        sumAcc += signals[j].racketWristAcceleration;
        sumHeight += signals[j].tossWristHeight;
        sumKneeBend += signals[j].avgKneeBend;
        sumLegsScore += signals[j].legsTogetherScore;
        sumArmsUp += signals[j].bothArmsUpScore;
        count++;
      }
      
      smoothed.push({
        ...signals[i],
        racketWristVelocity: sumVel / count,
        racketWristAcceleration: sumAcc / count,
        tossWristHeight: sumHeight / count,
        avgKneeBend: sumKneeBend / count,
        legsTogetherScore: sumLegsScore / count,
        bothArmsUpScore: sumArmsUp / count,
      });
    }
    
    return smoothed;
  }, []);

  // Find trophy position using combined signals
  const findTrophyPosition = useCallback((
    signals: FrameSignals[]
  ): { trophyIdx: number; peakIdx: number; peakAcceleration: number } | null => {
    if (signals.length < 10) return null;
    
    // Step 1: Find peak acceleration (the swing moment)
    let peakIdx = 0;
    let peakValue = signals[0].racketWristAcceleration;
    
    for (let i = 1; i < signals.length; i++) {
      if (signals[i].racketWristAcceleration > peakValue) {
        peakValue = signals[i].racketWristAcceleration;
        peakIdx = i;
      }
    }
    
    // Peak should be in the later part of the motion
    if (peakIdx < signals.length * 0.15) {
      console.warn("Peak acceleration found very early, might not be a serve");
    }
    
    // Step 2: Calculate trophy scores for frames BEFORE the peak
    // Trophy position has: low racket acceleration, high toss wrist, bent knees, both arms up
    
    // Find ranges for normalization
    let maxKneeBend = 0, minAcc = Infinity, maxHeight = 0, maxArmsUp = 0;
    for (let i = 0; i < peakIdx; i++) {
      maxKneeBend = Math.max(maxKneeBend, signals[i].avgKneeBend);
      minAcc = Math.min(minAcc, signals[i].racketWristAcceleration);
      maxHeight = Math.max(maxHeight, signals[i].tossWristHeight);
      maxArmsUp = Math.max(maxArmsUp, signals[i].bothArmsUpScore);
    }
    
    // Score each frame before the peak
    let bestTrophyIdx = 0;
    let bestTrophyScore = -Infinity;
    
    // Only look in a reasonable window (20% to 80% of way to peak)
    const searchStart = Math.floor(peakIdx * 0.2);
    const searchEnd = Math.floor(peakIdx * 0.85);
    
    for (let i = searchStart; i < searchEnd; i++) {
      const s = signals[i];
      
      // Normalize components (0-1 scale, higher = more trophy-like)
      
      // Low acceleration = good (we want the pause before swing)
      // Use inverse: lowest acceleration gets highest score
      const accRange = peakValue - minAcc;
      const accScore = accRange > 0 ? 1 - (s.racketWristAcceleration - minAcc) / accRange : 0.5;
      
      // High toss wrist = good
      const heightScore = maxHeight > 0 ? s.tossWristHeight / maxHeight : 0.5;
      
      // Bent knees = good
      const kneeBendScore = maxKneeBend > 0 ? s.avgKneeBend / maxKneeBend : 0.5;
      
      // Legs together score (ankles + knees close, feet stable) - already normalized 0-1
      const legsScore = s.legsTogetherScore;
      
      // Both arms up = good (already normalized 0-1)
      const armsUpScore = maxArmsUp > 0 ? s.bothArmsUpScore / maxArmsUp : 0.5;
      
      // Combined score (weighted)
      // Weights: acceleration (25%), toss height (20%), knee bend (20%), arms up (20%), legs together (15%)
      const trophyScore = 
        (accScore * 0.25) + 
        (heightScore * 0.20) + 
        (kneeBendScore * 0.20) + 
        (armsUpScore * 0.20) + 
        (legsScore * 0.15);
      
      signals[i].trophyScore = trophyScore;
      
      if (trophyScore > bestTrophyScore) {
        bestTrophyScore = trophyScore;
        bestTrophyIdx = i;
      }
    }
    
    const bestSignal = signals[bestTrophyIdx];
    console.log(`🏆 Best trophy score: ${bestTrophyScore.toFixed(3)} at frame ${bestSignal.frame}`);
    console.log(`   Both arms up: ${(bestSignal.bothArmsUpScore * 100).toFixed(1)}% (L:${bestSignal.leftArmUp ? '↑' : '↓'} R:${bestSignal.rightArmUp ? '↑' : '↓'})`);
    console.log(`   Knee bend: ${bestSignal.avgKneeBend.toFixed(1)}°`);
    console.log(`   Toss height: ${(bestSignal.tossWristHeight * 100).toFixed(1)}%`);
    console.log(`   Legs together: ${(bestSignal.legsTogetherScore * 100).toFixed(1)}% (ankles: ${bestSignal.ankleDistance.toFixed(0)}px, knees: ${bestSignal.kneeDistance.toFixed(0)}px)`);
    console.log(`   Acceleration: ${bestSignal.racketWristAcceleration.toFixed(0)} px/s²`);
    
    return {
      trophyIdx: bestTrophyIdx,
      peakIdx,
      peakAcceleration: peakValue,
    };
  }, []);

  // Main detection function
  const detectTrophyPosition = useCallback(async (
    preferredHand: "left" | "right" | "auto" = "auto"
  ): Promise<TrophyDetectionResult | null> => {
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
        console.log(`🎾 Detected ${dominantHand}-handed player (${(handednessConfidence * 100).toFixed(0)}% confidence)`);
      } else {
        dominantHand = preferredHand;
        handednessConfidence = 1.0;
        console.log(`🎾 Using specified ${dominantHand} hand`);
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
      
      // Step 4: Find trophy position
      const trophyResult = findTrophyPosition(signals);
      
      if (!trophyResult) {
        setError("Could not detect trophy position. Make sure the video shows a clear serving motion.");
        setIsAnalyzing(false);
        return null;
      }
      
      const trophySignal = signals[trophyResult.trophyIdx];
      
      // Calculate overall confidence
      const confidence = Math.min(1, (
        trophySignal.trophyScore * 0.6 +  // Quality of the trophy position
        handednessConfidence * 0.2 +       // How sure we are about handedness
        0.2                                // Base confidence
      ));
      
      const detection: TrophyDetectionResult = {
        trophyFrame: trophySignal.frame,
        trophyTimestamp: trophySignal.timestamp,
        peakAccelerationFrame: signals[trophyResult.peakIdx].frame,
        peakAcceleration: trophyResult.peakAcceleration,
        confidence,
        dominantHand,
        analysisData: {
          signals,
          handednessConfidence,
        },
      };
      
      setResult(detection);
      console.log(`🏆 Trophy position detected at frame ${detection.trophyFrame} (${detection.trophyTimestamp.toFixed(2)}s)`);
      console.log(`   Dominant hand: ${dominantHand}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      setIsAnalyzing(false);
      return detection;
    } catch (err) {
      console.error("Trophy detection error:", err);
      setError(err instanceof Error ? err.message : "Unknown error during trophy detection");
      setIsAnalyzing(false);
      return null;
    }
  }, [
    preprocessedPoses,
    detectHandedness,
    extractFrameSignals,
    smoothSignals,
    findTrophyPosition,
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
    detectTrophyPosition,
    clearResult,
    hasPreprocessedData: preprocessedPoses.size > 0,
  };
}
