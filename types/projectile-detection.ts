/**
 * Drawing utilities for projectile detection (TrackNet) overlays
 */

import type { ProjectileDetectionResult, ProjectileDrawOptions } from "./detection";

/**
 * Draw detected ball/projectile
 */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  result: ProjectileDetectionResult,
  options: ProjectileDrawOptions = {}
) {
  const {
    ballColor = "#FFEB3B",
    ballRadius = 6,
    trajectoryColor = "rgba(255, 235, 59, 0.6)",
    trajectoryWidth = 2,
    predictionColor = "rgba(255, 235, 59, 0.3)",
    showVelocity = false,
    velocityColor = "#FFFFFF",
  } = options;

  const { position, confidence, trajectory, predictedPath, velocity } = result;

  // Draw trajectory path
  if (trajectory && trajectory.length > 1) {
    ctx.strokeStyle = trajectoryColor;
    ctx.lineWidth = trajectoryWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    
    for (let i = 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    
    ctx.stroke();

    // Draw trajectory points
    for (const point of trajectory) {
      ctx.fillStyle = trajectoryColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Draw predicted path
  if (predictedPath && predictedPath.length > 0) {
    ctx.strokeStyle = predictionColor;
    ctx.lineWidth = trajectoryWidth;
    ctx.lineCap = "round";
    ctx.setLineDash([5, 5]); // Dashed line for prediction

    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    
    for (const point of predictedPath) {
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
  }

  // Draw current ball position with glow effect
  // Outer glow
  const gradient = ctx.createRadialGradient(
    position.x,
    position.y,
    0,
    position.x,
    position.y,
    ballRadius + 4
  );
  gradient.addColorStop(0, ballColor);
  gradient.addColorStop(0.5, ballColor);
  gradient.addColorStop(1, "rgba(255, 235, 59, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(position.x, position.y, ballRadius + 4, 0, 2 * Math.PI);
  ctx.fill();

  // Ball core
  ctx.fillStyle = ballColor;
  ctx.beginPath();
  ctx.arc(position.x, position.y, ballRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Ball outline
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(position.x, position.y, ballRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // Draw velocity indicator
  if (showVelocity && velocity && velocity.magnitude > 0) {
    const velocityKmh = velocity.magnitude * 3.6; // Convert m/s to km/h (placeholder conversion)
    const label = `${velocityKmh.toFixed(1)} km/h`;
    
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const padding = 4;
    
    // Draw background
    ctx.fillRect(
      position.x - textWidth / 2 - padding,
      position.y - ballRadius - 20 - padding,
      textWidth + padding * 2,
      16 + padding * 2
    );
    
    // Draw text
    ctx.fillStyle = velocityColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, position.x, position.y - ballRadius - 12);
  }

  // Draw confidence indicator
  if (confidence < 1.0) {
    const confidenceLabel = `${(confidence * 100).toFixed(0)}%`;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    const textMetrics = ctx.measureText(confidenceLabel);
    
    ctx.fillRect(
      position.x - textMetrics.width / 2 - 2,
      position.y + ballRadius + 4,
      textMetrics.width + 4,
      14
    );
    
    ctx.fillStyle = confidence > 0.7 ? "#00FF00" : confidence > 0.5 ? "#FFEB3B" : "#FF5252";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(confidenceLabel, position.x, position.y + ballRadius + 6);
  }
}

/**
 * Draw trajectory heatmap (for visualization)
 */
export function drawTrajectoryHeatmap(
  ctx: CanvasRenderingContext2D,
  trajectory: Array<{ x: number; y: number; frame: number }>,
  options: { color?: string; maxIntensity?: number } = {}
) {
  const { color = "#FFEB3B", maxIntensity = 10 } = options;

  // Count visits to each cell (simple heatmap)
  const cellSize = 20;
  const heatmap = new Map<string, number>();

  for (const point of trajectory) {
    const cellX = Math.floor(point.x / cellSize);
    const cellY = Math.floor(point.y / cellSize);
    const key = `${cellX},${cellY}`;
    heatmap.set(key, (heatmap.get(key) || 0) + 1);
  }

  // Draw heatmap
  heatmap.forEach((count, key) => {
    const [cellX, cellY] = key.split(",").map(Number);
    const intensity = Math.min(count / maxIntensity, 1);
    
    // Parse color and add alpha
    ctx.fillStyle = `rgba(255, 235, 59, ${intensity * 0.3})`;
    ctx.fillRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize);
  });
}















