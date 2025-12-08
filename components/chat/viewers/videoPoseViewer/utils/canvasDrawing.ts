/**
 * Canvas drawing utilities for video pose viewer.
 * Handles drawing of trajectories, poses, angles, objects, projectiles, and court overlays.
 */

import { drawPose, drawAngle, BLAZEPOSE_CONNECTIONS_2D } from "@/types/pose";
import { drawDetectedObjects } from "@/types/object-detection";
import { drawProjectile } from "@/types/projectile-detection";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import type { CourtCorners } from "@/types/frame-analysis";
import type { LabelBounds } from "@/types/pose";
import { smoothTrajectory, type TrajectoryPoint } from "./trajectoryMath";
import { LABEL_POSITION_STABILITY_FRAMES } from "../constants";

/**
 * Represents the actual display area of video content within the canvas.
 * When video uses object-fit: contain, there may be letterboxing.
 */
export interface VideoDisplayArea {
  /** X offset where video content starts */
  offsetX: number;
  /** Y offset where video content starts */
  offsetY: number;
  /** Width of displayed video content */
  displayWidth: number;
  /** Height of displayed video content */
  displayHeight: number;
  /** Scale factor from video coordinates to display coordinates (X) */
  scaleX: number;
  /** Scale factor from video coordinates to display coordinates (Y) */
  scaleY: number;
}

/**
 * Calculate the actual display area of video content within the canvas.
 * Handles letterboxing when video aspect ratio differs from container.
 */
export function calculateVideoDisplayArea(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): VideoDisplayArea {
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvas.width / canvas.height;

  let displayWidth: number;
  let displayHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (videoAspect > canvasAspect) {
    // Video is wider - letterbox top/bottom (pillarboxing not needed)
    displayWidth = canvas.width;
    displayHeight = canvas.width / videoAspect;
    offsetX = 0;
    offsetY = (canvas.height - displayHeight) / 2;
  } else {
    // Video is taller - letterbox left/right (pillarboxing)
    displayHeight = canvas.height;
    displayWidth = canvas.height * videoAspect;
    offsetX = (canvas.width - displayWidth) / 2;
    offsetY = 0;
  }

  return {
    offsetX,
    offsetY,
    displayWidth,
    displayHeight,
    scaleX: displayWidth / video.videoWidth,
    scaleY: displayHeight / video.videoHeight,
  };
}

// Joint colors for trajectory visualization
const JOINT_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#B8E994",
  "#FDA7DF",
  "#82CCDD",
  "#F6A6D1",
  "#A29BFE",
  "#FD79A8",
  "#FDCB6E",
  "#6C5CE7",
];

export interface LabelPositionState {
  multiplier: number;
  verticalOffset: number;
  framesSinceChange: number;
}

export interface DrawTrajectoriesOptions {
  ctx: CanvasRenderingContext2D;
  jointTrajectories: Map<number, TrajectoryPoint[]>;
  scaleX: number;
  scaleY: number;
  smoothEnabled: boolean;
}

/**
 * Draw joint trajectories on the canvas.
 */
export function drawTrajectories({
  ctx,
  jointTrajectories,
  scaleX,
  scaleY,
  smoothEnabled,
}: DrawTrajectoriesOptions): void {
  jointTrajectories.forEach((trajectory, jointIndex) => {
    if (trajectory.length < 2) return;

    const color = JOINT_COLORS[jointIndex % JOINT_COLORS.length];

    // Scale trajectory points to canvas coordinates
    const scaledTrajectory = trajectory.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
      frame: point.frame,
    }));

    // Apply smoothing if enabled
    const pointsToDraw = smoothEnabled
      ? smoothTrajectory(scaledTrajectory)
      : scaledTrajectory;

    // Draw trajectory line with smooth curves
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (smoothEnabled && pointsToDraw.length > 2) {
      // Use quadratic curves for even smoother, more natural paths
      ctx.beginPath();
      ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);

      for (let i = 1; i < pointsToDraw.length - 1; i++) {
        const current = pointsToDraw[i];
        const next = pointsToDraw[i + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        if (i === 1) {
          ctx.lineTo(current.x, current.y);
        } else {
          ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }
      }

      // Connect to last point
      const lastPoint = pointsToDraw[pointsToDraw.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    } else {
      // Simple line drawing for non-smoothed paths
      ctx.beginPath();
      ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
      for (let i = 1; i < pointsToDraw.length; i++) {
        ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
      }
    }

    ctx.stroke();

    // Draw dots along scaled trajectory to show actual data points
    scaledTrajectory.forEach((point, index) => {
      if (index % 5 === 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  });
}

export interface DrawPosesOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  currentPoses: PoseDetectionResult[];
  selectedModel: SupportedModel;
  showSkeleton: boolean;
  showFaceLandmarks: boolean;
  showTrackingId: boolean;
}

