/**
 * Handedness Detection
 *
 * Automatically detects whether a player is left or right-handed
 * by analyzing wrist velocity patterns throughout the video.
 */

import { useState, useCallback, useMemo } from "react";
import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";

// ============================================================================
// Types
// ============================================================================

export interface HandednessSignals {
  /** Average velocity for each wrist */
  avgVelocity: { left: number; right: number };
  /** Peak velocity for each wrist */
  peakVelocity: { left: number; right: number };
  /** Velocity standard deviation (activity variance) */
  velocityVariance: { left: number; right: number };
  /** Frames above high-velocity threshold */
  highVelocityFrames: { left: number; right: number };
  /** Average extension from body center */
  avgExtension: { left: number; right: number };
  /** Peak extension from body center */
  peakExtension: { left: number; right: number };
  /** Times wrist crossed body centerline */
  crossBodyCount: { left: number; right: number };
}

export interface HandednessResult {
  /** Detected dominant hand */
  dominantHand: "left" | "right";
  /** Confidence score (0-1) */
  confidence: number;
  /** Individual signal contributions */
  signals: HandednessSignals;
  /** Score breakdown */
  scores: {
    left: number;
    right: number;
    breakdown: {
      avgVelocity: { left: number; right: number };
      peakVelocity: { left: number; right: number };
      variance: { left: number; right: number };
      extension: { left: number; right: number };
      crossBody: { left: number; right: number };
    };
  };
  /** Analysis metadata */
  framesAnalyzed: number;
  analysisTimestamp: string;
}

export interface HandednessConfig {
  /** Minimum keypoint confidence */
  minConfidence: number;
  /** Velocity threshold for "high velocity" frames (px/frame) */
  highVelocityThreshold: number;
  /** Weight for average velocity signal */
  avgVelocityWeight: number;
  /** Weight for peak velocity signal */
  peakVelocityWeight: number;
  /** Weight for velocity variance signal */
  varianceWeight: number;
  /** Weight for extension signal */
  extensionWeight: number;
  /** Weight for cross-body signal */
  crossBodyWeight: number;
}

export const DEFAULT_HANDEDNESS_CONFIG: HandednessConfig = {
  minConfidence: 0.3,
  highVelocityThreshold: 8,
  avgVelocityWeight: 1.0,
  peakVelocityWeight: 1.5,
  varianceWeight: 0.5,
  extensionWeight: 1.0,
  crossBodyWeight: 0.8,
};

// ============================================================================
// Hook
// ============================================================================

interface UseHandednessDetectionProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
  config?: Partial<HandednessConfig>;
}

