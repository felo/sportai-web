import { useState, useCallback } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import { DEFAULT_PERSON_HEIGHT_METERS } from "../constants";

/**
 * A detected swing in the video
 */
export interface DetectedSwing {
  frame: number;
  timestamp: number;           // seconds
  velocity: number;            // combined wrist velocity (px/frame)
  velocityKmh: number;         // estimated real-world speed
  dominantSide: "left" | "right" | "both";
  symmetry: number;            // 0-1, high = two-handed
  confidence: number;          // peak prominence
  leftVelocity: number;
  rightVelocity: number;
}

/**
 * Per-frame velocity data
 */
export interface SwingVelocityDataPoint {
  frame: number;
  timestamp: number;
  velocity: number | null;     // null when joint missing
  leftVelocity: number | null;
  rightVelocity: number | null;
  bodyCenter: { x: number; y: number } | null;
  /** Radial velocity: positive = extending outward (swing), negative = retracting (recovery) */
  radialVelocity: number | null;
}

/**
 * Complete swing detection result
 */
export interface SwingDetectionResult {
  // All detected swings
  swings: DetectedSwing[];
  
  // Velocity time-series for graphing
  velocityData: SwingVelocityDataPoint[];
  
  // Summary stats
  totalSwings: number;
  averageVelocity: number;
  maxVelocity: number;
  
  // Metadata
  framesAnalyzed: number;
  framesWithGaps: number;
  videoDuration: number;
  analysisTimestamp: string;
}

interface UseSwingDetectionProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

interface SwingDetectionConfig {
  /** 
   * Non-maximum suppression window (seconds, forward AND backward).
   * If multiple peaks within this window, only keep the highest.
   * E.g., 1.25 means ±1.25s = 2.5s total window
   */
  nmsWindowSeconds: number;
  /**
   * Minimum required distance between consecutive detected swings (seconds).
   * Any swing detected between two valid swings (within this gap) is discarded.
   * This ensures realistic timing between swings.
   */
  minPeakDistanceSeconds: number;
  /**
   * Minimum velocity ratio relative to the best swing.
   * Swings with velocity < (bestVelocity * minVelocityRatio) are discarded.
   * E.g., 0.33 means swings must be at least 1/3 of the best swing's velocity.
   */
  minVelocityRatio: number;
  /**
   * Filter by radial direction: only keep swings where wrists move outward (extension).
   * Swings with negative radial velocity (wrists moving towards body) are discarded
   * as they likely represent recovery movements, not actual swings.
   */
  requireOutwardMotion: boolean;
  /**
   * Minimum radial velocity (px/frame) to count as outward motion.
   * Small positive values might be noise; require meaningful outward movement.
   */
  minRadialVelocity: number;
  minConfidence: number;           // Keypoint confidence threshold
  smoothingWindow: number;         // Moving average window
  percentileThreshold: number;     // Percentile for peak height threshold (e.g., 75)
}

const DEFAULT_CONFIG: SwingDetectionConfig = {
  nmsWindowSeconds: 1.25,          // ±1.25s window for non-maximum suppression
  minPeakDistanceSeconds: 1.5,     // At least 1.5s between consecutive swings
  minVelocityRatio: 0.33,          // Discard if velocity < 1/3 of best swing
  requireOutwardMotion: true,      // Only keep swings with outward wrist motion
  minRadialVelocity: 1.0,          // Minimum outward velocity (px/frame) to count as swing
  minConfidence: 0.3,
  smoothingWindow: 3,
  percentileThreshold: 75,
};

/**
 * Hook to detect multiple swings in a video using wrist velocity peaks
 * 
 * Key features:
 * - Velocity calculated relative to body center
 * - Both wrists accumulated
 * - No interpolation when joints are missing
 */