export interface PoseScaling {
  scaleX: number;
  scaleY: number;
  keypointRadius: number;
  angleFontSize: number;
}

/**
 * Calculate scaling factors and dynamic sizes based on pose bounding box.
 * Canvas now uses object-fit: contain to match video, so no offset needed.
 */
export function calculatePoseScaling(
  pose: PoseDetectionResult,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  selectedModel: SupportedModel
): PoseScaling {
  let scaleX: number, scaleY: number;

  if (selectedModel === "BlazePose") {
    const blazePoseInputWidth = 850;
    const blazePoseInputHeight = 478;
    scaleX = canvas.width / blazePoseInputWidth;
    scaleY = canvas.height / blazePoseInputHeight;
  } else {
    scaleX = canvas.width / video.videoWidth;
    scaleY = canvas.height / video.videoHeight;
  }

  // Calculate dynamic keypoint radius based on bounding box size
  let keypointRadius = 4;
  let angleFontSize = 14;

  if (pose.box) {
    const boxHeight = pose.box.height * scaleY;
    keypointRadius = Math.max(2, Math.min(8, boxHeight * 0.01));
    angleFontSize = Math.max(10, Math.min(20, boxHeight * 0.035));
  } else {
    const scaledKeypoints = pose.keypoints.map((kp) => ({
      ...kp,
      x: kp.x * scaleX,
      y: kp.y * scaleY,
    }));
    const validKeypoints = scaledKeypoints.filter((kp) => (kp.score ?? 0) > 0.3);
    if (validKeypoints.length > 0) {
      const yCoords = validKeypoints.map((kp) => kp.y);
      const estimatedHeight = Math.max(...yCoords) - Math.min(...yCoords);
      keypointRadius = Math.max(2, Math.min(8, estimatedHeight * 0.01));
      angleFontSize = Math.max(10, Math.min(20, estimatedHeight * 0.035));
    }
  }

  return { scaleX, scaleY, keypointRadius, angleFontSize };
}

/**
 * Draw all detected poses on the canvas.
 */
export function drawPoses({
  ctx,
  canvas,
  video,
  currentPoses,
  selectedModel,
  showSkeleton,
  showFaceLandmarks,
  showTrackingId,
}: DrawPosesOptions): void {
  for (const pose of currentPoses) {
    const { scaleX, scaleY, keypointRadius, angleFontSize } = calculatePoseScaling(
      pose,
      canvas,
      video,
      selectedModel
    );

    const scaledKeypoints = pose.keypoints.map((kp) => ({
      ...kp,
      x: kp.x * scaleX,
      y: kp.y * scaleY,
    }));

    // Draw skeleton if enabled
    if (showSkeleton) {
      const connections =
        selectedModel === "BlazePose" ? BLAZEPOSE_CONNECTIONS_2D : undefined;
      const faceIndices =
        selectedModel === "BlazePose"
          ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
          : undefined;

      drawPose(
        ctx,
        scaledKeypoints,
        {
          keypointColor: "#FF9800",
          keypointOutlineColor: "#7ADB8F",
          keypointRadius: keypointRadius,
          connectionColor: "#7ADB8F",
          connectionWidth: 3,
          minConfidence: 0.3,
          showFace: showFaceLandmarks,
          faceIndices: faceIndices,
        },
        connections
      );
    }

    // Draw Tracking ID & Bounding Box
    if (showTrackingId) {
      drawTrackingBox(ctx, pose, currentPoses, scaledKeypoints, scaleX, scaleY, angleFontSize);
    }
  }
}

/**
 * Draw tracking box and ID label for a pose.
 */