export function useHandednessDetection({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
  config: userConfig,
}: UseHandednessDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<HandednessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => ({
    ...DEFAULT_HANDEDNESS_CONFIG,
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
        nose: 0,
      };
    }
    return {
      leftWrist: 9,
      rightWrist: 10,
      leftShoulder: 5,
      rightShoulder: 6,
      leftHip: 11,
      rightHip: 12,
      nose: 0,
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
   * Get body centerline X position (between shoulders)
   */
  const getCenterlineX = useCallback((
    pose: PoseDetectionResult,
    minConfidence: number
  ): number | null => {
    const leftShoulder = pose.keypoints[indices.leftShoulder];
    const rightShoulder = pose.keypoints[indices.rightShoulder];

    if (!leftShoulder || !rightShoulder) return null;
    if ((leftShoulder.score ?? 0) < minConfidence) return null;
    if ((rightShoulder.score ?? 0) < minConfidence) return null;

    return (leftShoulder.x + rightShoulder.x) / 2;
  }, [indices]);

  /**
   * Main analysis function
   */
  const analyzeHandedness = useCallback(async (): Promise<HandednessResult | null> => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
      const totalFrames = frames.length;

      // Accumulators for each wrist
      const leftVelocities: number[] = [];
      const rightVelocities: number[] = [];
      const leftExtensions: number[] = [];
      const rightExtensions: number[] = [];
      let leftCrossBody = 0;
      let rightCrossBody = 0;
      let leftHighVelFrames = 0;
      let rightHighVelFrames = 0;

      // Previous frame data for velocity calculation
      let prevPose: PoseDetectionResult | null = null;
      let prevCenter: { x: number; y: number } | null = null;
      let prevLeftWristX: number | null = null;
      let prevRightWristX: number | null = null;

      for (let i = 0; i < totalFrames; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];

        if (!pose) continue;

        const center = getBodyCenter(pose, config.minConfidence);
        const centerlineX = getCenterlineX(pose, config.minConfidence);
        if (!center) continue;

        const leftWrist = pose.keypoints[indices.leftWrist];
        const rightWrist = pose.keypoints[indices.rightWrist];

        // Calculate extensions (distance from body center)
        if (leftWrist && (leftWrist.score ?? 0) >= config.minConfidence) {
          const dx = leftWrist.x - center.x;
          const dy = leftWrist.y - center.y;
          leftExtensions.push(Math.sqrt(dx * dx + dy * dy));

          // Cross-body detection (left wrist on right side of body)
          if (centerlineX !== null && leftWrist.x > centerlineX) {
            // Check if this is a new cross (wasn't crossed in previous frame)
            if (prevLeftWristX !== null && prevLeftWristX <= centerlineX) {
              leftCrossBody++;
            }
          }
          prevLeftWristX = leftWrist.x;
        }

        if (rightWrist && (rightWrist.score ?? 0) >= config.minConfidence) {
          const dx = rightWrist.x - center.x;
          const dy = rightWrist.y - center.y;
          rightExtensions.push(Math.sqrt(dx * dx + dy * dy));

          // Cross-body detection (right wrist on left side of body)
          if (centerlineX !== null && rightWrist.x < centerlineX) {
            if (prevRightWristX !== null && prevRightWristX >= centerlineX) {
              rightCrossBody++;
            }
          }
          prevRightWristX = rightWrist.x;
        }

        // Calculate velocities (need previous frame)
        if (prevPose && prevCenter) {
          const prevLeftWrist = prevPose.keypoints[indices.leftWrist];
          const prevRightWrist = prevPose.keypoints[indices.rightWrist];

          // Left wrist velocity
          if (
            leftWrist && prevLeftWrist &&
            (leftWrist.score ?? 0) >= config.minConfidence &&
            (prevLeftWrist.score ?? 0) >= config.minConfidence
          ) {
            const currRelX = leftWrist.x - center.x;
            const currRelY = leftWrist.y - center.y;
            const prevRelX = prevLeftWrist.x - prevCenter.x;
            const prevRelY = prevLeftWrist.y - prevCenter.y;
            const dx = currRelX - prevRelX;
            const dy = currRelY - prevRelY;
            const vel = Math.sqrt(dx * dx + dy * dy);
            leftVelocities.push(vel);
            if (vel >= config.highVelocityThreshold) {
              leftHighVelFrames++;
            }
          }

          // Right wrist velocity
          if (
            rightWrist && prevRightWrist &&
            (rightWrist.score ?? 0) >= config.minConfidence &&
            (prevRightWrist.score ?? 0) >= config.minConfidence
          ) {
            const currRelX = rightWrist.x - center.x;
            const currRelY = rightWrist.y - center.y;
            const prevRelX = prevRightWrist.x - prevCenter.x;
            const prevRelY = prevRightWrist.y - prevCenter.y;
            const dx = currRelX - prevRelX;
            const dy = currRelY - prevRelY;
            const vel = Math.sqrt(dx * dx + dy * dy);
            rightVelocities.push(vel);
            if (vel >= config.highVelocityThreshold) {
              rightHighVelFrames++;
            }
          }
        }

        prevPose = pose;
        prevCenter = center;
      }

      // Calculate statistics
      const calcStats = (values: number[]) => {
        if (values.length === 0) return { avg: 0, peak: 0, variance: 0 };
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const peak = Math.max(...values);
        const variance = Math.sqrt(
          values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
        );
        return { avg, peak, variance };
      };

      const leftVelStats = calcStats(leftVelocities);
      const rightVelStats = calcStats(rightVelocities);
      const leftExtStats = calcStats(leftExtensions);
      const rightExtStats = calcStats(rightExtensions);

      // Build signals object
      const signals: HandednessSignals = {
        avgVelocity: { left: leftVelStats.avg, right: rightVelStats.avg },
        peakVelocity: { left: leftVelStats.peak, right: rightVelStats.peak },
        velocityVariance: { left: leftVelStats.variance, right: rightVelStats.variance },
        highVelocityFrames: { left: leftHighVelFrames, right: rightHighVelFrames },
        avgExtension: { left: leftExtStats.avg, right: rightExtStats.avg },
        peakExtension: { left: leftExtStats.peak, right: rightExtStats.peak },
        crossBodyCount: { left: leftCrossBody, right: rightCrossBody },
      };

      // Calculate normalized scores for each signal
      const normalize = (left: number, right: number): { left: number; right: number } => {
        const total = left + right;
        if (total === 0) return { left: 0.5, right: 0.5 };
        return { left: left / total, right: right / total };
      };

      const avgVelNorm = normalize(leftVelStats.avg, rightVelStats.avg);
      const peakVelNorm = normalize(leftVelStats.peak, rightVelStats.peak);
      const varianceNorm = normalize(leftVelStats.variance, rightVelStats.variance);
      const extensionNorm = normalize(leftExtStats.peak, rightExtStats.peak);
      const crossBodyNorm = normalize(leftCrossBody, rightCrossBody);

      // Weighted score calculation
      const weights = {
        avgVelocity: config.avgVelocityWeight,
        peakVelocity: config.peakVelocityWeight,
        variance: config.varianceWeight,
        extension: config.extensionWeight,
        crossBody: config.crossBodyWeight,
      };
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

      const leftScore = (
        avgVelNorm.left * weights.avgVelocity +
        peakVelNorm.left * weights.peakVelocity +
        varianceNorm.left * weights.variance +
        extensionNorm.left * weights.extension +
        crossBodyNorm.left * weights.crossBody
      ) / totalWeight;

      const rightScore = (
        avgVelNorm.right * weights.avgVelocity +
        peakVelNorm.right * weights.peakVelocity +
        varianceNorm.right * weights.variance +
        extensionNorm.right * weights.extension +
        crossBodyNorm.right * weights.crossBody
      ) / totalWeight;

      // Determine dominant hand and confidence
      const dominantHand: "left" | "right" = leftScore > rightScore ? "left" : "right";
      const scoreDiff = Math.abs(leftScore - rightScore);
      const confidence = Math.min(1, scoreDiff * 2 + 0.5); // Maps 0-0.25 diff to 0.5-1.0 confidence

      const analysisResult: HandednessResult = {
        dominantHand,
        confidence,
        signals,
        scores: {
          left: leftScore,
          right: rightScore,
          breakdown: {
            avgVelocity: avgVelNorm,
            peakVelocity: peakVelNorm,
            variance: varianceNorm,
            extension: extensionNorm,
            crossBody: crossBodyNorm,
          },
        },
        framesAnalyzed: totalFrames,
        analysisTimestamp: new Date().toISOString(),
      };

      setResult(analysisResult);
      return analysisResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : "Handedness analysis failed";
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    preprocessedPoses,
    selectedPoseIndex,
    config,
    indices,
    getBodyCenter,
    getCenterlineX,
  ]);

  /**
   * Clear results
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyzeHandedness,
    clearResult,
    isAnalyzing,
    result,
    error,
    config,
  };
}
