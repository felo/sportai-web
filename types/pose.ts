import type { Keypoint } from "@tensorflow-models/pose-detection";

export interface PoseConnection {
  start: number;
  end: number;
}

// MoveNet keypoint indices
export const POSE_KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;

// Define skeleton connections for drawing
export const POSE_CONNECTIONS: PoseConnection[] = [
  // Face
  { start: POSE_KEYPOINTS.LEFT_EAR, end: POSE_KEYPOINTS.LEFT_EYE },
  { start: POSE_KEYPOINTS.LEFT_EYE, end: POSE_KEYPOINTS.NOSE },
  { start: POSE_KEYPOINTS.NOSE, end: POSE_KEYPOINTS.RIGHT_EYE },
  { start: POSE_KEYPOINTS.RIGHT_EYE, end: POSE_KEYPOINTS.RIGHT_EAR },
  
  // Torso
  { start: POSE_KEYPOINTS.LEFT_SHOULDER, end: POSE_KEYPOINTS.RIGHT_SHOULDER },
  { start: POSE_KEYPOINTS.LEFT_SHOULDER, end: POSE_KEYPOINTS.LEFT_HIP },
  { start: POSE_KEYPOINTS.RIGHT_SHOULDER, end: POSE_KEYPOINTS.RIGHT_HIP },
  { start: POSE_KEYPOINTS.LEFT_HIP, end: POSE_KEYPOINTS.RIGHT_HIP },
  
  // Left Arm
  { start: POSE_KEYPOINTS.LEFT_SHOULDER, end: POSE_KEYPOINTS.LEFT_ELBOW },
  { start: POSE_KEYPOINTS.LEFT_ELBOW, end: POSE_KEYPOINTS.LEFT_WRIST },
  
  // Right Arm
  { start: POSE_KEYPOINTS.RIGHT_SHOULDER, end: POSE_KEYPOINTS.RIGHT_ELBOW },
  { start: POSE_KEYPOINTS.RIGHT_ELBOW, end: POSE_KEYPOINTS.RIGHT_WRIST },
  
  // Left Leg
  { start: POSE_KEYPOINTS.LEFT_HIP, end: POSE_KEYPOINTS.LEFT_KNEE },
  { start: POSE_KEYPOINTS.LEFT_KNEE, end: POSE_KEYPOINTS.LEFT_ANKLE },
  
  // Right Leg
  { start: POSE_KEYPOINTS.RIGHT_HIP, end: POSE_KEYPOINTS.RIGHT_KNEE },
  { start: POSE_KEYPOINTS.RIGHT_KNEE, end: POSE_KEYPOINTS.RIGHT_ANKLE },
];

export interface DrawOptions {
  keypointColor?: string;
  keypointOutlineColor?: string;
  keypointRadius?: number;
  connectionColor?: string;
  connectionWidth?: number;
  minConfidence?: number;
  showConfidence?: boolean;
  showFace?: boolean;
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  options: DrawOptions = {}
) {
  const {
    keypointColor = "#FF9800", // Orange center
    keypointOutlineColor = "#7ADB8F", // Mint green outline
    keypointRadius = 4,
    connectionColor = "#7ADB8F",
    connectionWidth = 2,
    minConfidence = 0.3,
    showConfidence = false,
    showFace = false, // Default to false as requested
  } = options;

  // Face keypoint indices (0-4 in MoveNet)
  const FACE_INDICES = [
    POSE_KEYPOINTS.NOSE,
    POSE_KEYPOINTS.LEFT_EYE,
    POSE_KEYPOINTS.RIGHT_EYE,
    POSE_KEYPOINTS.LEFT_EAR,
    POSE_KEYPOINTS.RIGHT_EAR
  ];

  // Draw connections first (so keypoints appear on top)
  ctx.strokeStyle = connectionColor;
  ctx.lineWidth = connectionWidth;
  ctx.lineCap = "round";

  for (const connection of POSE_CONNECTIONS) {
    const startPoint = keypoints[connection.start];
    const endPoint = keypoints[connection.end];

    // Check if either point is a face point and if face rendering is disabled
    const isFaceConnection = FACE_INDICES.includes(connection.start) || FACE_INDICES.includes(connection.end);
    if (!showFace && isFaceConnection) continue;

    if (
      startPoint &&
      endPoint &&
      (startPoint.score ?? 0) > minConfidence &&
      (endPoint.score ?? 0) > minConfidence
    ) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
  }

  // Draw keypoints with outline
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];
    
    // Check if point is a face point and if face rendering is disabled
    if (!showFace && FACE_INDICES.includes(i)) continue;

    if ((keypoint.score ?? 0) > minConfidence) {
      // Draw outline
      ctx.fillStyle = keypointOutlineColor;
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, keypointRadius + 1.5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw center
      ctx.fillStyle = keypointColor;
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, keypointRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Optionally show confidence score
      if (showConfidence && keypoint.score !== undefined) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.fillText(
          keypoint.score.toFixed(2),
          keypoint.x + keypointRadius + 2,
          keypoint.y
        );
      }
    }
  }
}

