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

// BlazePose keypoint indices (33 keypoints)
// Mapping to common body parts for compatibility
export const BLAZEPOSE_KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// BlazePose connections (mapped to similar structure as MoveNet for 2D display)
// Simplified to match main body structure - using primary keypoints only
export const BLAZEPOSE_CONNECTIONS_2D: PoseConnection[] = [
  // Face (simplified - just main features)
  { start: BLAZEPOSE_KEYPOINTS.LEFT_EAR, end: BLAZEPOSE_KEYPOINTS.LEFT_EYE },
  { start: BLAZEPOSE_KEYPOINTS.LEFT_EYE, end: BLAZEPOSE_KEYPOINTS.NOSE },
  { start: BLAZEPOSE_KEYPOINTS.NOSE, end: BLAZEPOSE_KEYPOINTS.RIGHT_EYE },
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_EYE, end: BLAZEPOSE_KEYPOINTS.RIGHT_EAR },
  
  // Torso
  { start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER },
  { start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.LEFT_HIP },
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.RIGHT_HIP },
  { start: BLAZEPOSE_KEYPOINTS.LEFT_HIP, end: BLAZEPOSE_KEYPOINTS.RIGHT_HIP },
  
  // Left Arm (main chain only)
  { start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW },
  { start: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW, end: BLAZEPOSE_KEYPOINTS.LEFT_WRIST },
  
  // Right Arm (main chain only)
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW },
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW, end: BLAZEPOSE_KEYPOINTS.RIGHT_WRIST },
  
  // Left Leg (main chain only)
  { start: BLAZEPOSE_KEYPOINTS.LEFT_HIP, end: BLAZEPOSE_KEYPOINTS.LEFT_KNEE },
  { start: BLAZEPOSE_KEYPOINTS.LEFT_KNEE, end: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE },
  
  // Right Leg (main chain only)
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_HIP, end: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE },
  { start: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE, end: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE },
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
  faceIndices?: number[]; // Custom face indices to hide when showFace is false
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  options: DrawOptions = {},
  connections?: PoseConnection[] // Allow custom connections for different models
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
    faceIndices,
  } = options;

  // Face keypoint indices (0-4 in MoveNet, 0-10 in BlazePose)
  // Use provided indices or default to MoveNet's 0-4
  const FACE_INDICES = faceIndices || [
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

  // Use provided connections or default MoveNet connections
  const connectionsToUse = connections || POSE_CONNECTIONS;

  for (const connection of connectionsToUse) {
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
  // Use atan2 to get the signed angle
  // Canvas Y is down, so we calculate angleBA and angleBC
  // angleBA is angle from B to A
  const angleBA = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  const angleBC = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);
  
  // Calculate clockwise difference from BA to BC
  // Standard math: counter-clockwise. Canvas Y-down: clockwise logic works better visually
  let diff = angleBC - angleBA;
  
  // Normalize to 0-2PI
  if (diff < 0) diff += 2 * Math.PI;
  
  // Convert to degrees
  const angleDeg = (diff * 180) / Math.PI;
  
  // Clamp to 0-180 range for biomechanical relevance
  // If angle > 180, return the smaller interior angle (360 - angle)
  return angleDeg > 180 ? 360 - angleDeg : angleDeg;
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
    fontSize = 20, // Increased default for better readability
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
  // Use false (clockwise) for Y-down canvas to match the calculated angle direction
  ctx.arc(pointB.x, pointB.y, radius, angleBA, angleBC, false);
  ctx.stroke();

  // Draw angle text with background mask for visibility
  // Calculate midpoint of the arc for text placement
  // If angleBC < angleBA (crossing 0), we need to handle wrap-around
  let midAngle = (angleBA + angleBC) / 2;
  if (angleBC < angleBA) {
    midAngle += Math.PI; // Add 180 degrees to get to the other side
  }
  
  // Place text on opposite side of arc (flip by 180 degrees)
  const textAngle = midAngle + Math.PI;
  const textX = pointB.x + radius * 0.7 * Math.cos(textAngle);
  const textY = pointB.y + radius * 0.7 * Math.sin(textAngle);
  
  const angleText = `${angle.toFixed(1)}°`;
  ctx.font = `bold ${fontSize}px sans-serif`;
  
  // Determine text alignment based on which side of the joint the text is positioned
  // This ensures the edge of the text closest to the joint is on the same side as the arc
  const cosTextAngle = Math.cos(textAngle);
  let textAlign: CanvasTextAlign;
  if (cosTextAngle > 0.3) {
    // Text is to the right of joint, align left so left edge is near joint
    textAlign = "left";
  } else if (cosTextAngle < -0.3) {
    // Text is to the left of joint, align right so right edge is near joint
    textAlign = "right";
  } else {
    // Text is above or below joint, center it
    textAlign = "center";
  }
  
  ctx.textAlign = textAlign;
  ctx.textBaseline = "middle";
  
  // Measure text to size the background
  const textMetrics = ctx.measureText(angleText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  const padding = 6;
  const cornerRadius = 4;
  
  // Draw dark background mask behind text (rounded rectangle)
  // Adjust background position based on text alignment
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; // Semi-transparent black background
  ctx.beginPath();
  let bgX: number;
  if (textAlign === "left") {
    bgX = textX - padding;
  } else if (textAlign === "right") {
    bgX = textX - textWidth - padding;
  } else {
    bgX = textX - textWidth / 2 - padding;
  }
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
  ctx.lineWidth = Math.max(2, fontSize * 0.15); // Thinner stroke for crispness
  ctx.lineJoin = "round";
  ctx.strokeText(angleText, textX, textY);
  
  // Draw text on top
  ctx.fillStyle = textColor;
  ctx.fillText(angleText, textX, textY);
}