function drawTrackingBox(
  ctx: CanvasRenderingContext2D,
  pose: PoseDetectionResult,
  allPoses: PoseDetectionResult[],
  scaledKeypoints: Array<{ x: number; y: number; score?: number | null }>,
  scaleX: number,
  scaleY: number,
  labelFontSize: number
): void {
  let boxX = 0,
    boxY = 0,
    boxW = 0,
    boxH = 0;
  let hasBox = false;

  if (pose.box) {
    boxX = pose.box.xMin * scaleX;
    boxY = pose.box.yMin * scaleY;
    boxW = pose.box.width * scaleX;
    boxH = pose.box.height * scaleY;
    hasBox = true;
  } else {
    const validKeypoints = scaledKeypoints.filter((kp) => (kp.score ?? 0) > 0.3);
    if (validKeypoints.length > 0) {
      const xCoords = validKeypoints.map((kp) => kp.x);
      const yCoords = validKeypoints.map((kp) => kp.y);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      const padding = 20;
      boxX = minX - padding;
      boxY = minY - padding;
      boxW = maxX - minX + padding * 2;
      boxH = maxY - minY + padding * 2;
      hasBox = true;
    }
  }

  if (!hasBox) return;

  // Draw Bounding Box
  ctx.strokeStyle = "#00E676";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Draw ID Label
  const personIndex = allPoses.indexOf(pose) + 1;
  const idText =
    pose.id !== undefined
      ? `ID: ${pose.id}`
      : allPoses.length === 1
      ? "Player"
      : `Player ${personIndex}`;

  ctx.font = `bold ${labelFontSize}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const textMetrics = ctx.measureText(idText);
  const textWidth = textMetrics.width;
  const padding = Math.max(4, labelFontSize * 0.4);
  const cornerRadius = Math.max(3, labelFontSize * 0.25);
  const boxHeight = labelFontSize + padding * 1.5;

  const labelX = boxX;
  const labelY = boxY - (boxHeight + 6);

  // Draw dark background
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.moveTo(labelX + cornerRadius, labelY);
  ctx.lineTo(labelX + textWidth + padding * 2 - cornerRadius, labelY);
  ctx.quadraticCurveTo(
    labelX + textWidth + padding * 2,
    labelY,
    labelX + textWidth + padding * 2,
    labelY + cornerRadius
  );
  ctx.lineTo(labelX + textWidth + padding * 2, labelY + boxHeight - cornerRadius);
  ctx.quadraticCurveTo(
    labelX + textWidth + padding * 2,
    labelY + boxHeight,
    labelX + textWidth + padding * 2 - cornerRadius,
    labelY + boxHeight
  );
  ctx.lineTo(labelX + cornerRadius, labelY + boxHeight);
  ctx.quadraticCurveTo(
    labelX,
    labelY + boxHeight,
    labelX,
    labelY + boxHeight - cornerRadius
  );
  ctx.lineTo(labelX, labelY + cornerRadius);
  ctx.quadraticCurveTo(labelX, labelY, labelX + cornerRadius, labelY);
  ctx.closePath();
  ctx.fill();

  // Draw text outline
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = Math.max(2, labelFontSize * 0.2);
  ctx.lineJoin = "round";
  ctx.strokeText(idText, labelX + padding, labelY + padding * 0.5);

  // Draw text
  ctx.fillStyle = "#00E676";
  ctx.fillText(idText, labelX + padding, labelY + padding * 0.5);
}

export interface DrawAnglesOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  selectedPose: PoseDetectionResult;
  selectedModel: SupportedModel;
  measuredAngles: Array<[number, number, number]>;
  selectedAngleJoints: number[];
  labelPositionState: Map<string, LabelPositionState>;
  isPlaying: boolean;
}

/**
 * Draw angle measurements on the canvas.
 */
export function drawAngles({
  ctx,
  canvas,
  video,
  selectedPose,
  selectedModel,
  measuredAngles,
  selectedAngleJoints,
  labelPositionState,
  isPlaying,
}: DrawAnglesOptions): Map<string, LabelPositionState> {
  const newLabelState = new Map(labelPositionState);

  let scaleX: number, scaleY: number;
  if (selectedModel === "BlazePose") {
    scaleX = canvas.width / 800;
    scaleY = canvas.height / 450;
  } else {
    scaleX = canvas.width / video.videoWidth;
    scaleY = canvas.height / video.videoHeight;
  }

  const scaledKeypoints = selectedPose.keypoints.map((kp) => ({
    ...kp,
    x: kp.x * scaleX,
    y: kp.y * scaleY,
  }));

  // Calculate dynamic font size
  let angleFontSize = 20;
  if (selectedPose.box) {
    const boxHeight = selectedPose.box.height * scaleY;
    angleFontSize = Math.max(16, Math.min(32, boxHeight * 0.05));
  } else {
    const validKeypoints = scaledKeypoints.filter((kp) => (kp.score ?? 0) > 0.3);
    if (validKeypoints.length > 0) {
      const yCoords = validKeypoints.map((kp) => kp.y);
      const estimatedHeight = Math.max(...yCoords) - Math.min(...yCoords);
      angleFontSize = Math.max(16, Math.min(32, estimatedHeight * 0.05));
    }
  }

  // Draw selected joints in progress
  if (selectedAngleJoints.length >= 2) {
    ctx.strokeStyle = "#A855F7";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let i = 0; i < selectedAngleJoints.length - 1; i++) {
      const kp1 = scaledKeypoints[selectedAngleJoints[i]];
      const kp2 = scaledKeypoints[selectedAngleJoints[i + 1]];

      if (kp1 && kp2 && (kp1.score ?? 0) > 0.3 && (kp2.score ?? 0) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  }

  // Draw completed angles with collision detection
  const labelBounds: LabelBounds[] = [];
  measuredAngles.forEach(([idxA, idxB, idxC]) => {
    const angleKey = `${idxA}-${idxB}-${idxC}`;
    const labelState = labelPositionState.get(angleKey);

    const result = drawAngle(ctx, scaledKeypoints, [idxA, idxB, idxC], {
      lineColor: "#A855F7",
      arcColor: "rgba(168, 85, 247, 0.3)",
      textColor: "#FFFFFF",
      lineWidth: 2,
      fontSize: angleFontSize,
      minConfidence: 0.3,
      existingLabels: labelBounds,
      currentMultiplier: labelState?.multiplier,
      currentVerticalOffset: labelState?.verticalOffset,
      framesSinceChange: labelState?.framesSinceChange ?? 0,
      stabilityFrames: LABEL_POSITION_STABILITY_FRAMES,
      isPlaying: isPlaying,
    });

    if (result) {
      labelBounds.push(result.bounds);

      const prevState = labelPositionState.get(angleKey);
      const positionChanged =
        prevState?.multiplier !== result.multiplier ||
        prevState?.verticalOffset !== result.verticalOffset;

      if (prevState && !positionChanged) {
        newLabelState.set(angleKey, {
          multiplier: result.multiplier,
          verticalOffset: result.verticalOffset,
          framesSinceChange: prevState.framesSinceChange + 1,
        });
      } else {
        newLabelState.set(angleKey, {
          multiplier: result.multiplier,
          verticalOffset: result.verticalOffset,
          framesSinceChange: 0,
        });
      }
    }
  });

  return newLabelState;
}

export interface DrawObjectsOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  currentObjects: Array<{
    bbox: { x: number; y: number; width: number; height: number };
    [key: string]: unknown;
  }>;
  showLabels: boolean;
}

/**
 * Draw detected objects on the canvas.
 */
export function drawObjects({
  ctx,
  canvas,
  video,
  currentObjects,
  showLabels,
}: DrawObjectsOptions): void {
  const scaleX = canvas.width / video.videoWidth;
  const scaleY = canvas.height / video.videoHeight;

  const scaledObjects = currentObjects.map((obj) => ({
    ...obj,
    bbox: {
      x: obj.bbox.x * scaleX,
      y: obj.bbox.y * scaleY,
      width: obj.bbox.width * scaleX,
      height: obj.bbox.height * scaleY,
    },
  }));

  drawDetectedObjects(ctx, scaledObjects as any, {
    showLabel: showLabels,
    showConfidence: true,
    lineWidth: 3,
    fontSize: 14,
  });
}

export interface DrawProjectileOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  currentProjectile: {
    position: { x: number; y: number };
    trajectory?: Array<{ x: number; y: number; frame: number; timestamp: number }>;
    predictedPath?: Array<{ x: number; y: number; confidence: number }>;
    [key: string]: unknown;
  };
}

/**
 * Draw projectile detection results on the canvas.
 */
export function drawProjectileResult({
  ctx,
  canvas,
  video,
  currentProjectile,
}: DrawProjectileOptions): void {
  const scaleX = canvas.width / video.videoWidth;
  const scaleY = canvas.height / video.videoHeight;

  const scaledProjectile = {
    ...currentProjectile,
    position: {
      x: currentProjectile.position.x * scaleX,
      y: currentProjectile.position.y * scaleY,
    },
    trajectory: currentProjectile.trajectory?.map((point) => ({
      ...point,
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
    predictedPath: currentProjectile.predictedPath?.map((point) => ({
      ...point,
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  };

  drawProjectile(ctx, scaledProjectile as any, {
    ballColor: "#FFEB3B",
    ballRadius: 8,
    trajectoryColor: "rgba(255, 235, 59, 0.8)",
    trajectoryWidth: 3,
    predictionColor: "rgba(255, 235, 59, 0.5)",
    showVelocity: true,
  });
}

export interface DrawCourtOverlayOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  corners: CourtCorners;
  courtType?: string;
}

/**
 * Draw court overlay on the canvas.
 */
export function drawCourtOverlay({
  ctx,
  canvas,
  corners,
  courtType,
}: DrawCourtOverlayOptions): void {
  const scaleCorner = (corner: { x: number; y: number }) => ({
    x: corner.x * canvas.width,
    y: corner.y * canvas.height,
  });

  const topLeft = scaleCorner(corners.topLeft);
  const topRight = scaleCorner(corners.topRight);
  const bottomLeft = scaleCorner(corners.bottomLeft);
  const bottomRight = scaleCorner(corners.bottomRight);

  // Draw court boundary lines
  ctx.strokeStyle = "#00D4FF";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 4]);

  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.closePath();
  ctx.stroke();

  ctx.setLineDash([]);

  // Draw corner markers
  const cornerRadius = 6;
  const cornerColor = "#00D4FF";

  [topLeft, topRight, bottomLeft, bottomRight].forEach((corner) => {
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, cornerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = cornerColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(corner.x, corner.y, cornerRadius - 2, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
  });

  // Draw court type label
  if (courtType && courtType !== "unknown") {
    const labelText = `${courtType.toUpperCase()} COURT`;
    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    const textMetrics = ctx.measureText(labelText);
    const labelX = topLeft.x;
    const labelY = topLeft.y - 10;

    ctx.fillStyle = "rgba(0, 212, 255, 0.85)";
    const padding = 4;
    ctx.fillRect(labelX - padding, labelY - 12, textMetrics.width + padding * 2, 16);

    ctx.fillStyle = "#000000";
    ctx.fillText(labelText, labelX, labelY);
  }
}

// ============================================================================
// Body Orientation Drawing
// ============================================================================

export interface BodyOrientationOptions {
  /** Show orientation ellipse below feet */
  showEllipse: boolean;
  /** Show direction line/arrow */
  showDirectionLine: boolean;
  /** Show angle value in degrees */
  showAngleValue: boolean;
  /** Ellipse fill color */
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

export interface BodyOrientationResult {
  /** Orientation angle in degrees (0 = facing camera, 90 = facing right, -90 = facing left, 180 = facing away) */
  angle: number;
  /** Confidence of the estimation (0-1) */
  confidence: number;
  /** Center position of the body base (between ankles) */
  centerX: number;
  centerY: number;
}

// Track previous orientation for momentum smoothing
let previousOrientation: number | null = null;
let orientationMomentum: number = 0;

/**
 * Reset orientation tracking state (call when loading new video)
 */
export function resetOrientationTracking(): void {
  previousOrientation = null;
  orientationMomentum = 0;
}

/**
 * Calculate body orientation based on shoulder and hip positions.
 * Uses LEFT/RIGHT shoulder knowledge to accurately determine facing direction.
 * 
 * Key insight: In pose detection, "left" and "right" refer to the PERSON's left/right.
 * - When facing camera: person's LEFT shoulder appears on the RIGHT side of frame
 * - When facing left (turning left): LEFT shoulder moves toward left of frame, RIGHT shoulder moves right
 * - When facing right (turning right): RIGHT shoulder moves toward right of frame, LEFT shoulder moves left
 * 
 * The algorithm:
 * 1. Check if shoulders have "crossed" - indicating rotation past 90°
 * 2. Use relative X positions of left vs right body parts
 * 3. Apply rotational momentum for smooth transitions
 */
export function calculateBodyOrientation(
  keypoints: Array<{ x: number; y: number; score?: number; name?: string }>,
  model: "MoveNet" | "BlazePose",
  minConfidence: number = 0.3
): BodyOrientationResult | null {
  // Get keypoint indices based on model
  const indices = model === "BlazePose" ? {
    leftShoulder: 11,
    rightShoulder: 12,
    leftHip: 23,
    rightHip: 24,
    leftAnkle: 27,
    rightAnkle: 28,
    leftWrist: 15,
    rightWrist: 16,
  } : {
    leftShoulder: 5,
    rightShoulder: 6,
    leftHip: 11,
    rightHip: 12,
    leftAnkle: 15,
    rightAnkle: 16,
    leftWrist: 9,
    rightWrist: 10,
  };

  // Get keypoints
  const leftShoulder = keypoints[indices.leftShoulder];
  const rightShoulder = keypoints[indices.rightShoulder];
  const leftHip = keypoints[indices.leftHip];
  const rightHip = keypoints[indices.rightHip];
  const leftAnkle = keypoints[indices.leftAnkle];
  const rightAnkle = keypoints[indices.rightAnkle];
  const leftWrist = keypoints[indices.leftWrist];
  const rightWrist = keypoints[indices.rightWrist];

  // Check minimum keypoints are available (at least shoulders and hips)
  const shouldersValid = 
    leftShoulder && rightShoulder &&
    (leftShoulder.score ?? 0) >= minConfidence &&
    (rightShoulder.score ?? 0) >= minConfidence;
  
  const hipsValid = 
    leftHip && rightHip &&
    (leftHip.score ?? 0) >= minConfidence &&
    (rightHip.score ?? 0) >= minConfidence;

  if (!shouldersValid || !hipsValid) {
    return null;
  }

  // Calculate shoulder and hip midpoints
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;

  // Calculate widths (horizontal distance only for cleaner measurement)
  const shoulderWidthX = rightShoulder.x - leftShoulder.x;
  const hipWidthX = rightHip.x - leftHip.x;
  
  // Full euclidean width for ratio calculations
  const shoulderWidth = Math.sqrt(
    Math.pow(rightShoulder.x - leftShoulder.x, 2) +
    Math.pow(rightShoulder.y - leftShoulder.y, 2)
  );

  // Calculate torso height
  const torsoHeight = Math.sqrt(
    Math.pow(shoulderMidX - hipMidX, 2) +
    Math.pow(shoulderMidY - hipMidY, 2)
  );

  // ===== DIRECTION DETECTION =====
  // Key insight about coordinate system:
  // - Camera sees the person from the front
  // - Person's LEFT side appears on the RIGHT of the image (higher X)
  // - Person's RIGHT side appears on the LEFT of the image (lower X)
  //
  // Therefore when FACING CAMERA:
  //   leftShoulder.x > rightShoulder.x  →  shoulderWidthX < 0
  // When FACING AWAY:
  //   leftShoulder.x < rightShoulder.x  →  shoulderWidthX > 0
  
  // Facing toward camera = shoulderWidthX is NEGATIVE (normal view)
  // Facing away from camera = shoulderWidthX is POSITIVE (back view)
  const facingCamera = shoulderWidthX < 0;
  const hipsFacingCamera = hipWidthX < 0;
  
  // Calculate rotation magnitude from width compression
  const expectedRatio = 0.8;
  const currentRatio = Math.abs(shoulderWidth) / Math.max(torsoHeight, 1);
  const compressionFactor = Math.min(1, currentRatio / expectedRatio);
  
  // Base rotation angle from compression (0° when fully facing camera/away, 90° when sideways)
  const baseRotation = Math.acos(Math.max(0, Math.min(1, compressionFactor))) * (180 / Math.PI);
  
  // ===== DETERMINE LEFT vs RIGHT ROTATION =====
  // When turning LEFT (person's left, which appears to go RIGHT in image):
  //   - Left shoulder moves further right in image (X increases)
  //   - Right shoulder moves toward center
  //   - shoulderWidthX becomes more negative (or less positive if already facing away)
  //
  // When turning RIGHT (person's right, which appears to go LEFT in image):
  //   - Right shoulder moves further left in image (X decreases even more)
  //   - Left shoulder moves toward center  
  //   - shoulderWidthX becomes less negative (or more positive)
  
  // The key signal: compare how much each shoulder has moved from center
  const leftShoulderFromCenter = leftShoulder.x - shoulderMidX;   // Positive when facing camera
  const rightShoulderFromCenter = rightShoulder.x - shoulderMidX; // Negative when facing camera
  
  // When facing left: left shoulder extends more to the right (larger positive)
  // When facing right: right shoulder extends more to the left (larger negative magnitude)
  const shoulderBalance = leftShoulderFromCenter + rightShoulderFromCenter; // 0 when symmetric
  
  // Same for hips
  const leftHipFromCenter = leftHip.x - hipMidX;
  const rightHipFromCenter = rightHip.x - hipMidX;
  const hipBalance = leftHipFromCenter + rightHipFromCenter;
  
  // Torso twist indicates rotation
  const torsoTwist = shoulderMidX - hipMidX;
  
  // Wrist signal
  let wristSignal = 0;
  const leftWristValid = leftWrist && (leftWrist.score ?? 0) >= minConfidence;
  const rightWristValid = rightWrist && (rightWrist.score ?? 0) >= minConfidence;
  if (leftWristValid && rightWristValid) {
    const leftWristRelative = leftWrist.x - leftShoulder.x;
    const rightWristRelative = rightWrist.x - rightShoulder.x;
    wristSignal = leftWristRelative - rightWristRelative;
  }
  
  // ===== KNEE BEND DIRECTION SIGNAL =====
  // Knees can ONLY bend backward (lower leg behind thigh) - anatomical constraint
  // This helps determine orientation when knees are bent
  //
  // When facing LEFT: "backward" means ankle.x > knee.x (ankle to the right in image)
  // When facing RIGHT: "backward" means ankle.x < knee.x (ankle to the left in image)
  let kneeBendSignal = 0;
  const leftKneeIdx = model === "BlazePose" ? 25 : 13;
  const rightKneeIdx = model === "BlazePose" ? 26 : 14;
  const leftKnee = keypoints[leftKneeIdx];
  const rightKnee = keypoints[rightKneeIdx];
  
  const leftKneeValid = leftKnee && (leftKnee.score ?? 0) >= minConfidence;
  const rightKneeValid = rightKnee && (rightKnee.score ?? 0) >= minConfidence;
  const leftAnkleValidForKnee = leftAnkle && (leftAnkle.score ?? 0) >= minConfidence;
  const rightAnkleValidForKnee = rightAnkle && (rightAnkle.score ?? 0) >= minConfidence;
  
  // Check each knee - if bent, the ankle position relative to knee tells us direction
  if (leftKneeValid && leftAnkleValidForKnee && leftHip) {
    // Check if knee is bent: knee angle less than ~160° indicates bending
    // Simple check: is ankle not directly below knee?
    const leftKneeAnkleHorizontalDiff = Math.abs(leftAnkle.x - leftKnee.x);
    const leftKneeHipVerticalDist = Math.abs(leftKnee.y - leftHip.y);
    const leftKneeBent = leftKneeAnkleHorizontalDiff > leftKneeHipVerticalDist * 0.15;
    
    if (leftKneeBent) {
      // Ankle to the RIGHT of knee (positive offset) → facing LEFT → need NEGATIVE signal
      // Ankle to the LEFT of knee (negative offset) → facing RIGHT → need POSITIVE signal
      // So we NEGATE the offset
      const leftAnkleOffset = leftAnkle.x - leftKnee.x;
      kneeBendSignal -= leftAnkleOffset * 0.8; // NEGATED
    }
  }
  
  if (rightKneeValid && rightAnkleValidForKnee && rightHip) {
    const rightKneeAnkleHorizontalDiff = Math.abs(rightAnkle.x - rightKnee.x);
    const rightKneeHipVerticalDist = Math.abs(rightKnee.y - rightHip.y);
    const rightKneeBent = rightKneeAnkleHorizontalDiff > rightKneeHipVerticalDist * 0.15;
    
    if (rightKneeBent) {
      // Same logic: NEGATE the offset
      const rightAnkleOffset = rightAnkle.x - rightKnee.x;
      kneeBendSignal -= rightAnkleOffset * 0.8; // NEGATED
    }
  }
  
  // Combine direction signals
  // Negative = facing left (person's left), Positive = facing right (person's right)
  const directionSignal = 
    (shoulderBalance * 0.3) +
    (hipBalance * 0.25) +
    (torsoTwist * 0.15) +
    (wristSignal * 0.1) +
    (kneeBendSignal * 0.2);
  
  // Calculate final angle
  let orientationAngle: number;
  
  if (facingCamera && hipsFacingCamera) {
    // Facing toward camera - angle between -90° and 90°
    // directionSignal > 0 means turned to person's right (arrow should point right)
    // directionSignal < 0 means turned to person's left (arrow should point left)
    orientationAngle = directionSignal > 0 ? baseRotation : -baseRotation;
  } else if (!facingCamera && !hipsFacingCamera) {
    // Facing away from camera - angle beyond ±90°
    orientationAngle = directionSignal > 0 ? (180 - baseRotation) : -(180 - baseRotation);
  } else {
    // Mixed signals - transitioning around 90°
    orientationAngle = directionSignal > 0 ? 90 : -90;
  }
  
  // ===== APPLY MOMENTUM SMOOTHING =====
  if (previousOrientation !== null) {
    // Calculate angular difference
    let diff = orientationAngle - previousOrientation;
    
    // Handle wrap-around at ±180°
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    // Update momentum (with decay)
    orientationMomentum = orientationMomentum * 0.7 + diff * 0.3;
    
    // Apply smoothing - blend toward new value but respect momentum
    const smoothingFactor = 0.4; // Higher = more responsive, lower = smoother
    orientationAngle = previousOrientation + diff * smoothingFactor + orientationMomentum * 0.2;
    
    // Normalize to -180 to 180
    while (orientationAngle > 180) orientationAngle -= 360;
    while (orientationAngle < -180) orientationAngle += 360;
  }
  
  // Store for next frame
  previousOrientation = orientationAngle;
  
  // Clamp to reasonable range
  orientationAngle = Math.max(-180, Math.min(180, orientationAngle));

  // Calculate center position (between ankles if available, otherwise between hips)
  let centerX = hipMidX;
  let centerY = hipMidY;
  
  const leftAnkleValid = leftAnkle && (leftAnkle.score ?? 0) >= minConfidence;
  const rightAnkleValid = rightAnkle && (rightAnkle.score ?? 0) >= minConfidence;
  
  if (leftAnkleValid && rightAnkleValid) {
    centerX = (leftAnkle.x + rightAnkle.x) / 2;
    centerY = Math.max(leftAnkle.y, rightAnkle.y) + shoulderWidth * 0.3; // Slightly below ankles
  } else if (leftAnkleValid) {
    centerX = leftAnkle.x;
    centerY = leftAnkle.y + shoulderWidth * 0.3;
  } else if (rightAnkleValid) {
    centerX = rightAnkle.x;
    centerY = rightAnkle.y + shoulderWidth * 0.3;
  } else {
    // Use hip position and estimate ankle position
    centerY = hipMidY + torsoHeight * 0.8;
  }

  // Calculate confidence based on keypoint scores
  const scores = [
    leftShoulder.score ?? 0,
    rightShoulder.score ?? 0,
    leftHip.score ?? 0,
    rightHip.score ?? 0,
  ];
  const confidence = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    angle: orientationAngle,
    confidence,
    centerX,
    centerY,
  };
}

/**
 * Draw body orientation indicator on canvas
 */
export function drawBodyOrientation(
  ctx: CanvasRenderingContext2D,
  keypoints: Array<{ x: number; y: number; score?: number; name?: string }>,
  model: "MoveNet" | "BlazePose",
  scaleX: number,
  scaleY: number,
  options: BodyOrientationOptions
): BodyOrientationResult | null {
  const orientation = calculateBodyOrientation(keypoints, model, options.minConfidence);
  
  if (!orientation) {
    return null;
  }

  // Scale center position
  const centerX = orientation.centerX * scaleX;
  const centerY = orientation.centerY * scaleY;
  
  // Calculate estimated body size for dynamic scaling (same approach as pose keypoints)
  const scaledKeypoints = keypoints.map((kp) => ({
    ...kp,
    x: kp.x * scaleX,
    y: kp.y * scaleY,
  }));
  const validKeypoints = scaledKeypoints.filter((kp) => (kp.score ?? 0) > options.minConfidence);
  
  let estimatedHeight = 400; // Default fallback (reference body height)
  if (validKeypoints.length > 0) {
    const yCoords = validKeypoints.map((kp) => kp.y);
    estimatedHeight = Math.max(...yCoords) - Math.min(...yCoords);
  }
  
  // Ellipse dimensions - SCALED based on body size
  // options.ellipseSize is the target width in pixels (200-400 range)
  // Scale by body height relative to reference (400px)
  const sizeScale = Math.max(0.3, Math.min(1.5, estimatedHeight / 400));
  const ellipseRadiusX = (options.ellipseSize / 2) * sizeScale; // Convert width to radius
  const ellipseRadiusY = ellipseRadiusX * 0.4; // Flatten for perspective effect
  
  // Direction line length - arrow stays within the ellipse
  const lineLength = ellipseRadiusX * 0.85 * options.lineLength;
  
  // Convert orientation angle to drawing angle
  // 0° (facing camera) = arrow points DOWN (6 o'clock)
  // 90° (facing right) = arrow points RIGHT (3 o'clock)
  // -90° (facing left) = arrow points LEFT (9 o'clock)
  // 180° (facing away) = arrow points UP (12 o'clock)
  const angleRad = (90 - orientation.angle) * (Math.PI / 180);
  
  // Draw ellipse - FIXED position, like a watch face on the floor
  if (options.showEllipse) {
    ctx.save();
    
    // Draw the ellipse (no rotation - stays like a compass/watch)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, ellipseRadiusX, ellipseRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = options.ellipseColor;
    ctx.fill();
    ctx.strokeStyle = options.lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw tick marks like a compass (N, E, S, W positions)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    const tickLength = 6;
    for (let i = 0; i < 4; i++) {
      const tickAngle = (i * 90) * (Math.PI / 180);
      const innerX = centerX + Math.cos(tickAngle) * (ellipseRadiusX - tickLength);
      const innerY = centerY + Math.sin(tickAngle) * (ellipseRadiusY - tickLength);
      const outerX = centerX + Math.cos(tickAngle) * ellipseRadiusX;
      const outerY = centerY + Math.sin(tickAngle) * ellipseRadiusY;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // Draw direction arrow - rotates like a clock hand
  if (options.showDirectionLine) {
    // Calculate end point of arrow (accounting for ellipse shape)
    const endX = centerX + Math.cos(angleRad) * lineLength;
    const endY = centerY + Math.sin(angleRad) * (lineLength * 0.4); // Scale Y for perspective
    
    ctx.save();
    ctx.strokeStyle = options.lineColor;
    ctx.fillStyle = options.lineColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    // Main line from center to edge
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Arrow head
    const arrowSize = 10;
    const arrowAngle = Math.PI / 6;
    // Calculate arrow direction based on actual line direction
    const arrowDir = Math.atan2(endY - centerY, endX - centerX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(arrowDir - arrowAngle),
      endY - arrowSize * Math.sin(arrowDir - arrowAngle)
    );
    ctx.lineTo(
      endX - arrowSize * Math.cos(arrowDir + arrowAngle),
      endY - arrowSize * Math.sin(arrowDir + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw a small center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  // Draw angle value
  if (options.showAngleValue) {
    const textX = centerX;
    const textY = centerY + ellipseRadiusY + 20;
    
    ctx.save();
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    const angleText = `${Math.round(orientation.angle)}°`;
    const textMetrics = ctx.measureText(angleText);
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    const padding = 4;
    ctx.fillRect(
      textX - textMetrics.width / 2 - padding,
      textY - padding,
      textMetrics.width + padding * 2,
      16 + padding * 2
    );
    
    // Text
    ctx.fillStyle = options.textColor;
    ctx.fillText(angleText, textX, textY);
    
    ctx.restore();
  }
  
  return orientation;
}

