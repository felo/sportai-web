import { useState, useCallback } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import { DEFAULT_PERSON_HEIGHT_METERS } from "../constants";

/**
 * Per-frame wrist speed data point
 */
export interface WristSpeedDataPoint {
  frame: number;
  timestamp: number; // seconds
  speedKmh: number; // km/h
  speedMs: number; // m/s
  position: { x: number; y: number }; // pixel coordinates
  confidence: number; // keypoint confidence score
}

/**
 * Complete wrist speed analysis result
 */
export interface WristSpeedAnalysisResult {
  // Dominant hand info
  dominantHand: "left" | "right";
  handednessConfidence: number;
  
  // Time-series data for the dominant hand
  speedData: WristSpeedDataPoint[];
  
  // Peak velocity metrics
  peakVelocity: {
    speedKmh: number;
    speedMs: number;
    frame: number;
    timestamp: number;
  };
  
  // Average velocity (excluding stationary moments)
  averageVelocity: {
    speedKmh: number;
    speedMs: number;
  };
  
  // Additional stats
  totalFramesAnalyzed: number;
  videoDuration: number;
  analysisTimestamp: string;
}

interface UseWristSpeedProtocolProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

/**
 * Hook to analyze wrist speed across a video
 * 
 * This protocol:
 * 1. Automatically detects the dominant (more active) hand
 * 2. Calculates frame-by-frame wrist velocity
 * 3. Identifies peak velocity with precise timing
 * 4. Provides time-series data for visualization
 */
