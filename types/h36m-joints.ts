/**
 * H36M (Human3.6M) Joint Format
 *
 * Standard skeleton format used by the Shark technique analysis API.
 * Contains 17 keypoints for full-body pose estimation.
 */

// ============================================================================
// Joint Indices (enum for type safety)
// ============================================================================

export enum H36MJoint {
  ROOT = 0,
  RIGHT_HIP = 1,
  RIGHT_KNEE = 2,
  RIGHT_ANKLE = 3,
  LEFT_HIP = 4,
  LEFT_KNEE = 5,
  LEFT_ANKLE = 6,
  BELLY = 7,
  NECK = 8,
  NOSE = 9,
  HEAD = 10,
  LEFT_SHOULDER = 11,
  LEFT_ELBOW = 12,
  LEFT_WRIST = 13,
  RIGHT_SHOULDER = 14,
  RIGHT_ELBOW = 15,
  RIGHT_WRIST = 16,
}

// ============================================================================
// Joint Names Mapping
// ============================================================================

export const H36M_JOINT_NAMES: Record<number, string> = {
  [H36MJoint.ROOT]: "Root",
  [H36MJoint.RIGHT_HIP]: "Right Hip",
  [H36MJoint.RIGHT_KNEE]: "Right Knee",
  [H36MJoint.RIGHT_ANKLE]: "Right Ankle",
  [H36MJoint.LEFT_HIP]: "Left Hip",
  [H36MJoint.LEFT_KNEE]: "Left Knee",
  [H36MJoint.LEFT_ANKLE]: "Left Ankle",
  [H36MJoint.BELLY]: "Belly",
  [H36MJoint.NECK]: "Neck",
  [H36MJoint.NOSE]: "Nose",
  [H36MJoint.HEAD]: "Head",
  [H36MJoint.LEFT_SHOULDER]: "Left Shoulder",
  [H36MJoint.LEFT_ELBOW]: "Left Elbow",
  [H36MJoint.LEFT_WRIST]: "Left Wrist",
  [H36MJoint.RIGHT_SHOULDER]: "Right Shoulder",
  [H36MJoint.RIGHT_ELBOW]: "Right Elbow",
  [H36MJoint.RIGHT_WRIST]: "Right Wrist",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the human-readable name for an H36M joint index
 * @param index - Joint index (0-16)
 * @returns Joint name or "Unknown" if index is out of range
 */
export function getH36MJointName(index: number): string {
  return H36M_JOINT_NAMES[index] ?? `Unknown (${index})`;
}

/**
 * Format a joint index with its name for display
 * @param index - Joint index (0-16)
 * @returns Formatted string like "Right Elbow (15)"
 */
export function formatH36MJoint(index: number): string {
  const name = H36M_JOINT_NAMES[index];
  return name ? `${name} (${index})` : `Unknown (${index})`;
}

/**
 * Format an array of joint indices as a comma-separated string with names
 * @param indices - Array of joint indices
 * @returns Formatted string like "Right Elbow (15), Right Wrist (16)"
 */
export function formatH36MJoints(indices: number[]): string {
  return indices.map(formatH36MJoint).join(", ");
}

/**
 * Get the total number of joints in H36M format
 */
export const H36M_JOINT_COUNT = 17;

// ============================================================================
// Limb Definitions (pairs of joints that form limbs)
// ============================================================================

export const H36M_LIMBS: Record<string, [number, number]> = {
  // Right leg
  right_upper_leg: [H36MJoint.RIGHT_HIP, H36MJoint.RIGHT_KNEE],
  right_lower_leg: [H36MJoint.RIGHT_KNEE, H36MJoint.RIGHT_ANKLE],
  // Left leg
  left_upper_leg: [H36MJoint.LEFT_HIP, H36MJoint.LEFT_KNEE],
  left_lower_leg: [H36MJoint.LEFT_KNEE, H36MJoint.LEFT_ANKLE],
  // Torso
  right_torso: [H36MJoint.RIGHT_HIP, H36MJoint.RIGHT_SHOULDER],
  left_torso: [H36MJoint.LEFT_HIP, H36MJoint.LEFT_SHOULDER],
  spine_lower: [H36MJoint.ROOT, H36MJoint.BELLY],
  spine_upper: [H36MJoint.BELLY, H36MJoint.NECK],
  // Right arm
  right_upper_arm: [H36MJoint.RIGHT_SHOULDER, H36MJoint.RIGHT_ELBOW],
  right_lower_arm: [H36MJoint.RIGHT_ELBOW, H36MJoint.RIGHT_WRIST],
  // Left arm
  left_upper_arm: [H36MJoint.LEFT_SHOULDER, H36MJoint.LEFT_ELBOW],
  left_lower_arm: [H36MJoint.LEFT_ELBOW, H36MJoint.LEFT_WRIST],
  // Head/neck
  neck_head: [H36MJoint.NECK, H36MJoint.HEAD],
  neck_nose: [H36MJoint.NECK, H36MJoint.NOSE],
};

/**
 * Format a limb name for display (converts snake_case to Title Case)
 * @param limbName - Limb name in snake_case
 * @returns Formatted name like "Right Lower Leg"
 */
export function formatLimbName(limbName: string): string {
  return limbName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a limb with its joint pair for display
 * @param limbName - Limb name
 * @param joints - Joint pair [start, end]
 * @returns Formatted string like "Right Lower Leg: Right Knee (2) → Right Ankle (3)"
 */
export function formatLimbWithJoints(limbName: string, joints: [number, number]): string {
  const formattedName = formatLimbName(limbName);
  const [start, end] = joints;
  return `${formattedName}: ${formatH36MJoint(start)} → ${formatH36MJoint(end)}`;
}
