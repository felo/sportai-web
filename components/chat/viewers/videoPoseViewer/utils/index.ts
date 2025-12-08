// Trajectory math utilities
export {
  catmullRomSpline,
  calculatePointVelocity,
  smoothTrajectory,
  type TrajectoryPoint,
} from "./trajectoryMath";

// Canvas drawing utilities
export {
  drawTrajectories,
  calculatePoseScaling,
  drawPoses,
  drawAngles,
  drawObjects,
  drawProjectileResult,
  drawCourtOverlay,
  calculateBodyOrientation,
  drawBodyOrientation,
  resetOrientationTracking,
  type LabelPositionState,
  type DrawTrajectoriesOptions,
  type DrawPosesOptions,
  type PoseScaling,
  type DrawAnglesOptions,
  type DrawObjectsOptions,
  type DrawProjectileOptions,
  type DrawCourtOverlayOptions,
  type BodyOrientationOptions,
  type BodyOrientationResult,
} from "./canvasDrawing";
