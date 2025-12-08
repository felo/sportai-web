import { useState, useCallback } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import { DEFAULT_PERSON_HEIGHT_METERS } from "../constants";

/**
 * A detected swing in the video (V2 - acceleration based)
 */
export interface DetectedSwingV2 {
  frame: number;
  timestamp: number;
  acceleration: number;        // peak acceleration (px/frame²)
  velocity: number;            // velocity at peak
  prominence: number;          // how much peak stands out from surroundings
  confidence: number;          // 0-1 based on prominence
}

/**
 * Per-frame data for V2 detector
 */
export interface SwingDataPointV2 {
  frame: number;
  timestamp: number;
  velocity: number | null;
  acceleration: number | null;
  bodyCenter: { x: number; y: number } | null;
  /** Radial velocity: positive = outward (swing), negative = inward (recovery) */
  radialVelocity: number | null;
}

/**
 * Complete swing detection result (V2)
 */
export interface SwingDetectionResultV2 {
  swings: DetectedSwingV2[];
  frameData: SwingDataPointV2[];
  totalSwings: number;
  maxAcceleration: number;
  framesAnalyzed: number;
  videoDuration: number;
}

interface UseSwingDetectionV2Props {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

interface SwingDetectionV2Config {
  /** Minimum time between swings (seconds) */
  minPeakDistanceSeconds: number;
  /** Minimum prominence ratio - peak must be this many times higher than surrounding valleys */
  minProminenceRatio: number;
  /** Keypoint confidence threshold */
  minConfidence: number;
  /** Smoothing window for acceleration data */
  smoothingWindow: number;
  /** Filter by direction: only keep swings with outward motion (filters recovery movements) */
  requireOutwardMotion: boolean;
  /** Minimum radial velocity to count as outward motion */
  minRadialVelocity: number;
}

const DEFAULT_CONFIG: SwingDetectionV2Config = {
  minPeakDistanceSeconds: 1.5,
  minProminenceRatio: 1.3,      // Peak must be 1.3x higher than local baseline
  minConfidence: 0.2,           // Lower confidence to accept more keypoints
  smoothingWindow: 3,
  requireOutwardMotion: true,   // Filter out recovery movements
  minRadialVelocity: 0.5,       // Minimum outward velocity to count as swing
};

/**
 * V2 Swing Detection - Acceleration-based with prominence detection
 * 
 * Simpler approach:
 * 1. Calculate wrist acceleration relative to body center
 * 2. Find peaks using prominence (how much peak stands out from valleys)
 * 3. Enforce minimum distance between peaks
 * 
 * No velocity ratio, no radial direction - just clear acceleration spikes.
 */
export function useSwingDetectionV2({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseSwingDetectionV2Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwingDetectionResultV2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get keypoint indices based on model
  const getKeypointIndices = useCallback(() => {
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
    // MoveNet
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
    indices: ReturnType<typeof getKeypointIndices>,
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
      
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j >= 0 && j < data.length && data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      
      result.push(count > 0 ? sum / count : null);
    }

    return result;
  }, []);

  /**
   * Find peaks with prominence-based detection
   * 
   * Prominence = how much the peak rises above the surrounding baseline
   * Using a simpler approach: prominence = peak_value / average_of_neighbors
   */
  const findPeaksWithProminence = useCallback((
    data: (number | null)[],
    minProminenceRatio: number,
    minDistanceFrames: number
  ): Array<{ index: number; value: number; prominence: number }> => {
    // Get valid (non-null) data points
    const validData = data.filter((v): v is number => v !== null);
    if (validData.length < 5) {
      detectionLogger.warn(`Not enough valid data points: ${validData.length}`);
      return [];
    }
    
    // Calculate baseline (median of all values)
    const sorted = [...validData].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
    
    detectionLogger.info(`📊 Peak detection - ${data.length} frames, ${validData.length} valid`);
    detectionLogger.info(`   Median: ${median.toFixed(1)}, Mean: ${mean.toFixed(1)}, Max: ${Math.max(...validData).toFixed(1)}`);
    
    // Find all local maxima
    const peaks: Array<{ index: number; value: number }> = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const curr = data[i];
      if (curr === null) continue;
      
      // Check if it's a local maximum (higher than 2 neighbors on each side)
      let isMax = true;
      for (let j = -2; j <= 2; j++) {
        if (j === 0) continue;
        const neighbor = data[i + j];
        if (neighbor !== null && neighbor >= curr) {
          isMax = false;
          break;
        }
      }
      
      if (isMax && curr > median) {
        peaks.push({ index: i, value: curr });
      }
    }
    
    detectionLogger.info(`   Found ${peaks.length} local maxima above median`);
    
    // Calculate prominence as ratio to median baseline
    const peaksWithProminence = peaks.map(peak => {
      // Use local neighborhood average as baseline (±10 frames, excluding the peak area)
      let localSum = 0;
      let localCount = 0;
      for (let j = peak.index - 15; j <= peak.index + 15; j++) {
        if (j >= 0 && j < data.length && Math.abs(j - peak.index) > 3) {
          const val = data[j];
          if (val !== null) {
            localSum += val;
            localCount++;
          }
        }
      }
      const localBaseline = localCount > 0 ? localSum / localCount : median;
      const prominence = localBaseline > 0 ? peak.value / localBaseline : peak.value;
      
      return { index: peak.index, value: peak.value, prominence, baseline: localBaseline };
    });
    
    // Log top peaks
    const topPeaks = [...peaksWithProminence].sort((a, b) => b.value - a.value).slice(0, 10);
    detectionLogger.info(`   Top peaks by value:`);
    topPeaks.forEach((p, i) => {
      detectionLogger.info(`     ${i + 1}. Frame ${p.index}: ${p.value.toFixed(1)} (${p.prominence.toFixed(2)}x baseline ${p.baseline.toFixed(1)})`);
    });
    
    // Filter by prominence ratio
    const significantPeaks = peaksWithProminence.filter(
      p => p.prominence >= minProminenceRatio
    );
    
    detectionLogger.info(`   ${significantPeaks.length} peaks above ${minProminenceRatio}x prominence threshold`);
    
    // Sort by value (highest first) for greedy selection
    significantPeaks.sort((a, b) => b.value - a.value);
    
    // Greedy selection with minimum distance
    const selectedPeaks: Array<{ index: number; value: number; prominence: number }> = [];
    
    for (const peak of significantPeaks) {
      const isFarEnough = selectedPeaks.every(
        selected => Math.abs(peak.index - selected.index) >= minDistanceFrames
      );
      
      if (isFarEnough) {
        selectedPeaks.push(peak);
      }
    }
    
    detectionLogger.info(`   ${selectedPeaks.length} peaks after distance filter (${minDistanceFrames} frames min)`);
    
    // Sort chronologically
    selectedPeaks.sort((a, b) => a.index - b.index);
    
    return selectedPeaks;
  }, []);

