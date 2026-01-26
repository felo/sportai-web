/**
 * useChartData Hook
 * 
 * Transforms swing detection frame data into chart-ready data points.
 * Handles both processed (smoothed) and raw data for comparison views.
 */

import { useMemo } from "react";
import type { SwingDetectionResultV3 } from "../../hooks";
import type { 
  ChartDataPoint, 
  MetricType, 
  WristType, 
  KneeType, 
  AngleType, 
  VelocityBodyPart, 
  OrientationType 
} from "../types";

interface UseChartDataOptions {
  swingResult: SwingDetectionResultV3 | null;
  selectedMetric: MetricType;
  selectedWrist: WristType;
  selectedKnee: KneeType;
  angleType: AngleType;
  velocityBodyPart: VelocityBodyPart;
  orientationType: OrientationType;
  useComplementaryAngles: boolean;
}

interface UseChartDataResult {
  chartData: ChartDataPoint[];
  rawChartData: ChartDataPoint[];
}

/**
 * Get velocity value for a body part based on frame data
 */
function getVelocityValue(
  fd: SwingDetectionResultV3["frameData"][0],
  bodyPart: VelocityBodyPart,
  side: WristType,
  isRaw: boolean = false
): number | null {
  const prefix = isRaw ? "raw" : "";
  
  switch (bodyPart) {
    case "wrist":
      if (side === "left") return isRaw ? fd.rawLeftWristVelocityKmh : fd.leftWristVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightWristVelocityKmh : fd.rightWristVelocityKmh;
      return isRaw ? fd.rawMaxWristVelocityKmh : fd.maxWristVelocityKmh;
    
    case "ankle":
      if (side === "left") return isRaw ? fd.rawLeftAnkleVelocityKmh : fd.leftAnkleVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightAnkleVelocityKmh : fd.rightAnkleVelocityKmh;
      return Math.max(
        (isRaw ? fd.rawLeftAnkleVelocityKmh : fd.leftAnkleVelocityKmh) ?? 0,
        (isRaw ? fd.rawRightAnkleVelocityKmh : fd.rightAnkleVelocityKmh) ?? 0
      ) || null;
    
    case "knee":
      if (side === "left") return isRaw ? fd.rawLeftKneeVelocityKmh : fd.leftKneeVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightKneeVelocityKmh : fd.rightKneeVelocityKmh;
      return Math.max(
        (isRaw ? fd.rawLeftKneeVelocityKmh : fd.leftKneeVelocityKmh) ?? 0,
        (isRaw ? fd.rawRightKneeVelocityKmh : fd.rightKneeVelocityKmh) ?? 0
      ) || null;
    
    case "hip":
      if (side === "left") return isRaw ? fd.rawLeftHipVelocityKmh : fd.leftHipVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightHipVelocityKmh : fd.rightHipVelocityKmh;
      return Math.max(
        (isRaw ? fd.rawLeftHipVelocityKmh : fd.leftHipVelocityKmh) ?? 0,
        (isRaw ? fd.rawRightHipVelocityKmh : fd.rightHipVelocityKmh) ?? 0
      ) || null;
    
    case "shoulder":
      if (side === "left") return isRaw ? fd.rawLeftShoulderVelocityKmh : fd.leftShoulderVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightShoulderVelocityKmh : fd.rightShoulderVelocityKmh;
      return Math.max(
        (isRaw ? fd.rawLeftShoulderVelocityKmh : fd.leftShoulderVelocityKmh) ?? 0,
        (isRaw ? fd.rawRightShoulderVelocityKmh : fd.rightShoulderVelocityKmh) ?? 0
      ) || null;
    
    case "elbow":
      if (side === "left") return isRaw ? fd.rawLeftElbowVelocityKmh : fd.leftElbowVelocityKmh;
      if (side === "right") return isRaw ? fd.rawRightElbowVelocityKmh : fd.rightElbowVelocityKmh;
      return Math.max(
        (isRaw ? fd.rawLeftElbowVelocityKmh : fd.leftElbowVelocityKmh) ?? 0,
        (isRaw ? fd.rawRightElbowVelocityKmh : fd.rightElbowVelocityKmh) ?? 0
      ) || null;
    
    default:
      return null;
  }
}

/**
 * Get acceleration value for a body part based on frame data
 */
