"use client";

import { useEffect, useRef, RefObject } from "react";

type Sport = "padel" | "tennis" | "pickleball" | "all";

interface CourtOverlayProps {
  courtKeypoints: ([number, number] | [null, null])[];
  videoRef: RefObject<HTMLVideoElement | null>;
  isFullscreen?: boolean;
  isVideoReady?: boolean;
  sport?: Sport;
}

// =============================================================================
// PADEL COURT CONFIGURATION (14 points)
// =============================================================================
// Based on actual keypoint positions from the detection:
// 0: back-left corner        1: back-right corner
// 2: service line left       3: service line center      4: service line right
// 5: left sideline mid       6: left sideline upper      7: right sideline upper      8: right sideline mid
// 9: front-left corner       10: front center            11: front-right corner
const PADEL_COURT_LINES: [number, number][] = [
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

const PADEL_KEYPOINT_COLORS: Record<number, string> = {
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

// =============================================================================
// TENNIS COURT CONFIGURATION (18 points)
// =============================================================================
// Tennis court keypoint layout:
// 0: Far left net post (red)           1: Far right net post (red)
// 2: Near baseline left corner (cyan)  3: Near baseline right corner (cyan)
// 4: Far baseline left corner (teal)   5: Near left singles line (light blue)
// 6: Far baseline center (pink)        7: Near right singles line (light blue)
// 8: Left net area (light blue)        9: Far baseline right corner (pink)
// 10: Near service line left (green)   11: Near service line right (green)
// 12: Net center (pink)                13: Center T (pink)
// 14: Far left net level (yellow)      15: Far service line left (yellow)
// 16: Far right net level (yellow)     17: Far service line right (yellow)
const TENNIS_COURT_LINES: [number, number][] = [
  // === HORIZONTAL LINES ===
  // Near baseline (bottom): 2 -- 5 -- 7 -- 3
  [2, 5],
  [5, 7],
  [7, 3],
  
  // Near service line: 10 -- 13 -- 11
  [10, 13],
  [13, 11],
  
  // Far service line: 15 -- 17
  [15, 17],
  
  // Far baseline: 4 -- 6 -- 9
  [4, 6],
  [6, 9],
  
  // Net line: 8 -- 12 (and post connections)
  [8, 12],
  [0, 4],   // Left net post to far baseline corner
  [1, 9],   // Right net post to far baseline corner
  
  // === VERTICAL/SIDELINES ===
  // Left doubles sideline: 2 -> 10 -> 8 -> 14 -> 15 -> 4
  [2, 10],
  [10, 8],
  [8, 14],
  [14, 15],
  [15, 4],
  
  // Right doubles sideline: 3 -> 11 -> 16 -> 17 -> 9
  [3, 11],
  [11, 16],
  [16, 17],
  [17, 9],
  
  // Left singles line: 5 -> 10
  [5, 10],
  
  // Right singles line: 7 -> 11
  [7, 11],
  
  // Center service line: 13 -> 12
  [13, 12],
];

const TENNIS_KEYPOINT_COLORS: Record<number, string> = {
  0: "#FF6B6B",  // Far left net post - red
  1: "#FF6B6B",  // Far right net post - red
  2: "#4ECDC4",  // Near baseline left - cyan
  3: "#4ECDC4",  // Near baseline right - cyan
  4: "#4ECDC4",  // Far baseline left - teal
  5: "#45B7D1",  // Near left singles - light blue
  6: "#DDA0DD",  // Far baseline center - pink
  7: "#45B7D1",  // Near right singles - light blue
  8: "#45B7D1",  // Left net area - light blue
  9: "#DDA0DD",  // Far baseline right - pink
  10: "#96CEB4", // Near service left - green
  11: "#96CEB4", // Near service right - green
  12: "#DDA0DD", // Net center - pink
  13: "#DDA0DD", // Center T - pink
  14: "#FFD93D", // Far left net level - yellow
  15: "#FFD93D", // Far service left - yellow
  16: "#FFD93D", // Far right net level - yellow
  17: "#FFD93D", // Far service right - yellow
};

// Helper to get court config based on sport
function getCourtConfig(sport: Sport) {
  if (sport === "tennis") {
    return {
      lines: TENNIS_COURT_LINES,
      colors: TENNIS_KEYPOINT_COLORS,
    };
  }
  // Default to padel for padel, pickleball, and "all"
  return {
    lines: PADEL_COURT_LINES,
    colors: PADEL_KEYPOINT_COLORS,
  };
}

export function CourtOverlay({
  courtKeypoints,
  videoRef,
  isFullscreen = false,
  isVideoReady = false,
  sport = "padel",
}: CourtOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !isVideoReady) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get sport-specific configuration
    const { lines: courtLines, colors: keypointColors } = getCourtConfig(sport);

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

      for (const [startIdx, endIdx] of courtLines) {
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
        const color = keypointColors[index] || "#FFD93D";

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
  }, [courtKeypoints, videoRef, isFullscreen, isVideoReady, sport]);

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

