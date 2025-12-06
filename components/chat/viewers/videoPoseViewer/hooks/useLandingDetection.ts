import { useState, useCallback } from "react";
import { detectionLogger } from "@/lib/logger";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";

interface FrameData {
  frame: number;
  timestamp: number;
  // Primary Y position (uses lowest point available: ankle preferred, hip as fallback)
  primaryY: number;
  // Source of primaryY data
  ySource: "ankle" | "hip" | "interpolated";
  // Individual keypoints when available
  leftAnkleY: number | null;
  rightAnkleY: number | null;
  leftHipY: number | null;
  rightHipY: number | null;
  // Which foot is lower (for landing foot detection)
  lowerFoot: "left" | "right" | "both" | "unknown";
  // Knee angles (180 = fully extended, lower = more bent)
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  avgKneeAngle: number | null; // Average of both knees
  minKneeAngle: number | null; // Minimum (most bent) of both knees
  // Y-axis velocity (pixels per second, negative = moving up, positive = moving down)
  yVelocity: number;
}

export interface LandingDetectionResult {
  // Landing (feet touch ground after jump)
  landingFrame: number;
  landingTimestamp: number;
  landingFoot: "left" | "right" | "both" | "unknown";
  // Takeoff (feet leave ground)
  takeoffFrame: number;
  takeoffTimestamp: number;
  // Peak jump (highest point)
  peakJumpFrame: number;
  peakJumpTimestamp: number;
  // Jump metrics
  jumpHeight: number; // Normalized 0-1
  airTime: number; // Seconds in the air
  confidence: number;
  // Y-axis velocity metrics (pixels per second)
  peakUpwardVelocity: number; // Maximum upward velocity (negative value, more negative = faster up)
  peakDownwardVelocity: number; // Maximum downward velocity (positive value, more positive = faster down)
  peakUpwardVelocityFrame: number; // Frame at peak upward velocity
  peakDownwardVelocityFrame: number; // Frame at peak downward velocity
  peakUpwardVelocityTimestamp: number;
  peakDownwardVelocityTimestamp: number;
  // Knee bend phases
  loadingFrame: number; // Maximum knee bend before jump (preparation)
  loadingTimestamp: number;
  loadingKneeAngle: number; // Angle at loading (lower = more bent)
  extensionFrame: number; // Maximum knee extension during push-off
  extensionTimestamp: number;
  extensionKneeAngle: number; // Angle at extension (higher = more straight)
  absorptionFrame: number; // When knees start bending again on landing
  absorptionTimestamp: number;
  absorptionKneeAngle: number; // Angle at absorption start
  analysisData: {
    frameData: FrameData[];
  };
}

interface UseLandingDetectionProps {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
}

/**
 * Hook to detect takeoff, peak jump, and landing from pose data
 * 
 * Simplified algorithm:
 * 1. Track Y position of body (ankles preferred, hip as fallback)
 * 2. Find peak jump = minimum Y (highest position in frame)
 * 3. Find takeoff = last ground level before peak
 * 4. Find landing = first ground level after peak
 */
