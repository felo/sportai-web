"use client";

import { useEffect, useRef, RefObject } from "react";

interface CourtOverlayProps {
  courtKeypoints: ([number, number] | [null, null])[];
  videoRef: RefObject<HTMLVideoElement | null>;
  isFullscreen?: boolean;
  isVideoReady?: boolean;
}

// Court keypoint indices for a padel court (14 points)
// Based on actual keypoint positions from the detection:
// 0: back-left corner        1: back-right corner
// 2: service line left       3: service line center      4: service line right
// 5: left sideline mid       6: left sideline upper      7: right sideline upper      8: right sideline mid
// 9: front-left corner       10: front center            11: front-right corner
const COURT_LINES: [number, number][] = [
  // Back baseline (far from camera)
  [0, 1],
  // Front baseline (close to camera)
  [9, 10],
  [10, 11],
  // Left sideline (back to front): 0 → 2 → 5 → 9
  [0, 2],
  [2, 5],
  [5, 9],
  // Right sideline (back to front): 1 → 4 → 8 → 11
  [1, 4],
  [4, 8],
  [8, 11],
  // Back service line (horizontal): 2 → 3 → 4
  [2, 3],
  [3, 4],
  // Front service line / T-line (horizontal): 5 → 8
  [5, 8],
  // Center line (vertical from service line to front baseline)
  [3, 10],
  // Net line: 6 → 7
  [6, 7],
];

// Colors for keypoints by region
const KEYPOINT_COLORS: Record<number, string> = {
  0: "#FF6B6B",  // Top left - red
  1: "#FF6B6B",  // Top right - red
  2: "#4ECDC4",  // Upper service left - teal
  3: "#4ECDC4",  // Top center - teal
  4: "#4ECDC4",  // Upper service right - teal
  5: "#45B7D1",  // Mid left - blue
  6: "#45B7D1",  // Mid service left - blue
  7: "#45B7D1",  // Mid service right - blue
  8: "#45B7D1",  // Mid right - blue
  9: "#96CEB4",  // Bottom left - green
  10: "#96CEB4", // Bottom center - green
  11: "#96CEB4", // Bottom right - green
  12: "#DDA0DD", // Extra point 1 - plum
  13: "#DDA0DD", // Extra point 2 - plum
};

export function CourtOverlay({
  courtKeypoints,
  videoRef,
  isFullscreen = false,
  isVideoReady = false,
}: CourtOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !isVideoReady) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // Get the actual video element dimensions
      const videoRect = video.getBoundingClientRect();
      const videoWidth = videoRect.width;
      const videoHeight = videoRect.height;

      // Calculate video display area (accounting for letterboxing)
      const videoAspect = video.videoWidth / video.videoHeight;
      const containerAspect = videoWidth / videoHeight;

      let displayWidth: number;
      let displayHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (containerAspect > videoAspect) {
        // Container is wider - letterbox on sides
        displayHeight = videoHeight;
        displayWidth = videoHeight * videoAspect;
        offsetX = (videoWidth - displayWidth) / 2;
        offsetY = 0;
      } else {
        // Container is taller - letterbox on top/bottom
        displayWidth = videoWidth;
        displayHeight = videoWidth / videoAspect;
        offsetX = 0;
        offsetY = (videoHeight - displayHeight) / 2;
      }

      // Set canvas size to match video container
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw court lines first (behind points)
      ctx.lineWidth = isFullscreen ? 3 : 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.setLineDash([5, 5]);

      for (const [startIdx, endIdx] of COURT_LINES) {
        const start = courtKeypoints[startIdx];
        const end = courtKeypoints[endIdx];
        
        if (!start || !end || start[0] === null || end[0] === null) continue;

        const x1 = offsetX + start[0] * displayWidth;
        const y1 = offsetY + start[1] * displayHeight;
        const x2 = offsetX + end[0] * displayWidth;
        const y2 = offsetY + end[1] * displayHeight;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // Draw keypoints
      const pointRadius = isFullscreen ? 8 : 6;
      const labelOffset = isFullscreen ? 16 : 12;

      courtKeypoints.forEach((point, index) => {
        if (!point || point[0] === null || point[1] === null) return;

        const x = offsetX + point[0] * displayWidth;
        const y = offsetY + point[1] * displayHeight;
        const color = KEYPOINT_COLORS[index] || "#FFD93D";

        // Draw outer glow
        ctx.beginPath();
        ctx.arc(x, y, pointRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();

        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw index label
        ctx.font = `bold ${isFullscreen ? 12 : 10}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Background for label
        const labelText = String(index);
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 6;
        const labelHeight = isFullscreen ? 16 : 14;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
          x - labelWidth / 2,
          y - labelOffset - labelHeight / 2,
          labelWidth,
          labelHeight
        );
        
        // Label text
        ctx.fillStyle = color;
        ctx.fillText(labelText, x, y - labelOffset);
      });

      // Draw legend
      const legendX = 10;
      const legendY = canvas.height - 40;
      const legendBg = "rgba(0, 0, 0, 0.7)";
      
      ctx.fillStyle = legendBg;
      ctx.fillRect(legendX, legendY, 200, 30);
      
      ctx.font = `${isFullscreen ? 12 : 10}px sans-serif`;
      ctx.fillStyle = "#7ADB8F";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("🎯 Court Detection Keypoints", legendX + 8, legendY + 15);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [courtKeypoints, videoRef, isFullscreen, isVideoReady]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

