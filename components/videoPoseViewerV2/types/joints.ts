/**
 * Joint Names Types
 * 
 * Mappings for joint indices to human-readable names.
 */

import type { SupportedModel } from "@/hooks/usePoseDetection";

// ============================================================================
// MoveNet Joint Names (17 keypoints)
// ============================================================================

export const MOVENET_JOINT_NAMES: Record<number, string> = {
  0: "Nose",
  1: "Left Eye",
  2: "Right Eye",
  3: "Left Ear",
  4: "Right Ear",
  5: "Left Shoulder",
  6: "Right Shoulder",
  7: "Left Elbow",
  8: "Right Elbow",
  9: "Left Wrist",
  10: "Right Wrist",
  11: "Left Hip",
  12: "Right Hip",
  13: "Left Knee",
  14: "Right Knee",
  15: "Left Ankle",
  16: "Right Ankle",
};

// ============================================================================
// BlazePose Joint Names (33 keypoints)
// ============================================================================

export const BLAZEPOSE_JOINT_NAMES: Record<number, string> = {
  0: "Nose",
  1: "Left Eye (Inner)",
  2: "Left Eye",
  3: "Left Eye (Outer)",
  4: "Right Eye (Inner)",
  5: "Right Eye",
  6: "Right Eye (Outer)",
  7: "Left Ear",
  8: "Right Ear",
  9: "Mouth (Left)",
  10: "Mouth (Right)",
  11: "Left Shoulder",
  12: "Right Shoulder",
  13: "Left Elbow",
  14: "Right Elbow",
  15: "Left Wrist",
  16: "Right Wrist",
  17: "Left Pinky",
  18: "Right Pinky",
  19: "Left Index",
  20: "Right Index",
  21: "Left Thumb",
  22: "Right Thumb",
  23: "Left Hip",
  24: "Right Hip",
  25: "Left Knee",
  26: "Right Knee",
  27: "Left Ankle",
  28: "Right Ankle",
  29: "Left Heel",
  30: "Right Heel",
  31: "Left Foot Index",
  32: "Right Foot Index",
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getJointName(index: number, model: SupportedModel): string {
  const names = model === "BlazePose" ? BLAZEPOSE_JOINT_NAMES : MOVENET_JOINT_NAMES;
  return names[index] || `Joint ${index}`;
}

export function getJointCount(model: SupportedModel): number {
  return model === "BlazePose" ? 33 : 17;
}