export function useLandingDetection({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
}: UseLandingDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<LandingDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get keypoint indices based on model
  const getKeypointIndices = useCallback(() => {
    if (selectedModel === "BlazePose") {
      return {
        leftHip: 23,
        rightHip: 24,
        leftKnee: 25,
        rightKnee: 26,
        leftAnkle: 27,
        rightAnkle: 28,
      };
    }
    // MoveNet
    return {
      leftHip: 11,
      rightHip: 12,
      leftKnee: 13,
      rightKnee: 14,
      leftAnkle: 15,
      rightAnkle: 16,
    };
  }, [selectedModel]);

  // Calculate angle between three points (in degrees)
  // Returns angle at p2 (the vertex/knee)
  const calculateAngle = useCallback((
    p1: { x: number; y: number },
    p2: { x: number; y: number }, // vertex (knee)
    p3: { x: number; y: number }
  ): number => {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }, []);

  // Extract Y positions and knee angles for each frame
  const extractFrameData = useCallback((): FrameData[] => {
    const indices = getKeypointIndices();
    const sortedFrames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    // Lower confidence threshold to include more data
    const MIN_CONFIDENCE = 0.2;
    
    const frameData: FrameData[] = [];
    
    for (const frame of sortedFrames) {
      const poses = preprocessedPoses.get(frame);
      if (!poses || poses.length <= selectedPoseIndex) continue;
      
      const pose = poses[selectedPoseIndex];
      const kp = pose.keypoints;
      
      // Get individual keypoints with lower confidence threshold
      const leftAnkle = kp[indices.leftAnkle];
      const rightAnkle = kp[indices.rightAnkle];
      const leftHip = kp[indices.leftHip];
      const rightHip = kp[indices.rightHip];
      const leftKnee = kp[indices.leftKnee];
      const rightKnee = kp[indices.rightKnee];
      
      const leftAnkleY = leftAnkle && (leftAnkle.score ?? 0) > MIN_CONFIDENCE ? leftAnkle.y : null;
      const rightAnkleY = rightAnkle && (rightAnkle.score ?? 0) > MIN_CONFIDENCE ? rightAnkle.y : null;
      const leftHipY = leftHip && (leftHip.score ?? 0) > MIN_CONFIDENCE ? leftHip.y : null;
      const rightHipY = rightHip && (rightHip.score ?? 0) > MIN_CONFIDENCE ? rightHip.y : null;
      
      // Calculate knee angles (hip -> knee -> ankle)
      let leftKneeAngle: number | null = null;
      let rightKneeAngle: number | null = null;
      
      // Left knee angle
      if (leftHip && leftKnee && leftAnkle &&
          (leftHip.score ?? 0) > MIN_CONFIDENCE &&
          (leftKnee.score ?? 0) > MIN_CONFIDENCE &&
          (leftAnkle.score ?? 0) > MIN_CONFIDENCE) {
        leftKneeAngle = calculateAngle(
          { x: leftHip.x, y: leftHip.y },
          { x: leftKnee.x, y: leftKnee.y },
          { x: leftAnkle.x, y: leftAnkle.y }
        );
      }
      
      // Right knee angle
      if (rightHip && rightKnee && rightAnkle &&
          (rightHip.score ?? 0) > MIN_CONFIDENCE &&
          (rightKnee.score ?? 0) > MIN_CONFIDENCE &&
          (rightAnkle.score ?? 0) > MIN_CONFIDENCE) {
        rightKneeAngle = calculateAngle(
          { x: rightHip.x, y: rightHip.y },
          { x: rightKnee.x, y: rightKnee.y },
          { x: rightAnkle.x, y: rightAnkle.y }
        );
      }
      
      // Calculate average and minimum knee angles
      let avgKneeAngle: number | null = null;
      let minKneeAngle: number | null = null;
      
      if (leftKneeAngle !== null && rightKneeAngle !== null) {
        avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
        minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
      } else if (leftKneeAngle !== null) {
        avgKneeAngle = leftKneeAngle;
        minKneeAngle = leftKneeAngle;
      } else if (rightKneeAngle !== null) {
        avgKneeAngle = rightKneeAngle;
        minKneeAngle = rightKneeAngle;
      }
      
      // Determine primary Y position (prefer ankles, fall back to hips)
      let primaryY: number;
      let ySource: "ankle" | "hip" | "interpolated";
      let lowerFoot: "left" | "right" | "both" | "unknown" = "unknown";
      
      // Try ankles first (use lowest ankle = highest Y = closest to ground)
      if (leftAnkleY !== null && rightAnkleY !== null) {
        // Both ankles visible
        primaryY = Math.max(leftAnkleY, rightAnkleY);
        ySource = "ankle";
        if (Math.abs(leftAnkleY - rightAnkleY) < 10) {
          lowerFoot = "both";
        } else if (leftAnkleY > rightAnkleY) {
          lowerFoot = "left";
        } else {
          lowerFoot = "right";
        }
      } else if (leftAnkleY !== null) {
        primaryY = leftAnkleY;
        ySource = "ankle";
        lowerFoot = "left";
      } else if (rightAnkleY !== null) {
        primaryY = rightAnkleY;
        ySource = "ankle";
        lowerFoot = "right";
      } else if (leftHipY !== null && rightHipY !== null) {
        // Fall back to hips (use lowest hip)
        primaryY = Math.max(leftHipY, rightHipY);
        ySource = "hip";
      } else if (leftHipY !== null) {
        primaryY = leftHipY;
        ySource = "hip";
      } else if (rightHipY !== null) {
        primaryY = rightHipY;
        ySource = "hip";
      } else {
        // No data for this frame - skip it
        continue;
      }
      
      frameData.push({
        frame,
        timestamp: frame / videoFPS,
        primaryY,
        ySource,
        leftAnkleY,
        rightAnkleY,
        leftHipY,
        rightHipY,
        lowerFoot,
        leftKneeAngle,
        rightKneeAngle,
        avgKneeAngle,
        minKneeAngle,
        yVelocity: 0, // Will be calculated in second pass
      });
    }
    
    // Second pass: calculate Y velocity (pixels per second)
    // Negative velocity = moving up (Y decreases), Positive velocity = moving down (Y increases)
    for (let i = 1; i < frameData.length; i++) {
      const prev = frameData[i - 1];
      const curr = frameData[i];
      const deltaY = curr.primaryY - prev.primaryY;
      const deltaTime = curr.timestamp - prev.timestamp;
      
      if (deltaTime > 0) {
        curr.yVelocity = deltaY / deltaTime;
      }
    }
    
    // Set first frame velocity to same as second frame
    if (frameData.length > 1) {
      frameData[0].yVelocity = frameData[1].yVelocity;
    }
    
    return frameData;
  }, [preprocessedPoses, selectedPoseIndex, getKeypointIndices, videoFPS, calculateAngle]);

  // Smooth Y data, knee angles, and Y velocity using moving average
  const smoothData = useCallback((data: FrameData[], windowSize: number = 5): FrameData[] => {
    if (data.length < windowSize) return data;
    
    const smoothed: FrameData[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length - 1, i + halfWindow);
      
      let sumY = 0;
      let countY = 0;
      let sumYVelocity = 0;
      let countYVelocity = 0;
      let sumLeftKnee = 0;
      let countLeftKnee = 0;
      let sumRightKnee = 0;
      let countRightKnee = 0;
      
      for (let j = start; j <= end; j++) {
        sumY += data[j].primaryY;
        countY++;
        
        sumYVelocity += data[j].yVelocity;
        countYVelocity++;
        
        const leftAngle = data[j].leftKneeAngle;
        const rightAngle = data[j].rightKneeAngle;
        
        if (leftAngle !== null) {
          sumLeftKnee += leftAngle;
          countLeftKnee++;
        }
        if (rightAngle !== null) {
          sumRightKnee += rightAngle;
          countRightKnee++;
        }
      }
      
      const smoothedLeftKnee = countLeftKnee > 0 ? sumLeftKnee / countLeftKnee : data[i].leftKneeAngle;
      const smoothedRightKnee = countRightKnee > 0 ? sumRightKnee / countRightKnee : data[i].rightKneeAngle;
      
      let avgKneeAngle: number | null = null;
      let minKneeAngle: number | null = null;
      
      if (smoothedLeftKnee !== null && smoothedRightKnee !== null) {
        avgKneeAngle = (smoothedLeftKnee + smoothedRightKnee) / 2;
        minKneeAngle = Math.min(smoothedLeftKnee, smoothedRightKnee);
      } else if (smoothedLeftKnee !== null) {
        avgKneeAngle = smoothedLeftKnee;
        minKneeAngle = smoothedLeftKnee;
      } else if (smoothedRightKnee !== null) {
        avgKneeAngle = smoothedRightKnee;
        minKneeAngle = smoothedRightKnee;
      }
      
      smoothed.push({
        ...data[i],
        primaryY: sumY / countY,
        yVelocity: countYVelocity > 0 ? sumYVelocity / countYVelocity : data[i].yVelocity,
        leftKneeAngle: smoothedLeftKnee,
        rightKneeAngle: smoothedRightKnee,
        avgKneeAngle,
        minKneeAngle,
      });
    }
    
    return smoothed;
  }, []);

  // Find takeoff, peak, landing, and knee bend phases
  const findJumpPhases = useCallback((data: FrameData[]): {
    takeoffIdx: number;
    peakIdx: number;
    landingIdx: number;
    jumpHeight: number;
    // Knee bend phases
    loadingIdx: number; // Maximum knee bend before takeoff
    extensionIdx: number; // Maximum knee extension during push-off
    absorptionIdx: number; // When knees start bending on landing
    // Y-axis velocity peaks (between takeoff and landing)
    peakUpwardVelocityIdx: number; // Frame with maximum upward velocity (most negative)
    peakDownwardVelocityIdx: number; // Frame with maximum downward velocity (most positive)
    peakUpwardVelocity: number; // Value of peak upward velocity (negative)
    peakDownwardVelocity: number; // Value of peak downward velocity (positive)
  } | null => {
    if (data.length < 5) {
      detectionLogger.warn(`⚠️ Not enough frame data: ${data.length} < 5`);
      return null;
    }
    
    // Find global minimum Y (peak of jump = highest position in frame)
    let peakIdx = 0;
    let minY = data[0].primaryY;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i].primaryY < minY) {
        minY = data[i].primaryY;
        peakIdx = i;
      }
    }
    
    // Find ground level (max Y at start and end of video)
    const startY = data[0].primaryY;
    const endY = data[data.length - 1].primaryY;
    const groundLevel = Math.max(startY, endY);
    
    // Calculate jump height as percentage of ground-to-peak distance
    const jumpHeightPixels = groundLevel - minY;
    const jumpHeight = jumpHeightPixels / groundLevel; // Normalized
    
    detectionLogger.debug(`🦘 Peak at frame ${data[peakIdx].frame}, Y=${minY.toFixed(0)}`);
    detectionLogger.debug(`   Ground level: ${groundLevel.toFixed(0)}px`);
    detectionLogger.debug(`   Jump height: ${jumpHeightPixels.toFixed(0)}px (${(jumpHeight * 100).toFixed(1)}%)`);
    
    // Warn if jump is very small but don't fail
    if (jumpHeight < 0.05) {
      detectionLogger.warn("⚠️ Very small jump detected (< 5% of frame height)");
    }
    
    // Find takeoff: walk backward from peak, find where Y was at ground level
    let takeoffIdx = 0;
    const groundThreshold = groundLevel * 0.95; // Within 5% of ground level
    
    for (let i = peakIdx - 1; i >= 0; i--) {
      if (data[i].primaryY >= groundThreshold) {
        takeoffIdx = i;
        break;
      }
    }
    
    // Find landing: walk forward from peak, find where Y returns to ground level
    let landingIdx = data.length - 1;
    
    for (let i = peakIdx + 1; i < data.length; i++) {
      if (data[i].primaryY >= groundThreshold) {
        landingIdx = i;
        break;
      }
    }
    
    // === KNEE BEND PHASE DETECTION ===
    
    // 1. LOADING: Find minimum knee angle (maximum bend) BEFORE takeoff
    //    This is the preparation/loading phase
    let loadingIdx = 0;
    let minKneeBeforeTakeoff = 180;
    
    for (let i = 0; i <= takeoffIdx; i++) {
      const angle = data[i].minKneeAngle ?? data[i].avgKneeAngle;
      if (angle !== null && angle < minKneeBeforeTakeoff) {
        minKneeBeforeTakeoff = angle;
        loadingIdx = i;
      }
    }
    
    // 2. EXTENSION: Find maximum knee angle (most straight) between loading and peak
    //    This is the push-off/extension phase
    let extensionIdx = takeoffIdx;
    let maxKneeDuringPushoff = 0;
    
    for (let i = loadingIdx; i <= peakIdx; i++) {
      const angle = data[i].minKneeAngle ?? data[i].avgKneeAngle;
      if (angle !== null && angle > maxKneeDuringPushoff) {
        maxKneeDuringPushoff = angle;
        extensionIdx = i;
      }
    }
    
    // 3. ABSORPTION: Find when knees START bending again after landing
    //    Look for the transition from straight to bent after landing
    let absorptionIdx = landingIdx;
    
    // First find the most straight position around/after landing
    let maxKneeAfterLanding = 0;
    let straightestAfterLandingIdx = landingIdx;
    
    for (let i = landingIdx; i < Math.min(landingIdx + 10, data.length); i++) {
      const angle = data[i].minKneeAngle ?? data[i].avgKneeAngle;
      if (angle !== null && angle > maxKneeAfterLanding) {
        maxKneeAfterLanding = angle;
        straightestAfterLandingIdx = i;
      }
    }
    
    // Then find when it starts bending significantly (5+ degrees from straightest)
    for (let i = straightestAfterLandingIdx; i < data.length; i++) {
      const angle = data[i].minKneeAngle ?? data[i].avgKneeAngle;
      if (angle !== null && (maxKneeAfterLanding - angle) > 5) {
        absorptionIdx = i;
        break;
      }
    }
    
    // If no significant bend found, use the point of minimum angle after landing
    if (absorptionIdx === landingIdx) {
      let minKneeAfterLanding = 180;
      for (let i = landingIdx; i < data.length; i++) {
        const angle = data[i].minKneeAngle ?? data[i].avgKneeAngle;
        if (angle !== null && angle < minKneeAfterLanding) {
          minKneeAfterLanding = angle;
          absorptionIdx = i;
        }
      }
    }
    
    // === Y-AXIS VELOCITY ANALYSIS ===
    // Find peak upward velocity (most negative - going up) between takeoff and peak
    // Find peak downward velocity (most positive - going down) between peak and landing
    
    let peakUpwardVelocityIdx = takeoffIdx;
    let peakUpwardVelocity = 0; // Will be negative (moving up = Y decreasing)
    
    // Search between takeoff and peak for maximum upward velocity
    for (let i = takeoffIdx; i <= peakIdx; i++) {
      const velocity = data[i].yVelocity;
      // More negative = faster upward movement
      if (velocity < peakUpwardVelocity) {
        peakUpwardVelocity = velocity;
        peakUpwardVelocityIdx = i;
      }
    }
    
    let peakDownwardVelocityIdx = peakIdx;
    let peakDownwardVelocity = 0; // Will be positive (moving down = Y increasing)
    
    // Search between peak and landing for maximum downward velocity
    for (let i = peakIdx; i <= landingIdx; i++) {
      const velocity = data[i].yVelocity;
      // More positive = faster downward movement
      if (velocity > peakDownwardVelocity) {
        peakDownwardVelocity = velocity;
        peakDownwardVelocityIdx = i;
      }
    }
    
    detectionLogger.debug(`🚀 Takeoff at frame ${data[takeoffIdx].frame} (Y=${data[takeoffIdx].primaryY.toFixed(0)})`);
    detectionLogger.debug(`🦶 Landing at frame ${data[landingIdx].frame} (Y=${data[landingIdx].primaryY.toFixed(0)})`);
    detectionLogger.debug(`\n📈 Y-Axis Velocity (between takeoff and landing):`);
    detectionLogger.debug(`   ⬆️ Peak upward: ${Math.abs(peakUpwardVelocity).toFixed(0)} px/s at frame ${data[peakUpwardVelocityIdx].frame} (${data[peakUpwardVelocityIdx].timestamp.toFixed(2)}s)`);
    detectionLogger.debug(`   ⬇️ Peak downward: ${peakDownwardVelocity.toFixed(0)} px/s at frame ${data[peakDownwardVelocityIdx].frame} (${data[peakDownwardVelocityIdx].timestamp.toFixed(2)}s)`);
    detectionLogger.debug(`\n🦵 Knee Bend Phases:`);
    detectionLogger.debug(`   📉 Loading (max bend): frame ${data[loadingIdx].frame} - angle ${minKneeBeforeTakeoff.toFixed(0)}°`);
    detectionLogger.debug(`   📈 Extension (push-off): frame ${data[extensionIdx].frame} - angle ${maxKneeDuringPushoff.toFixed(0)}°`);
    detectionLogger.debug(`   📉 Absorption (impact): frame ${data[absorptionIdx].frame} - angle ${(data[absorptionIdx].minKneeAngle ?? data[absorptionIdx].avgKneeAngle ?? 0).toFixed(0)}°`);
    
    return {
      takeoffIdx,
      peakIdx,
      landingIdx,
      jumpHeight,
      loadingIdx,
      extensionIdx,
      absorptionIdx,
      peakUpwardVelocityIdx,
      peakDownwardVelocityIdx,
      peakUpwardVelocity,
      peakDownwardVelocity,
    };
  }, []);

  // Main detection function
  const detectLanding = useCallback(async (): Promise<LandingDetectionResult | null> => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available. Please run preprocessing first.");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Extract Y positions (ankle preferred, hip fallback)
      const rawData = extractFrameData();
      
      const ankleFrames = rawData.filter(d => d.ySource === "ankle").length;
      const hipFrames = rawData.filter(d => d.ySource === "hip").length;
      
      detectionLogger.debug(`🦶 Extracted ${rawData.length} frames: ${ankleFrames} with ankles, ${hipFrames} with hip fallback`);
      
      if (rawData.length < 5) {
        setError(`Not enough pose data (${rawData.length} frames). Make sure the player is visible.`);
        setIsAnalyzing(false);
        return null;
      }
      
      // Step 2: Smooth the data
      const smoothedData = smoothData(rawData, 5);
      
      // Step 3: Find jump phases using simple Y extrema
      const phases = findJumpPhases(smoothedData);
      
      if (!phases) {
        setError("Could not detect jump phases. Make sure the video shows movement.");
        setIsAnalyzing(false);
        return null;
      }
      
      const takeoffData = smoothedData[phases.takeoffIdx];
      const peakData = smoothedData[phases.peakIdx];
      const landingData = smoothedData[phases.landingIdx];
      const loadingData = smoothedData[phases.loadingIdx];
      const extensionData = smoothedData[phases.extensionIdx];
      const absorptionData = smoothedData[phases.absorptionIdx];
      const peakUpwardVelData = smoothedData[phases.peakUpwardVelocityIdx];
      const peakDownwardVelData = smoothedData[phases.peakDownwardVelocityIdx];
      
      // Calculate air time
      const airTime = landingData.timestamp - takeoffData.timestamp;
      
      // Calculate confidence based on data quality
      const ankleRatio = ankleFrames / rawData.length;
      const jumpSignificance = Math.min(1, phases.jumpHeight * 5); // Higher jump = more confident
      const confidence = Math.min(1, 
        0.3 + // Base confidence
        ankleRatio * 0.4 + // More ankle data = more confident
        jumpSignificance * 0.3 // Bigger jump = more confident
      );
      
      const detection: LandingDetectionResult = {
        landingFrame: landingData.frame,
        landingTimestamp: landingData.timestamp,
        landingFoot: landingData.lowerFoot,
        takeoffFrame: takeoffData.frame,
        takeoffTimestamp: takeoffData.timestamp,
        peakJumpFrame: peakData.frame,
        peakJumpTimestamp: peakData.timestamp,
        jumpHeight: phases.jumpHeight,
        airTime,
        confidence,
        // Y-axis velocity metrics
        peakUpwardVelocity: phases.peakUpwardVelocity,
        peakDownwardVelocity: phases.peakDownwardVelocity,
        peakUpwardVelocityFrame: peakUpwardVelData.frame,
        peakDownwardVelocityFrame: peakDownwardVelData.frame,
        peakUpwardVelocityTimestamp: peakUpwardVelData.timestamp,
        peakDownwardVelocityTimestamp: peakDownwardVelData.timestamp,
        // Knee bend phases
        loadingFrame: loadingData.frame,
        loadingTimestamp: loadingData.timestamp,
        loadingKneeAngle: loadingData.minKneeAngle ?? loadingData.avgKneeAngle ?? 0,
        extensionFrame: extensionData.frame,
        extensionTimestamp: extensionData.timestamp,
        extensionKneeAngle: extensionData.minKneeAngle ?? extensionData.avgKneeAngle ?? 180,
        absorptionFrame: absorptionData.frame,
        absorptionTimestamp: absorptionData.timestamp,
        absorptionKneeAngle: absorptionData.minKneeAngle ?? absorptionData.avgKneeAngle ?? 0,
        analysisData: {
          frameData: smoothedData,
        },
      };
      
      setResult(detection);
      
      const footLabel = detection.landingFoot === "both" ? "both feet" : 
                        detection.landingFoot === "left" ? "left foot" :
                        detection.landingFoot === "right" ? "right foot" : "unknown";
      
      detectionLogger.debug(`\n🎾 Jump Analysis Complete:`);
      detectionLogger.debug(`   🚀 Takeoff: frame ${detection.takeoffFrame} (${detection.takeoffTimestamp.toFixed(2)}s)`);
      detectionLogger.debug(`   🦘 Peak jump: frame ${detection.peakJumpFrame} (${detection.peakJumpTimestamp.toFixed(2)}s)`);
      detectionLogger.debug(`   🦶 Landing: frame ${detection.landingFrame} (${detection.landingTimestamp.toFixed(2)}s) - ${footLabel}`);
      detectionLogger.debug(`   📏 Jump height: ${(detection.jumpHeight * 100).toFixed(1)}%`);
      detectionLogger.debug(`   ⏱️ Air time: ${(detection.airTime * 1000).toFixed(0)}ms`);
      detectionLogger.debug(`\n📈 Y-Axis Velocity (during jump):`);
      detectionLogger.debug(`   ⬆️ Peak upward: ${Math.abs(detection.peakUpwardVelocity).toFixed(0)} px/s at frame ${detection.peakUpwardVelocityFrame} (${detection.peakUpwardVelocityTimestamp.toFixed(2)}s)`);
      detectionLogger.debug(`   ⬇️ Peak downward: ${detection.peakDownwardVelocity.toFixed(0)} px/s at frame ${detection.peakDownwardVelocityFrame} (${detection.peakDownwardVelocityTimestamp.toFixed(2)}s)`);
      detectionLogger.debug(`\n🦵 Knee Bend Phases:`);
      detectionLogger.debug(`   📉 Loading: frame ${detection.loadingFrame} (${detection.loadingTimestamp.toFixed(2)}s) - ${detection.loadingKneeAngle.toFixed(0)}°`);
      detectionLogger.debug(`   📈 Extension: frame ${detection.extensionFrame} (${detection.extensionTimestamp.toFixed(2)}s) - ${detection.extensionKneeAngle.toFixed(0)}°`);
      detectionLogger.debug(`   📉 Absorption: frame ${detection.absorptionFrame} (${detection.absorptionTimestamp.toFixed(2)}s) - ${detection.absorptionKneeAngle.toFixed(0)}°`);
      detectionLogger.debug(`\n   📊 Confidence: ${(confidence * 100).toFixed(1)}%`);
      detectionLogger.debug(`   📡 Data source: ${ankleFrames} ankle frames, ${hipFrames} hip fallback frames`);
      
      setIsAnalyzing(false);
      return detection;
    } catch (err) {
      detectionLogger.error("Landing detection error:", err);
      setError(err instanceof Error ? err.message : "Unknown error during landing detection");
      setIsAnalyzing(false);
      return null;
    }
  }, [
    preprocessedPoses,
    extractFrameData,
    smoothData,
    findJumpPhases,
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
    detectLanding,
    clearResult,
    hasPreprocessedData: preprocessedPoses.size > 0,
  };
}