export function useWristSpeedProtocol({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseWristSpeedProtocolProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<WristSpeedAnalysisResult | null>(null);
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
   * Calculate pixels per meter using person's detected height
   */
  const calculatePixelsPerMeter = useCallback((pose: PoseDetectionResult): number => {
    let personHeightPx = 0;
    
    if (pose.box) {
      personHeightPx = pose.box.height;
    } else {
      const validKps = pose.keypoints.filter(k => (k.score ?? 0) > 0.3);
      if (validKps.length > 0) {
        const ys = validKps.map(k => k.y);
        personHeightPx = Math.max(...ys) - Math.min(...ys);
      }
    }
    
    // Assume average person height of 1.8m
    return personHeightPx > 0 ? personHeightPx / DEFAULT_PERSON_HEIGHT_METERS : 100;
  }, []);

  /**
   * Detect which hand is dominant (more active) based on total motion
   */
  const detectDominantHand = useCallback((): { 
    dominant: "left" | "right"; 
    confidence: number;
    leftMotion: number;
    rightMotion: number;
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
    
    // Confidence is how different the two are (0 = same, 1 = very different)
    const confidence = Math.abs(rightRatio - 0.5) * 2;
    
    return {
      dominant: rightTotalMotion > leftTotalMotion ? "right" : "left",
      confidence,
      leftMotion: leftTotalMotion,
      rightMotion: rightTotalMotion,
    };
  }, [preprocessedPoses, selectedPoseIndex, getKeypointIndices]);

  /**
   * Calculate wrist speed for all frames
   */
  const calculateWristSpeeds = useCallback((
    dominantHand: "left" | "right"
  ): WristSpeedDataPoint[] => {
    const indices = getKeypointIndices();
    const sortedFrames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    const wristIdx = dominantHand === "right" ? indices.rightWrist : indices.leftWrist;
    
    // Collect wrist positions with frame info
    const wristPositions: Array<{
      frame: number;
      timestamp: number;
      x: number;
      y: number;
      confidence: number;
      pixelsPerMeter: number;
    }> = [];
    
    for (const frame of sortedFrames) {
      const poses = preprocessedPoses.get(frame);
      if (!poses || poses.length <= selectedPoseIndex) continue;
      
      const pose = poses[selectedPoseIndex];
      const wrist = pose.keypoints[wristIdx];
      
      if (wrist && (wrist.score ?? 0) > 0.2) {
        const pixelsPerMeter = calculatePixelsPerMeter(pose);
        wristPositions.push({
          frame,
          timestamp: frame / videoFPS,
          x: wrist.x,
          y: wrist.y,
          confidence: wrist.score ?? 0,
          pixelsPerMeter,
        });
      }
    }
    
    if (wristPositions.length < 2) return [];
    
    // Calculate velocities between consecutive frames
    const speedData: WristSpeedDataPoint[] = [];
    
    // First frame has zero velocity
    speedData.push({
      frame: wristPositions[0].frame,
      timestamp: wristPositions[0].timestamp,
      speedKmh: 0,
      speedMs: 0,
      position: { x: wristPositions[0].x, y: wristPositions[0].y },
      confidence: wristPositions[0].confidence,
    });
    
    for (let i = 1; i < wristPositions.length; i++) {
      const prev = wristPositions[i - 1];
      const curr = wristPositions[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const dt = curr.timestamp - prev.timestamp;
      
      // Average pixels per meter between frames
      const avgPixelsPerMeter = (prev.pixelsPerMeter + curr.pixelsPerMeter) / 2;
      
      let speedMs = 0;
      let speedKmh = 0;
      
      if (dt > 0 && dt < 0.5) { // Ignore gaps > 0.5s (missing frames)
        const distM = distPx / avgPixelsPerMeter;
        speedMs = distM / dt;
        speedKmh = speedMs * 3.6;
        
        // Sanity check - cap at realistic human speeds
        if (speedKmh > 300) {
          speedKmh = 0;
          speedMs = 0;
        }
      }
      
      speedData.push({
        frame: curr.frame,
        timestamp: curr.timestamp,
        speedKmh,
        speedMs,
        position: { x: curr.x, y: curr.y },
        confidence: curr.confidence,
      });
    }
    
    // Apply smoothing (3-frame moving average)
    const smoothedData: WristSpeedDataPoint[] = [];
    
    for (let i = 0; i < speedData.length; i++) {
      const start = Math.max(0, i - 1);
      const end = Math.min(speedData.length - 1, i + 1);
      
      let sumKmh = 0;
      let sumMs = 0;
      let count = 0;
      
      for (let j = start; j <= end; j++) {
        sumKmh += speedData[j].speedKmh;
        sumMs += speedData[j].speedMs;
        count++;
      }
      
      smoothedData.push({
        ...speedData[i],
        speedKmh: sumKmh / count,
        speedMs: sumMs / count,
      });
    }
    
    return smoothedData;
  }, [preprocessedPoses, selectedPoseIndex, getKeypointIndices, videoFPS, calculatePixelsPerMeter]);

  /**
   * Main analysis function
   */
  const analyzeWristSpeed = useCallback(async (
    preferredHand: "left" | "right" | "auto" = "auto"
  ): Promise<WristSpeedAnalysisResult | null> => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available. Please run preprocessing first.");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Detect or use specified dominant hand
      let dominantHand: "left" | "right";
      let handednessConfidence: number;
      
      if (preferredHand === "auto") {
        const handedness = detectDominantHand();
        dominantHand = handedness.dominant;
        handednessConfidence = handedness.confidence;
        
        console.log(`🖐️ Wrist Speed Analysis - Handedness Detection:`);
        console.log(`   Left wrist total motion: ${handedness.leftMotion.toFixed(0)}px`);
        console.log(`   Right wrist total motion: ${handedness.rightMotion.toFixed(0)}px`);
        console.log(`   Dominant hand: ${dominantHand} (${(handednessConfidence * 100).toFixed(0)}% confidence)`);
      } else {
        dominantHand = preferredHand;
        handednessConfidence = 1.0;
        console.log(`🖐️ Wrist Speed Analysis - Using specified ${dominantHand} hand`);
      }
      
      // Step 2: Calculate speeds for all frames
      const speedData = calculateWristSpeeds(dominantHand);
      
      if (speedData.length < 5) {
        setError("Not enough valid pose data. Make sure the player is clearly visible throughout the video.");
        setIsAnalyzing(false);
        return null;
      }
      
      // Step 3: Find peak velocity
      let peakIdx = 0;
      let peakSpeedKmh = 0;
      
      for (let i = 0; i < speedData.length; i++) {
        if (speedData[i].speedKmh > peakSpeedKmh) {
          peakSpeedKmh = speedData[i].speedKmh;
          peakIdx = i;
        }
      }
      
      const peakData = speedData[peakIdx];
      
      // Step 4: Calculate average (excluding very slow movements < 5 km/h)
      const movingSpeeds = speedData.filter(d => d.speedKmh > 5);
      const avgKmh = movingSpeeds.length > 0
        ? movingSpeeds.reduce((sum, d) => sum + d.speedKmh, 0) / movingSpeeds.length
        : 0;
      
      // Calculate video duration
      const lastFrame = Math.max(...speedData.map(d => d.frame));
      const videoDuration = lastFrame / videoFPS;
      
      const analysisResult: WristSpeedAnalysisResult = {
        dominantHand,
        handednessConfidence,
        speedData,
        peakVelocity: {
          speedKmh: peakData.speedKmh,
          speedMs: peakData.speedMs,
          frame: peakData.frame,
          timestamp: peakData.timestamp,
        },
        averageVelocity: {
          speedKmh: avgKmh,
          speedMs: avgKmh / 3.6,
        },
        totalFramesAnalyzed: speedData.length,
        videoDuration,
        analysisTimestamp: new Date().toISOString(),
      };
      
      // Log results
      console.log(`\n📊 Wrist Speed Analysis Results:`);
      console.log(`   Dominant hand: ${dominantHand}`);
      console.log(`   Frames analyzed: ${speedData.length}`);
      console.log(`   Video duration: ${videoDuration.toFixed(2)}s`);
      console.log(`\n⚡ Peak Velocity:`);
      console.log(`   Speed: ${peakData.speedKmh.toFixed(1)} km/h (${peakData.speedMs.toFixed(1)} m/s)`);
      console.log(`   Frame: ${peakData.frame}`);
      console.log(`   Timestamp: ${peakData.timestamp.toFixed(3)}s`);
      console.log(`\n📈 Average Velocity (active motion):`);
      console.log(`   Speed: ${avgKmh.toFixed(1)} km/h (${(avgKmh / 3.6).toFixed(1)} m/s)`);
      
      setResult(analysisResult);
      setIsAnalyzing(false);
      return analysisResult;
      
    } catch (err) {
      console.error("Wrist speed analysis error:", err);
      setError(err instanceof Error ? err.message : "Unknown error during analysis");
      setIsAnalyzing(false);
      return null;
    }
  }, [
    preprocessedPoses,
    detectDominantHand,
    calculateWristSpeeds,
    videoFPS,
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
    analyzeWristSpeed,
    clearResult,
    hasPreprocessedData: preprocessedPoses.size > 0,
  };
}