function getAccelerationValue(
  fd: SwingDetectionResultV3["frameData"][0],
  bodyPart: VelocityBodyPart,
  side: WristType
): number | null {
  switch (bodyPart) {
    case "wrist":
      if (side === "left") return fd.leftWristAcceleration;
      if (side === "right") return fd.rightWristAcceleration;
      return fd.maxWristAcceleration;
    
    case "ankle":
      if (side === "left") return fd.leftAnkleAcceleration;
      if (side === "right") return fd.rightAnkleAcceleration;
      return fd.maxAnkleAcceleration;
    
    case "knee":
      if (side === "left") return fd.leftKneeAcceleration;
      if (side === "right") return fd.rightKneeAcceleration;
      return fd.maxKneeAcceleration;
    
    case "hip":
      if (side === "left") return fd.leftHipAcceleration;
      if (side === "right") return fd.rightHipAcceleration;
      return fd.maxHipAcceleration;
    
    case "shoulder":
      if (side === "left") return fd.leftShoulderAcceleration;
      if (side === "right") return fd.rightShoulderAcceleration;
      return fd.maxShoulderAcceleration;
    
    case "elbow":
      if (side === "left") return fd.leftElbowAcceleration;
      if (side === "right") return fd.rightElbowAcceleration;
      return fd.maxElbowAcceleration;
    
    default:
      return null;
  }
}

/**
 * Get angle value for a joint based on frame data
 */
function getAngleValue(
  fd: SwingDetectionResultV3["frameData"][0],
  angleType: AngleType,
  side: KneeType,
  isRaw: boolean = false
): number | null {
  switch (angleType) {
    case "shoulder":
      if (side === "left" || side === "both") 
        return isRaw ? fd.rawLeftShoulderAngle : fd.leftShoulderAngle;
      return isRaw ? fd.rawRightShoulderAngle : fd.rightShoulderAngle;
    
    case "elbow":
      if (side === "left" || side === "both") 
        return isRaw ? fd.rawLeftElbowAngle : fd.leftElbowAngle;
      return isRaw ? fd.rawRightElbowAngle : fd.rightElbowAngle;
    
    case "hip":
      if (side === "left" || side === "both") 
        return isRaw ? fd.rawLeftHipAngle : fd.leftHipAngle;
      return isRaw ? fd.rawRightHipAngle : fd.rightHipAngle;
    
    case "knee":
    default:
      if (side === "left") return isRaw ? fd.rawLeftKneeBend : fd.leftKneeBend;
      if (side === "right") return isRaw ? fd.rawRightKneeBend : fd.rightKneeBend;
      return isRaw ? fd.rawMaxKneeBend : fd.maxKneeBend;
  }
}

/**
 * Hook to transform swing detection data into chart data points
 */
export function useChartData({
  swingResult,
  selectedMetric,
  selectedWrist,
  selectedKnee,
  angleType,
  velocityBodyPart,
  orientationType,
  useComplementaryAngles,
}: UseChartDataOptions): UseChartDataResult {
  
  // Transform frame data for the chart (processed data - used by protocol)
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!swingResult?.frameData) return [];

    return swingResult.frameData.map((fd) => {
      let value: number | null = null;
      
      switch (selectedMetric) {
        case "velocity":
          value = getVelocityValue(fd, velocityBodyPart, selectedWrist, false);
          break;
        
        case "acceleration":
          value = getAccelerationValue(fd, velocityBodyPart, selectedWrist);
          break;
        
        case "orientation":
          switch (orientationType) {
            case "body":
              value = fd.bodyOrientation;
              break;
            case "hipAngular":
              value = fd.hipAngularVelocity;
              break;
            case "shoulderAngular":
              value = fd.shoulderAngularVelocity;
              break;
            case "xFactor":
              value = fd.xFactor;
              break;
          }
          break;
        
        case "kneeBend":
          value = getAngleValue(fd, angleType, selectedKnee, false);
          // Transform to inner angle if needed
          if (value !== null && !useComplementaryAngles) {
            value = 180 - value;
          }
          break;
        
        case "score":
          value = fd.swingScore;
          break;
      }

      return {
        frame: fd.frame,
        time: fd.timestamp,
        value,
        phase: fd.phase,
      };
    });
  }, [
    swingResult, 
    selectedMetric, 
    selectedWrist, 
    selectedKnee, 
    angleType, 
    velocityBodyPart, 
    orientationType, 
    useComplementaryAngles
  ]);

  // Raw data (before any processing) - for comparison
  const rawChartData = useMemo((): ChartDataPoint[] => {
    if (!swingResult?.frameData) return [];
    if (selectedMetric !== "velocity" && selectedMetric !== "kneeBend") return [];

    return swingResult.frameData.map((fd) => {
      let value: number | null = null;
      
      if (selectedMetric === "velocity") {
        value = getVelocityValue(fd, velocityBodyPart, selectedWrist, true);
      } else if (selectedMetric === "kneeBend") {
        value = getAngleValue(fd, angleType, selectedKnee, true);
        // Transform to inner angle if needed
        if (value !== null && !useComplementaryAngles) {
          value = 180 - value;
        }
      }
      
      return {
        frame: fd.frame,
        time: fd.timestamp,
        value,
        phase: fd.phase,
      };
    });
  }, [
    swingResult, 
    selectedMetric, 
    selectedWrist, 
    selectedKnee, 
    angleType, 
    velocityBodyPart, 
    useComplementaryAngles
  ]);

  return { chartData, rawChartData };
}
