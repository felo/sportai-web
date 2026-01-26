/**
 * useLowConfidenceRegions Hook
 * 
 * Calculates regions where joint confidence is below threshold.
 * These regions are highlighted on the chart to show unreliable data.
 */

import { useMemo, useCallback } from "react";
import type { SwingDetectionResultV3, SwingFrameDataV3 } from "../../hooks";
import type { 
  MetricType, 
  WristType, 
  KneeType, 
  AngleType, 
  VelocityBodyPart,
  LowConfidenceRegion
} from "../types";

interface UseLowConfidenceRegionsOptions {
  swingResult: SwingDetectionResultV3 | null;
  selectedMetric: MetricType;
  selectedWrist: WristType;
  selectedKnee: KneeType;
  velocityBodyPart: VelocityBodyPart;
  angleType: AngleType;
  confidenceThreshold: number;
}

/**
 * Get confidence value for a body part from frame data
 */
function getConfidenceForBodyPart(
  fd: SwingFrameDataV3, 
  bodyPart: VelocityBodyPart, 
  side: "left" | "right"
): number | null {
  switch (bodyPart) {
    case "wrist":
      return side === "left" ? fd.leftWristConfidence : fd.rightWristConfidence;
    case "elbow":
      return side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
    case "shoulder":
      return side === "left" ? fd.leftShoulderConfidence : fd.rightShoulderConfidence;
    case "hip":
      return side === "left" ? fd.leftHipConfidence : fd.rightHipConfidence;
    case "knee":
      return side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
    case "ankle":
      return side === "left" ? fd.leftAnkleConfidence : fd.rightAnkleConfidence;
    default:
      return null;
  }
}

/**
 * Get confidence for an angle type (minimum of involved joints)
 */
function getConfidenceForAngleType(
  fd: SwingFrameDataV3, 
  type: AngleType, 
  side: "left" | "right"
): number | null {
  // Each angle involves multiple joints - return the minimum confidence
  switch (type) {
    case "shoulder": {
      const shoulderConf = side === "left" ? fd.leftShoulderConfidence : fd.rightShoulderConfidence;
      const elbowConf = side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
      if (shoulderConf === null || elbowConf === null) return null;
      return Math.min(shoulderConf, elbowConf);
    }
    case "elbow": {
      const elbowConf = side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
      const wristConf = side === "left" ? fd.leftWristConfidence : fd.rightWristConfidence;
      if (elbowConf === null || wristConf === null) return null;
      return Math.min(elbowConf, wristConf);
    }
    case "hip": {
      const hipConf = side === "left" ? fd.leftHipConfidence : fd.rightHipConfidence;
      const kneeConf = side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
      if (hipConf === null || kneeConf === null) return null;
      return Math.min(hipConf, kneeConf);
    }
    case "knee": {
      const kneeConf = side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
      const ankleConf = side === "left" ? fd.leftAnkleConfidence : fd.rightAnkleConfidence;
      if (kneeConf === null || ankleConf === null) return null;
      return Math.min(kneeConf, ankleConf);
    }
    default:
      return null;
  }
}

/**
 * Hook to calculate low confidence regions based on selected metric and joint
 */
export function useLowConfidenceRegions({
  swingResult,
  selectedMetric,
  selectedWrist,
  selectedKnee,
  velocityBodyPart,
  angleType,
  confidenceThreshold,
}: UseLowConfidenceRegionsOptions): LowConfidenceRegion[] {
  
  return useMemo((): LowConfidenceRegion[] => {
    if (!swingResult?.frameData) return [];
    
    // Only show for velocity and angle views
    if (selectedMetric !== "velocity" && selectedMetric !== "kneeBend") return [];
    
    const regions: LowConfidenceRegion[] = [];
    let inLowConfRegion = false;
    let regionStart = 0;

    for (let i = 0; i < swingResult.frameData.length; i++) {
      const fd = swingResult.frameData[i];
      
      let isLowConfidence = false;
      
      if (selectedMetric === "velocity") {
        // For velocity view, check the selected body part confidence
        const leftConf = getConfidenceForBodyPart(fd, velocityBodyPart, "left");
        const rightConf = getConfidenceForBodyPart(fd, velocityBodyPart, "right");
        
        switch (selectedWrist) {
          case "left":
            isLowConfidence = leftConf === null || leftConf < confidenceThreshold;
            break;
          case "right":
            isLowConfidence = rightConf === null || rightConf < confidenceThreshold;
            break;
          case "both":
            // For "both", show low confidence if BOTH sides are low
            isLowConfidence = 
              (leftConf === null || leftConf < confidenceThreshold) &&
              (rightConf === null || rightConf < confidenceThreshold);
            break;
        }
      } else if (selectedMetric === "kneeBend") {
        // For angle view, check the joints involved in the selected angle
        const leftConf = getConfidenceForAngleType(fd, angleType, "left");
        const rightConf = getConfidenceForAngleType(fd, angleType, "right");
        
        switch (selectedKnee) {
          case "left":
            isLowConfidence = leftConf === null || leftConf < confidenceThreshold;
            break;
          case "right":
            isLowConfidence = rightConf === null || rightConf < confidenceThreshold;
            break;
          case "both":
            isLowConfidence = 
              (leftConf === null || leftConf < confidenceThreshold) &&
              (rightConf === null || rightConf < confidenceThreshold);
            break;
        }
      }
      
      if (isLowConfidence && !inLowConfRegion) {
        inLowConfRegion = true;
        regionStart = fd.frame;
      } else if (!isLowConfidence && inLowConfRegion) {
        inLowConfRegion = false;
        regions.push({ startFrame: regionStart, endFrame: swingResult.frameData[i - 1].frame });
      }
    }
    
    // Don't forget the last region if still in low confidence
    if (inLowConfRegion && swingResult.frameData.length > 0) {
      regions.push({ 
        startFrame: regionStart, 
        endFrame: swingResult.frameData[swingResult.frameData.length - 1].frame 
      });
    }

    return regions;
  }, [
    swingResult, 
    selectedMetric, 
    selectedWrist, 
    selectedKnee, 
    velocityBodyPart, 
    angleType, 
    confidenceThreshold
  ]);
}
