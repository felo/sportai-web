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
  } = options;

  // Draw connections first (so keypoints appear on top)
  ctx.strokeStyle = connectionColor;
  ctx.lineWidth = connectionWidth;
  ctx.lineCap = "round";

  for (const connection of POSE_CONNECTIONS) {
    const startPoint = keypoints[connection.start];
    const endPoint = keypoints[connection.end];

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
  for (const keypoint of keypoints) {
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