  /**
   * Main detection function
   */
  const detectSwings = useCallback(async (
    config: Partial<SwingDetectionV2Config> = {}
  ): Promise<SwingDetectionResultV2 | null> => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available. Please preprocess the video first.");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const indices = getKeypointIndices();
      const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
      
      if (frames.length < 3) {
        throw new Error("Need at least 3 frames for acceleration analysis");
      }

      detectionLogger.info(`🎾 Swing Detection V2 (Acceleration) - Analyzing ${frames.length} frames`);
      detectionLogger.info(`   Frame range: ${frames[0]} to ${frames[frames.length - 1]} (${(frames[frames.length - 1] / videoFPS).toFixed(2)}s at ${videoFPS}fps)`);

      // Calculate velocity and acceleration
      const frameData: SwingDataPointV2[] = [];
      const velocities: (number | null)[] = [];
      
      const radialVelocities: (number | null)[] = [];
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        
        if (!pose) {
          frameData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: null,
            acceleration: null,
            bodyCenter: null,
            radialVelocity: null,
          });
          velocities.push(null);
          radialVelocities.push(null);
          continue;
        }

        const bodyCenter = getBodyCenter(pose, indices, cfg.minConfidence);
        
        if (i === 0 || !bodyCenter) {
          frameData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: i === 0 ? 0 : null,
            acceleration: null,
            bodyCenter,
            radialVelocity: i === 0 ? 0 : null,
          });
          velocities.push(i === 0 ? 0 : null);
          radialVelocities.push(i === 0 ? 0 : null);
          continue;
        }

        // Get previous frame
        const prevFrame = frames[i - 1];
        const prevPoses = preprocessedPoses.get(prevFrame);
        const prevPose = prevPoses?.[selectedPoseIndex];
        const prevBodyCenter = prevPose ? getBodyCenter(prevPose, indices, cfg.minConfidence) : null;

        if (!prevPose || !prevBodyCenter) {
          frameData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: null,
            acceleration: null,
            bodyCenter,
            radialVelocity: null,
          });
          velocities.push(null);
          radialVelocities.push(null);
          continue;
        }

        // Calculate combined wrist velocity and radial velocity
        let totalVelocity = 0;
        let totalRadialVelocity = 0;
        let wristCount = 0;

        for (const wristIdx of [indices.leftWrist, indices.rightWrist]) {
          const wrist = pose.keypoints[wristIdx];
          const prevWrist = prevPose.keypoints[wristIdx];
          
          if (wrist && prevWrist &&
              (wrist.score ?? 0) >= cfg.minConfidence &&
              (prevWrist.score ?? 0) >= cfg.minConfidence) {
            
            // Relative positions
            const currRelX = wrist.x - bodyCenter.x;
            const currRelY = wrist.y - bodyCenter.y;
            const prevRelX = prevWrist.x - prevBodyCenter.x;
            const prevRelY = prevWrist.y - prevBodyCenter.y;
            
            // Velocity vector
            const dx = currRelX - prevRelX;
            const dy = currRelY - prevRelY;
            const vel = Math.sqrt(dx * dx + dy * dy);
            
            // Radial velocity (positive = outward, negative = inward)
            const radialDist = Math.sqrt(currRelX * currRelX + currRelY * currRelY);
            let radialVel = 0;
            if (radialDist > 1) {
              // Radial direction (normalized)
              const radialX = currRelX / radialDist;
              const radialY = currRelY / radialDist;
              // Dot product of velocity with radial direction
              radialVel = dx * radialX + dy * radialY;
            }
            
            totalVelocity += vel;
            totalRadialVelocity += radialVel;
            wristCount++;
          }
        }

        const velocity = wristCount > 0 ? totalVelocity : null;
        const radialVelocity = wristCount > 0 ? totalRadialVelocity : null;
        
        frameData.push({
          frame,
          timestamp: frame / videoFPS,
          velocity,
          acceleration: null, // Will calculate after
          bodyCenter,
          radialVelocity,
        });
        velocities.push(velocity);
        radialVelocities.push(radialVelocity);
      }

      // Log velocity stats
      const validVelocities = velocities.filter((v): v is number => v !== null);
      detectionLogger.info(`📊 Velocity calculation:`);
      detectionLogger.info(`   ${validVelocities.length}/${velocities.length} frames with valid velocity`);
      if (validVelocities.length > 0) {
        detectionLogger.info(`   Max velocity: ${Math.max(...validVelocities).toFixed(1)} px/frame`);
        detectionLogger.info(`   Avg velocity: ${(validVelocities.reduce((a, b) => a + b, 0) / validVelocities.length).toFixed(1)} px/frame`);
      }
      
      // Smooth velocities
      const smoothedVelocities = smoothData(velocities, cfg.smoothingWindow);
      
      // Calculate acceleration (change in velocity)
      const accelerations: (number | null)[] = [null]; // First frame has no acceleration
      
      for (let i = 1; i < smoothedVelocities.length; i++) {
        const curr = smoothedVelocities[i];
        const prev = smoothedVelocities[i - 1];
        
        if (curr !== null && prev !== null) {
          accelerations.push(Math.abs(curr - prev)); // Absolute acceleration
        } else {
          accelerations.push(null);
        }
      }
      
      // Smooth accelerations
      const smoothedAccelerations = smoothData(accelerations, cfg.smoothingWindow);
      
      // Log acceleration stats before peak detection
      const validAccelsBefore = accelerations.filter((a): a is number => a !== null);
      detectionLogger.info(`📊 Acceleration calculation:`);
      detectionLogger.info(`   ${validAccelsBefore.length}/${accelerations.length} frames with valid acceleration`);
      if (validAccelsBefore.length > 0) {
        detectionLogger.info(`   Max accel (raw): ${Math.max(...validAccelsBefore).toFixed(1)} px/frame²`);
      }
      
      // Update frame data with acceleration
      for (let i = 0; i < frameData.length; i++) {
        frameData[i].acceleration = smoothedAccelerations[i];
        frameData[i].velocity = smoothedVelocities[i];
      }

      // Find peaks using prominence
      const minDistanceFrames = Math.round(cfg.minPeakDistanceSeconds * videoFPS);
      const peaks = findPeaksWithProminence(
        smoothedAccelerations,
        cfg.minProminenceRatio,
        minDistanceFrames
      );

      // Log stats
      const validAccels = smoothedAccelerations.filter((a): a is number => a !== null);
      const maxAccel = validAccels.length > 0 ? Math.max(...validAccels) : 0;
      const avgAccel = validAccels.length > 0 
        ? validAccels.reduce((a, b) => a + b, 0) / validAccels.length 
        : 0;

      detectionLogger.info(`📊 Acceleration Analysis:`);
      detectionLogger.info(`   Max: ${maxAccel.toFixed(1)} px/frame²`);
      detectionLogger.info(`   Avg: ${avgAccel.toFixed(1)} px/frame²`);
      detectionLogger.info(`   Min prominence ratio: ${cfg.minProminenceRatio}x`);
      detectionLogger.info(`   Min distance: ${cfg.minPeakDistanceSeconds}s (${minDistanceFrames} frames)`);
      detectionLogger.info(`   Direction filter: ${cfg.requireOutwardMotion ? `enabled (radial >= ${cfg.minRadialVelocity})` : "disabled"}`);

      // Log all peaks found before filtering
      detectionLogger.info(`📍 All peaks found (${peaks.length}):`);
      peaks.forEach((peak, i) => {
        const actualFrame = frames[peak.index];
        const radialVel = frameData[peak.index].radialVelocity;
        detectionLogger.info(`   ${i + 1}. idx=${peak.index} frame=${actualFrame} (${(actualFrame / videoFPS).toFixed(2)}s) accel=${peak.value.toFixed(1)} radial=${radialVel?.toFixed(2) ?? 'null'}`);
      });

      // Filter by direction: check radial velocity BEFORE the peak (approach phase)
      // At peak acceleration, the velocity is crossing zero, so we need to look at the approach
      let filteredPeaks = peaks;
      if (cfg.requireOutwardMotion) {
        const lookbackFrames = 8; // Check 8 frames before the peak
        const beforeCount = peaks.length;
        
        filteredPeaks = peaks.filter(peak => {
          // Calculate average radial velocity in the approach phase (before peak)
          let sumRadial = 0;
          let countRadial = 0;
          
          for (let i = peak.index - lookbackFrames; i < peak.index; i++) {
            if (i >= 0 && i < frameData.length) {
              const radial = frameData[i].radialVelocity;
              if (radial !== null) {
                sumRadial += radial;
                countRadial++;
              }
            }
          }
          
          // If we can't measure the approach phase, accept the peak
          if (countRadial === 0) return true;
          
          const avgApproachRadial = sumRadial / countRadial;
          const isOutward = avgApproachRadial >= cfg.minRadialVelocity;
          
          const actualFrame = frames[peak.index];
          const peakRadial = frameData[peak.index].radialVelocity;
          
          if (!isOutward) {
            detectionLogger.info(`   ↩️ Filtered idx=${peak.index} frame=${actualFrame}: approach radial=${avgApproachRadial.toFixed(2)} (peak radial=${peakRadial?.toFixed(2) ?? 'null'}) → recovery`);
          } else {
            detectionLogger.info(`   ✓ Keeping idx=${peak.index} frame=${actualFrame}: approach radial=${avgApproachRadial.toFixed(2)} (peak radial=${peakRadial?.toFixed(2) ?? 'null'}) → outward swing`);
          }
          
          return isOutward;
        });
        
        const discarded = beforeCount - filteredPeaks.length;
        if (discarded > 0) {
          detectionLogger.info(`   ↩️ Discarded ${discarded} peak(s) with inward approach (recovery movements)`);
        }
      }

      // Build swing results
      const swings: DetectedSwingV2[] = filteredPeaks.map(peak => ({
        frame: frames[peak.index],
        timestamp: frames[peak.index] / videoFPS,
        acceleration: peak.value,
        velocity: frameData[peak.index].velocity ?? 0,
        prominence: peak.prominence,
        confidence: Math.min(1, (peak.prominence - 1) / 2), // Normalize: 1.5x = 0.25, 3x = 1.0
      }));

      // Log results
      detectionLogger.info(`⚡ Detected ${swings.length} swings (V2) from ${filteredPeaks.length} filtered peaks:`);
      swings.forEach((swing, i) => {
        detectionLogger.info(`   ${i + 1}. Frame ${swing.frame} (${swing.timestamp.toFixed(2)}s) - accel: ${swing.acceleration.toFixed(1)} px/frame², prominence: ${swing.prominence.toFixed(2)}x`);
      });

      const analysisResult: SwingDetectionResultV2 = {
        swings,
        frameData,
        totalSwings: swings.length,
        maxAcceleration: maxAccel,
        framesAnalyzed: frames.length,
        videoDuration: frames.length / videoFPS,
      };

      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      detectionLogger.error(`Swing detection V2 failed: ${message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    preprocessedPoses,
    videoFPS,
    selectedPoseIndex,
    getKeypointIndices,
    getBodyCenter,
    smoothData,
    findPeaksWithProminence,
  ]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    detectSwings,
    clearResult,
    hasPreprocessedData: preprocessedPoses.size > 0,
  };
}