/**
 * Calculate angle between three points (in degrees)
 * Point B is the vertex (center point)
 */
export function calculateAngle(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number {
  // Vector from B to A
  const vecBA = { x: pointA.x - pointB.x, y: pointA.y - pointB.y };
  // Vector from B to C
  const vecBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
  
  // Calculate dot product and magnitudes
  const dotProduct = vecBA.x * vecBC.x + vecBA.y * vecBC.y;
  const magBA = Math.sqrt(vecBA.x * vecBA.x + vecBA.y * vecBA.y);
  const magBC = Math.sqrt(vecBC.x * vecBC.x + vecBC.y * vecBC.y);
  
  // Avoid division by zero
  if (magBA === 0 || magBC === 0) return 0;
  
  // Calculate angle in radians, then convert to degrees
  const cosAngle = dotProduct / (magBA * magBC);
  // Clamp to [-1, 1] to avoid NaN from Math.acos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  return angleDeg;
}

/**
 * Draw angle measurement between three keypoints
 */
export function drawAngle(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  jointIndices: [number, number, number], // [pointA, pointB (vertex), pointC]
  options: {
    lineColor?: string;
    arcColor?: string;
    textColor?: string;
    lineWidth?: number;
    fontSize?: number;
    minConfidence?: number;
  } = {}
) {
  const {
    lineColor = "#A855F7", // Purple
    arcColor = "rgba(168, 85, 247, 0.3)", // Semi-transparent purple
    textColor = "#FFFFFF", // White
    lineWidth = 2,
    fontSize = 14,
    minConfidence = 0.3,
  } = options;

  const [idxA, idxB, idxC] = jointIndices;
  
  const pointA = keypoints[idxA];
  const pointB = keypoints[idxB];
  const pointC = keypoints[idxC];

  // Check if all keypoints are valid
  if (
    !pointA || !pointB || !pointC ||
    (pointA.score ?? 0) < minConfidence ||
    (pointB.score ?? 0) < minConfidence ||
    (pointC.score ?? 0) < minConfidence
  ) {
    return;
  }

  // Calculate angle
  const angle = calculateAngle(pointA, pointB, pointC);

  // Draw lines from vertex to the two points
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(pointB.x, pointB.y);
  ctx.lineTo(pointA.x, pointA.y);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(pointB.x, pointB.y);
  ctx.lineTo(pointC.x, pointC.y);
  ctx.stroke();

  // Draw arc
  const radius = Math.min(
    Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)),
    Math.sqrt(Math.pow(pointC.x - pointB.x, 2) + Math.pow(pointC.y - pointB.y, 2))
  ) * 0.5; // Use 50% of the shorter line as arc radius

  // Calculate angles for arc
  const angleBA = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  const angleBC = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);

  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pointB.x, pointB.y, radius, angleBA, angleBC, false);
  ctx.stroke();

  // Draw angle text with background mask for visibility
  const textX = pointB.x + radius * 0.7 * Math.cos((angleBA + angleBC) / 2);
  const textY = pointB.y + radius * 0.7 * Math.sin((angleBA + angleBC) / 2);
  
  const angleText = `${angle.toFixed(1)}°`;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Measure text to size the background
  const textMetrics = ctx.measureText(angleText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  const padding = 6;
  const cornerRadius = 4;
  
  // Draw dark background mask behind text (rounded rectangle)
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; // Semi-transparent black background
  ctx.beginPath();
  const bgX = textX - textWidth / 2 - padding;
  const bgY = textY - textHeight / 2 - padding;
  const bgWidth = textWidth + padding * 2;
  const bgHeight = textHeight + padding * 2;
  
  // Draw rounded rectangle manually for compatibility
  ctx.moveTo(bgX + cornerRadius, bgY);
  ctx.lineTo(bgX + bgWidth - cornerRadius, bgY);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + cornerRadius);
  ctx.lineTo(bgX + bgWidth, bgY + bgHeight - cornerRadius);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - cornerRadius, bgY + bgHeight);
  ctx.lineTo(bgX + cornerRadius, bgY + bgHeight);
  ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - cornerRadius);
  ctx.lineTo(bgX, bgY + cornerRadius);
  ctx.quadraticCurveTo(bgX, bgY, bgX + cornerRadius, bgY);
  ctx.closePath();
  ctx.fill();
  
  // Draw text outline/stroke for extra visibility
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeText(angleText, textX, textY);
  
  // Draw text on top
  ctx.fillStyle = textColor;
  ctx.fillText(angleText, textX, textY);
}

