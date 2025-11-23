/**
 * Drawing utilities for object detection (YOLO) overlays
 */

import type { ObjectDetectionResult, ObjectDrawOptions } from "./detection";

/**
 * Draw bounding box with label for detected object
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  result: ObjectDetectionResult,
  options: ObjectDrawOptions = {}
) {
  const {
    boxColor = "#00FF00",
    lineWidth = 3,
    showLabel = true,
    showConfidence = true,
    fontSize = 14,
    labelBackground = "rgba(0, 0, 0, 0.7)",
  } = options;

  const { bbox, class: className, confidence, trackingId } = result;

  // Draw bounding box
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

  // Draw label with confidence and tracking ID
  if (showLabel) {
    let label = className;
    if (showConfidence) {
      label += ` ${(confidence * 100).toFixed(0)}%`;
    }
    if (trackingId !== undefined) {
      label += ` #${trackingId}`;
    }

    // Set up font and text properties
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = fontSize * 1.2; // Add some breathing room
    const padding = 6;

    // Position label above box (or below if too close to top)
    let labelX = bbox.x;
    let labelY = bbox.y - textHeight - padding * 2;
    
    // If too close to top, position below the box
    if (labelY < 0) {
      labelY = bbox.y + bbox.height;
    }
    
    // If too close to left edge, adjust
    if (labelX < 0) {
      labelX = 0;
    }
    
    // If label would go off right edge, align to right side of box
    if (labelX + textWidth + padding * 2 > ctx.canvas.width) {
      labelX = Math.max(0, bbox.x + bbox.width - textWidth - padding * 2);
    }

    // Draw label background (rounded corners for better look)
    ctx.fillStyle = labelBackground;
    const bgX = labelX;
    const bgY = labelY;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;
    
    // Simple rounded rectangle
    const radius = 3;
    ctx.beginPath();
    ctx.moveTo(bgX + radius, bgY);
    ctx.lineTo(bgX + bgWidth - radius, bgY);
    ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
    ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
    ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
    ctx.lineTo(bgX + radius, bgY + bgHeight);
    ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
    ctx.lineTo(bgX, bgY + radius);
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
    ctx.closePath();
    ctx.fill();

    // Draw label text
    ctx.fillStyle = "#FFFFFF"; // Always white text for better contrast
    ctx.fillText(label, labelX + padding, labelY + padding);
  }
}

/**
 * Draw multiple detected objects
 */
export function drawDetectedObjects(
  ctx: CanvasRenderingContext2D,
  results: ObjectDetectionResult[],
  options: ObjectDrawOptions = {}
) {
  // Color palette for different classes
  const classColors: Record<string, string> = {
    person: "#FF9800",
    "sports ball": "#E91E63",
    "tennis racket": "#2196F3",
    bicycle: "#4CAF50",
    car: "#9C27B0",
    // Default color for unknown classes
  };

  for (const result of results) {
    const color = classColors[result.class] || options.boxColor || "#00FF00";
    drawBoundingBox(ctx, result, { ...options, boxColor: color });
  }
}

/**
 * Get class color for consistent coloring
 */
export function getClassColor(className: string): string {
  const classColors: Record<string, string> = {
    person: "#FF9800",
    "sports ball": "#E91E63",
    "tennis racket": "#2196F3",
    bicycle: "#4CAF50",
    car: "#9C27B0",
    motorcycle: "#673AB7",
    bottle: "#009688",
    cup: "#00BCD4",
    backpack: "#795548",
    // Add more as needed
  };

  return classColors[className] || "#00FF00";
}

