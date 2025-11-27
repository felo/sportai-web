/**
 * SAM 2 (Segment Anything Model 2) visualization utilities
 * Handles rendering of segmentation masks and prompts
 */

import type { SAM2DetectionResult, SAM2DrawOptions, SAM2Mask, SAM2Point } from "./detection";

/**
 * Draw SAM 2 segmentation masks on a canvas
 */
export function drawSAM2Masks(
  ctx: CanvasRenderingContext2D,
  detections: SAM2DetectionResult[],
  options: SAM2DrawOptions = {}
): void {
  const {
    maskColor,
    maskOpacity = 0.5,
    boundingBoxColor = "#00FF00",
    lineWidth = 2,
    showPromptPoints = true,
    promptPointColor = "#FF0000",
    promptPointRadius = 5,
  } = options;

  detections.forEach((detection, index) => {
    // Auto-generate color if not specified
    const color = maskColor || generateColor(index);

    // Draw each mask
    detection.masks.forEach((mask) => {
      drawMask(ctx, mask, color, maskOpacity);
    });

    // Draw bounding box if available
    if (detection.bbox) {
      drawBoundingBox(ctx, detection.bbox, boundingBoxColor, lineWidth);
    }

    // Draw prompt points if available
    if (showPromptPoints && detection.prompt?.points) {
      drawPromptPoints(ctx, detection.prompt.points, promptPointColor, promptPointRadius);
    }

    // Draw prompt box if available
    if (showPromptPoints && detection.prompt?.box) {
      drawBoundingBox(ctx, detection.prompt.box, promptPointColor, lineWidth);
    }
  });
}

/**
 * Draw a single segmentation mask
 */
function drawMask(
  ctx: CanvasRenderingContext2D,
  mask: SAM2Mask,
  color: string,
  opacity: number
): void {
  const { data, width, height } = mask;

  // Create ImageData for the mask
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  // Parse color
  const rgb = hexToRgb(color);

  // Fill mask with semi-transparent color
  for (let i = 0; i < data.length; i++) {
    const isMask = data[i] > 0;
    const pixelIndex = i * 4;

    if (isMask) {
      pixels[pixelIndex] = rgb.r;
      pixels[pixelIndex + 1] = rgb.g;
      pixels[pixelIndex + 2] = rgb.b;
      pixels[pixelIndex + 3] = 255 * opacity; // Alpha
    } else {
      pixels[pixelIndex + 3] = 0; // Transparent
    }
  }

  // Create temporary canvas for the mask
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return;

  maskCtx.putImageData(imageData, 0, 0);

  // Draw mask onto main canvas (scaled to fit)
  ctx.drawImage(maskCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Draw bounding box
 */
function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  bbox: { x: number; y: number; width: number; height: number },
  color: string,
  lineWidth: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
}

/**
 * Draw prompt points
 */
function drawPromptPoints(
  ctx: CanvasRenderingContext2D,
  points: SAM2Point[],
  color: string,
  radius: number
): void {
  points.forEach((point) => {
    ctx.fillStyle = point.label === 1 ? color : "#0000FF"; // Red for foreground, blue for background
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Add border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 0 }; // Default to green
}

/**
 * Generate a distinct color for each detection
 */
function generateColor(index: number): string {
  const hue = (index * 137.508) % 360; // Use golden angle for good distribution
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Convert mask to contour points (for alternative visualization)
 */
export function maskToContour(mask: SAM2Mask): Array<{ x: number; y: number }> {
  const { data, width, height } = mask;
  const contour: Array<{ x: number; y: number }> = [];

  // Simple contour extraction: find edges between mask and non-mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isMask = data[i] > 0;

      if (isMask) {
        // Check if this is an edge pixel
        const isEdge =
          x === 0 ||
          x === width - 1 ||
          y === 0 ||
          y === height - 1 ||
          data[i - 1] === 0 || // Left
          data[i + 1] === 0 || // Right
          data[i - width] === 0 || // Top
          data[i + width] === 0; // Bottom

        if (isEdge) {
          contour.push({ x, y });
        }
      }
    }
  }

  return contour;
}

/**
 * Draw mask as contour (outline only)
 */
export function drawSAM2Contours(
  ctx: CanvasRenderingContext2D,
  detections: SAM2DetectionResult[],
  options: SAM2DrawOptions = {}
): void {
  const {
    maskColor,
    lineWidth = 2,
  } = options;

  detections.forEach((detection, index) => {
    const color = maskColor || generateColor(index);

    detection.masks.forEach((mask) => {
      const contour = maskToContour(mask);

      if (contour.length === 0) return;

      // Scale contour to canvas size
      const scaleX = ctx.canvas.width / mask.width;
      const scaleY = ctx.canvas.height / mask.height;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      contour.forEach((point, i) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.stroke();
    });
  });
}

/**
 * Calculate mask statistics (area, center of mass, etc.)
 */
export function calculateMaskStats(mask: SAM2Mask): {
  area: number;
  centerX: number;
  centerY: number;
  coverage: number; // Percentage of image covered
} {
  const { data, width, height } = mask;
  
  let area = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (data[i] > 0) {
        area++;
        sumX += x;
        sumY += y;
      }
    }
  }

  const centerX = area > 0 ? sumX / area : 0;
  const centerY = area > 0 ? sumY / area : 0;
  const coverage = (area / (width * height)) * 100;

  return { area, centerX, centerY, coverage };
}









