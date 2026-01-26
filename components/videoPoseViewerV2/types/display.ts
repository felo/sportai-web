/**
 * Display Configuration Types
 * 
 * Types for skeleton visualization, angle measurements, body orientation, and trajectories.
 */

// ============================================================================
// Skeleton Display Configuration
// ============================================================================

export interface SkeletonDisplayConfig {
  /** Show skeleton overlay */
  showSkeleton: boolean;
  /** Show keypoint dots */
  showKeypoints: boolean;
  /** Show connection lines */
  showConnections: boolean;
  /** Show face landmarks (nose, eyes, ears) */
  showFaceLandmarks: boolean;
  /** Show tracking ID labels for multi-pose */
  showTrackingId: boolean;
  /** Show bounding box around detected poses */
  showBoundingBox: boolean;
  /** Show confidence scores on keypoints */
  showConfidenceScores: boolean;
  /** Keypoint radius in pixels */
  keypointRadius: number;
  /** Connection line width in pixels */
  connectionWidth: number;
  /** Primary skeleton color */
  skeletonColor: string;
  /** Keypoint fill color */
  keypointColor: string;
  /** Keypoint outline color */
  keypointOutlineColor: string;
  /** Opacity of skeleton overlay (0-1) */
  opacity: number;
}

export const DEFAULT_SKELETON_DISPLAY: SkeletonDisplayConfig = {
  showSkeleton: true,
  showKeypoints: true,
  showConnections: true,
  showFaceLandmarks: false,
  showTrackingId: false,
  showBoundingBox: false,
  showConfidenceScores: false,
  keypointRadius: 4,
  connectionWidth: 2,
  skeletonColor: "#7ADB8F",
  keypointColor: "#FF9800",
  keypointOutlineColor: "#7ADB8F",
  opacity: 1.0,
};

// ============================================================================
// Angle Measurement Configuration
// ============================================================================

export interface AngleConfig {
  /** Show angle measurements */
  showAngles: boolean;
  /** List of angle triplets to measure [jointA, vertex, jointC] */
  measuredAngles: Array<[number, number, number]>;
  /** Enable click-to-add angle mode */
  enableAngleClicking: boolean;
  /** Currently selected joints for new angle (0-2 joints) */
  selectedAngleJoints: number[];
  /** Show angle value in degrees */
  showAngleValue: boolean;
  /** Show angle arc visualization */
  showAngleArc: boolean;
  /** Angle display precision (decimal places) */
  anglePrecision: number;
  /** Angle line color */
  angleColor: string;
  /** Angle arc color */
  arcColor: string;
  /** Angle text color */
  textColor: string;
  /** Angle font size */
  fontSize: number;
  /** Use complementary angles (180° - angle) */
  useComplementaryAngles: boolean;
}

export const ANGLE_PRESETS = {
  leftElbow: [5, 7, 9] as [number, number, number],
  rightElbow: [6, 8, 10] as [number, number, number],
  leftKnee: [11, 13, 15] as [number, number, number],
  rightKnee: [12, 14, 16] as [number, number, number],
  leftShoulder: [7, 5, 11] as [number, number, number],
  rightShoulder: [8, 6, 12] as [number, number, number],
  leftHip: [5, 11, 13] as [number, number, number],
  rightHip: [6, 12, 14] as [number, number, number],
  torsoTilt: [5, 11, 12] as [number, number, number],
};

export const DEFAULT_ANGLE_CONFIG: AngleConfig = {
  showAngles: true,
  measuredAngles: [ANGLE_PRESETS.rightElbow, ANGLE_PRESETS.rightKnee],
  enableAngleClicking: false,
  selectedAngleJoints: [],
  showAngleValue: true,
  showAngleArc: true,
  anglePrecision: 0,
  angleColor: "#A855F7",
  arcColor: "rgba(168, 85, 247, 0.3)",
  textColor: "#FFFFFF",
  fontSize: 20,
  useComplementaryAngles: true,
};

// ============================================================================
// Body Orientation Configuration
// ============================================================================

export interface BodyOrientationConfig {
  /** Show body orientation indicator */
  showOrientation: boolean;
  /** Show orientation ellipse below feet */
  showEllipse: boolean;
  /** Show direction line/arrow */
  showDirectionLine: boolean;
  /** Show angle value in degrees */
  showAngleValue: boolean;
  /** Ellipse color */
  ellipseColor: string;
  /** Direction line color */
  lineColor: string;
  /** Text color for angle */
  textColor: string;
  /** Ellipse size multiplier */
  ellipseSize: number;
  /** Direction line length multiplier */
  lineLength: number;
  /** Minimum confidence for keypoints */
  minConfidence: number;
}

export const DEFAULT_BODY_ORIENTATION_CONFIG: BodyOrientationConfig = {
  showOrientation: true,
  showEllipse: true,
  showDirectionLine: true,
  showAngleValue: true,
  ellipseColor: "rgba(74, 222, 128, 0.4)",
  lineColor: "#4ADE80",
  textColor: "#FFFFFF",
  ellipseSize: 300,
  lineLength: 1.0,
  minConfidence: 0.3,
};

// ============================================================================
// Trajectory Configuration
// ============================================================================

export interface TrajectoryConfig {
  /** Show joint trajectories */
  showTrajectories: boolean;
  /** Joint indices to track */
  selectedJoints: number[];
  /** Apply smoothing to trajectory paths */
  smoothTrajectories: boolean;
  /** Maximum number of points to retain */
  maxTrajectoryPoints: number;
  /** Trajectory line width */
  lineWidth: number;
  /** Fade older points */
  enableFade: boolean;
  /** Trajectory colors per joint */
  colors: string[];
}

export const DEFAULT_TRAJECTORY_CONFIG: TrajectoryConfig = {
  showTrajectories: false,
  selectedJoints: [10],
  smoothTrajectories: true,
  maxTrajectoryPoints: 120,
  lineWidth: 2,
  enableFade: true,
  colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"],
};