export function useSwingDetection({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseSwingDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwingDetectionResult | null>(null);
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
   * Calculate relative wrist velocity (magnitude)
   */
  const calculateRelativeVelocity = useCallback((
    currPos: { x: number; y: number },
    prevPos: { x: number; y: number },
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number }
  ): number => {
    // Current position relative to body center
    const currRelX = currPos.x - currCenter.x;
    const currRelY = currPos.y - currCenter.y;
    
    // Previous position relative to body center
    const prevRelX = prevPos.x - prevCenter.x;
    const prevRelY = prevPos.y - prevCenter.y;
    
    // Velocity = change in relative position
    const dx = currRelX - prevRelX;
    const dy = currRelY - prevRelY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Calculate radial velocity component (positive = extending outward, negative = retracting)
   * 
   * This measures how much the wrist is moving away from (positive) or towards (negative)
   * the body center. Real swings should have positive radial velocity (extension).
   */
  const calculateRadialVelocity = useCallback((
    currPos: { x: number; y: number },
    prevPos: { x: number; y: number },
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number }
  ): number => {
    // Current and previous positions relative to body center
    const currRelX = currPos.x - currCenter.x;
    const currRelY = currPos.y - currCenter.y;
    const prevRelX = prevPos.x - prevCenter.x;
    const prevRelY = prevPos.y - prevCenter.y;
    
    // Velocity vector (change in relative position)
    const velX = currRelX - prevRelX;
    const velY = currRelY - prevRelY;
    
    // Radial direction (from body center to current wrist position, normalized)
    const radialDist = Math.sqrt(currRelX * currRelX + currRelY * currRelY);
    if (radialDist < 1) return 0; // Too close to center, undefined direction
    
    const radialX = currRelX / radialDist;
    const radialY = currRelY / radialDist;
    
    // Radial velocity = dot product of velocity with radial direction
    // Positive = moving away from body, Negative = moving towards body
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
   * Find peaks in velocity data with non-maximum suppression and velocity-greedy distance enforcement
   * 
   * Steps:
   * 1. Find all local maxima above minHeight
   * 2. Apply NMS: within ±nmsWindowFrames, keep only the highest peak
   * 3. Enforce minimum distance using VELOCITY-GREEDY selection:
   *    - Process by velocity (highest first)
   *    - Keep if ≥minDistanceFrames from ALL already-kept peaks
   *    - This ensures high-velocity peaks are never discarded in favor of lower ones
   * 4. Filter by velocity ratio: discard peaks with velocity < bestVelocity * minVelocityRatio
   */
  const findPeaks = useCallback((
    data: (number | null)[],
    minHeight: number,
    nmsWindowFrames: number,
    minDistanceFrames: number,
    minVelocityRatio: number
  ): number[] => {
    // Step 1: Find all local maxima above threshold
    const candidates: Array<{ index: number; value: number }> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const curr = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];
      
      if (curr === null || prev === null || next === null) continue;
      
      // Check if it's a local maximum above threshold
      if (curr > prev && curr > next && curr >= minHeight) {
        candidates.push({ index: i, value: curr });
      }
    }
    
    if (candidates.length === 0) return [];
    
    // Step 2: Sort candidates by value (highest first)
    candidates.sort((a, b) => b.value - a.value);
    
    // Step 3: Apply non-maximum suppression
    // Keep a peak only if there's no higher peak within ±nmsWindowFrames
    const nmsKept: Array<{ index: number; value: number }> = [];
    const suppressed = new Set<number>();
    
    for (const candidate of candidates) {
      if (suppressed.has(candidate.index)) continue;
      
      // This is the highest peak in its neighborhood, keep it
      nmsKept.push(candidate);
      
      // Suppress all other candidates within the window
      for (const other of candidates) {
        if (other.index === candidate.index) continue;
        
        const distance = Math.abs(other.index - candidate.index);
        if (distance <= nmsWindowFrames) {
          suppressed.add(other.index);
        }
      }
    }
    
    // Step 4: Enforce minimum distance using VELOCITY-GREEDY selection
    // Process by velocity (highest first), keep if ≥minDistance from ALL kept peaks
    // This ensures high-velocity peaks are prioritized over lower ones
    const distanceFiltered: Array<{ index: number; value: number }> = [];
    
    // nmsKept is already sorted by velocity (highest first)
    for (const peak of nmsKept) {
      // Check if this peak is far enough from ALL already-kept peaks
      const isFarEnough = distanceFiltered.every(
        kept => Math.abs(peak.index - kept.index) >= minDistanceFrames
      );
      
      if (isFarEnough) {
        distanceFiltered.push(peak);
      }
      // else: discard (too close to a higher-velocity peak we already kept)
    }
    
    // Step 5: Filter by velocity ratio relative to the best swing
    // Discard swings with velocity < bestVelocity * minVelocityRatio
    if (distanceFiltered.length === 0) return [];
    
    const bestVelocity = distanceFiltered[0].value; // First is highest (sorted)
    const velocityThreshold = bestVelocity * minVelocityRatio;
    
    const finalPeaks = distanceFiltered
      .filter(peak => peak.value >= velocityThreshold)
      .map(peak => peak.index);
    
    // Sort by frame index for chronological output
    finalPeaks.sort((a, b) => a - b);
    
    return finalPeaks;
  }, []);

  /**
   * Calculate percentile of non-null values
   */
  const percentile = useCallback((data: (number | null)[], p: number): number => {
    const valid = data.filter((v): v is number => v !== null).sort((a, b) => a - b);
    if (valid.length === 0) return 0;
    
    const idx = Math.floor(valid.length * p / 100);
    return valid[Math.min(idx, valid.length - 1)];
  }, []);

  /**
   * Convert pixel velocity to km/h estimate
   */
  const pixelToKmh = useCallback((
    pixelVelocity: number,
    personHeightPx: number,
    fps: number
  ): number => {
    const pixelsPerMeter = personHeightPx / DEFAULT_PERSON_HEIGHT_METERS;
    const metersPerFrame = pixelVelocity / pixelsPerMeter;
    const metersPerSecond = metersPerFrame * fps;
    return metersPerSecond * 3.6;
  }, []);

  /**
   * Main analysis function
   */
  const detectSwings = useCallback(async (
    config: Partial<SwingDetectionConfig> = {}
  ): Promise<SwingDetectionResult | null> => {
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
      
      if (frames.length < 2) {
        throw new Error("Need at least 2 frames for velocity analysis");
      }

      detectionLogger.info(`🎾 Swing Detection - Analyzing ${frames.length} frames (${(frames.length / videoFPS).toFixed(1)}s @ ${videoFPS}fps)`);

      // Calculate velocity data
      const velocityData: SwingVelocityDataPoint[] = [];
      let framesWithGaps = 0;
      let personHeightPx = 200; // Default estimate

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        
        if (!pose) {
          velocityData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: null,
            leftVelocity: null,
            rightVelocity: null,
            bodyCenter: null,
            radialVelocity: null,
          });
          framesWithGaps++;
          continue;
        }

        // Get body center
        const bodyCenter = getBodyCenter(pose, indices, cfg.minConfidence);
        
        if (i === 0 || !bodyCenter) {
          velocityData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: i === 0 ? 0 : null,
            leftVelocity: i === 0 ? 0 : null,
            rightVelocity: i === 0 ? 0 : null,
            bodyCenter,
            radialVelocity: i === 0 ? 0 : null,
          });
          if (!bodyCenter) framesWithGaps++;
          continue;
        }

        // Get previous frame data
        const prevFrame = frames[i - 1];
        const prevPoses = preprocessedPoses.get(prevFrame);
        const prevPose = prevPoses?.[selectedPoseIndex];
        const prevBodyCenter = prevPose ? getBodyCenter(prevPose, indices, cfg.minConfidence) : null;

        if (!prevPose || !prevBodyCenter) {
          velocityData.push({
            frame,
            timestamp: frame / videoFPS,
            velocity: null,
            leftVelocity: null,
            rightVelocity: null,
            bodyCenter,
            radialVelocity: null,
          });
          framesWithGaps++;
          continue;
        }

        // Update person height estimate
        const leftShoulder = pose.keypoints[indices.leftShoulder];
        const leftHip = pose.keypoints[indices.leftHip];
        if (leftShoulder && leftHip && 
            (leftShoulder.score ?? 0) >= cfg.minConfidence && 
            (leftHip.score ?? 0) >= cfg.minConfidence) {
          personHeightPx = Math.abs(leftHip.y - leftShoulder.y) * 2.5;
        }

        // Calculate left wrist velocity and radial velocity
        let leftVelocity: number | null = null;
        let leftRadialVelocity: number | null = null;
        const leftWrist = pose.keypoints[indices.leftWrist];
        const prevLeftWrist = prevPose.keypoints[indices.leftWrist];
        
        if (leftWrist && prevLeftWrist &&
            (leftWrist.score ?? 0) >= cfg.minConfidence &&
            (prevLeftWrist.score ?? 0) >= cfg.minConfidence) {
          leftVelocity = calculateRelativeVelocity(
            leftWrist, prevLeftWrist, bodyCenter, prevBodyCenter
          );
          leftRadialVelocity = calculateRadialVelocity(
            leftWrist, prevLeftWrist, bodyCenter, prevBodyCenter
          );
        }

        // Calculate right wrist velocity and radial velocity
        let rightVelocity: number | null = null;
        let rightRadialVelocity: number | null = null;
        const rightWrist = pose.keypoints[indices.rightWrist];
        const prevRightWrist = prevPose.keypoints[indices.rightWrist];
        
        if (rightWrist && prevRightWrist &&
            (rightWrist.score ?? 0) >= cfg.minConfidence &&
            (prevRightWrist.score ?? 0) >= cfg.minConfidence) {
          rightVelocity = calculateRelativeVelocity(
            rightWrist, prevRightWrist, bodyCenter, prevBodyCenter
          );
          rightRadialVelocity = calculateRadialVelocity(
            rightWrist, prevRightWrist, bodyCenter, prevBodyCenter
          );
        }

        // Combined velocity (sum of both wrists)
        let combinedVelocity: number | null = null;
        if (leftVelocity !== null || rightVelocity !== null) {
          combinedVelocity = (leftVelocity ?? 0) + (rightVelocity ?? 0);
        }

        // Combined radial velocity (sum of both wrists)
        // Positive = extending outward (swing), Negative = retracting (recovery)
        let combinedRadialVelocity: number | null = null;
        if (leftRadialVelocity !== null || rightRadialVelocity !== null) {
          combinedRadialVelocity = (leftRadialVelocity ?? 0) + (rightRadialVelocity ?? 0);
        }

        velocityData.push({
          frame,
          timestamp: frame / videoFPS,
          velocity: combinedVelocity,
          leftVelocity,
          rightVelocity,
          bodyCenter,
          radialVelocity: combinedRadialVelocity,
        });
      }

      // Log tracking stats
      const validFrames = velocityData.filter(d => d.velocity !== null).length;
      const leftValid = velocityData.filter(d => d.leftVelocity !== null).length;
      const rightValid = velocityData.filter(d => d.rightVelocity !== null).length;
      
      detectionLogger.info(`   Body center tracking: ${((validFrames / frames.length) * 100).toFixed(1)}% frames valid`);
      detectionLogger.info(`   Left wrist tracking: ${((leftValid / frames.length) * 100).toFixed(1)}% frames valid`);
      detectionLogger.info(`   Right wrist tracking: ${((rightValid / frames.length) * 100).toFixed(1)}% frames valid`);

      // Apply smoothing
      const rawVelocities = velocityData.map(d => d.velocity);
      const smoothedVelocities = smoothData(rawVelocities, cfg.smoothingWindow);
      
      // Update velocity data with smoothed values
      for (let i = 0; i < velocityData.length; i++) {
        if (smoothedVelocities[i] !== null) {
          velocityData[i].velocity = smoothedVelocities[i];
        }
      }

      // Calculate threshold for peak detection
      const minPeakHeight = percentile(smoothedVelocities, cfg.percentileThreshold);
      // NMS window: ±1.25s means if multiple peaks are within 1.25s of each other, keep only highest
      const nmsWindowFrames = Math.round(cfg.nmsWindowSeconds * videoFPS);
      // Minimum distance: at least 1.5s between swings (velocity-greedy: highest peaks kept first)
      const minDistanceFrames = Math.round(cfg.minPeakDistanceSeconds * videoFPS);
      
      detectionLogger.info(`📊 Velocity Analysis:`);
      detectionLogger.info(`   Max velocity: ${Math.max(...smoothedVelocities.filter((v): v is number => v !== null)).toFixed(1)} px/frame`);
      detectionLogger.info(`   Mean velocity: ${(smoothedVelocities.filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) / validFrames).toFixed(1)} px/frame`);
      detectionLogger.info(`   ${cfg.percentileThreshold}th percentile threshold: ${minPeakHeight.toFixed(1)} px/frame`);
      detectionLogger.info(`   NMS window: ±${cfg.nmsWindowSeconds}s (${nmsWindowFrames} frames)`);
      detectionLogger.info(`   Min peak distance: ${cfg.minPeakDistanceSeconds}s (${minDistanceFrames} frames)`);
      detectionLogger.info(`   Min velocity ratio: ${(cfg.minVelocityRatio * 100).toFixed(0)}% of best swing`);
      detectionLogger.info(`   Direction filter: ${cfg.requireOutwardMotion ? `enabled (radial velocity >= ${cfg.minRadialVelocity} px/frame)` : "disabled"}`);

      // Find peaks with non-maximum suppression, distance enforcement, and velocity ratio filter
      const peakIndices = findPeaks(smoothedVelocities, minPeakHeight, nmsWindowFrames, minDistanceFrames, cfg.minVelocityRatio);
      
      // Filter by direction: only keep peaks with sufficient outward radial velocity
      let filteredPeakIndices = peakIndices;
      if (cfg.requireOutwardMotion) {
        const beforeCount = peakIndices.length;
        filteredPeakIndices = peakIndices.filter(idx => {
          const radialVel = velocityData[idx].radialVelocity;
          // Keep if radial velocity >= threshold (meaningful outward motion) or null (can't determine)
          return radialVel === null || radialVel >= cfg.minRadialVelocity;
        });
        const discarded = beforeCount - filteredPeakIndices.length;
        if (discarded > 0) {
          detectionLogger.info(`   ↩️ Discarded ${discarded} peak(s) with insufficient outward motion`);
        }
      }
      
      // Build swing results
      const swings: DetectedSwing[] = filteredPeakIndices.map((idx, i) => {
        const data = velocityData[idx];
        const leftVel = data.leftVelocity ?? 0;
        const rightVel = data.rightVelocity ?? 0;
        const total = leftVel + rightVel;
        
        // Determine dominant side
        let dominantSide: "left" | "right" | "both";
        const symmetry = total > 0 ? Math.min(leftVel, rightVel) / Math.max(leftVel, rightVel) : 0;
        
        if (symmetry > 0.7) {
          dominantSide = "both";
        } else {
          dominantSide = leftVel > rightVel ? "left" : "right";
        }

        // Calculate confidence from peak prominence
        const peakValue = data.velocity ?? 0;
        const confidence = Math.min(1, peakValue / (minPeakHeight * 2));

        return {
          frame: data.frame,
          timestamp: data.timestamp,
          velocity: peakValue,
          velocityKmh: pixelToKmh(peakValue, personHeightPx, videoFPS),
          dominantSide,
          symmetry,
          confidence,
          leftVelocity: leftVel,
          rightVelocity: rightVel,
        };
      });

      // Log detected swings
      detectionLogger.info(`⚡ Detected ${swings.length} swings:`);
      swings.forEach((swing, i) => {
        const sideStr = swing.dominantSide === "both" 
          ? `Both (${swing.symmetry.toFixed(2)} symmetry)` 
          : `${swing.dominantSide.charAt(0).toUpperCase() + swing.dominantSide.slice(1)}-handed`;
        detectionLogger.info(`   ${i + 1}. Frame ${swing.frame} (${swing.timestamp.toFixed(2)}s) - ${sideStr}, ${swing.velocityKmh.toFixed(1)} km/h`);
      });

      // Build result
      const validVelocities = velocityData.filter(d => d.velocity !== null).map(d => d.velocity!);
      const analysisResult: SwingDetectionResult = {
        swings,
        velocityData,
        totalSwings: swings.length,
        averageVelocity: validVelocities.length > 0 
          ? validVelocities.reduce((a, b) => a + b, 0) / validVelocities.length 
          : 0,
        maxVelocity: validVelocities.length > 0 ? Math.max(...validVelocities) : 0,
        framesAnalyzed: frames.length,
        framesWithGaps,
        videoDuration: frames.length / videoFPS,
        analysisTimestamp: new Date().toISOString(),
      };

      setResult(analysisResult);
      detectionLogger.info(`✅ Swing detection complete`);
      
      return analysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error during swing detection";
      setError(message);
      detectionLogger.error(`Swing detection failed: ${message}`);
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
    calculateRelativeVelocity,
    calculateRadialVelocity,
    smoothData,
    findPeaks,
    percentile,
    pixelToKmh,
  ]);

  /**
   * Clear results
   */
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

