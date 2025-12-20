"use client";

import { useEffect, useRef, RefObject } from "react";

type Sport = "padel" | "tennis" | "pickleball" | "all";

interface BallBounce {
  timestamp: number;
  court_pos: [number, number]; // [X, Y] in meters - for padel: X: 0-10m, Y: 0-20m (net at 10m)
  player_id: number;
  type: string;
}

interface BallPosition {
  timestamp: number;
  X: number; // Normalized 0-1
  Y: number; // Normalized 0-1
}

interface Swing {
  start: { timestamp: number; frame_nr: number };
  end: { timestamp: number; frame_nr: number };
  ball_hit: { timestamp: number; frame_nr: number };
  ball_hit_location?: [number, number]; // Court position [X, Y] in meters
  player_id: number;
}

interface CourtOverlayProps {
  courtKeypoints: ([number, number] | [null, null])[];
  videoRef: RefObject<HTMLVideoElement | null>;
  isFullscreen?: boolean;
  isVideoReady?: boolean;
  sport?: Sport;
  ballBounces?: BallBounce[]; // For ball zone prediction
  ballPositions?: BallPosition[]; // For velocity calculation
  swings?: Swing[]; // Swings as position anchors
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

// Padel court dimensions in meters
const PADEL_COURT_LENGTH = 20; // 20 meters total length
const PADEL_NET_POSITION = 10; // Net is at 10m (middle)

// Time constants for ball zone prediction
const BALL_ZONE_FADE_DURATION = 2.0; // Fade out over 2 seconds
const BALL_ZONE_MAX_OPACITY = 0.25; // Maximum opacity for the zone highlight

export function CourtOverlay({
  courtKeypoints,
  videoRef,
  isFullscreen = false,
  isVideoReady = false,
  sport = "padel",
  ballBounces = [],
  ballPositions = [],
  swings = [],
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
      const currentTime = video.currentTime;
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

      // =============================================================================
      // BALL ZONE PREDICTION (Padel only for now)
      // =============================================================================
      // Spectrum bar: Near Side (left) ←→ Far Side (right)
      // Uses bounces, swings, and ball velocity to predict position
      if (sport === "padel") {
        // Combine bounces and swings as position anchors
        type PositionAnchor = {
          timestamp: number;
          courtY: number; // Y position in meters (0-20, net at 10)
          type: "bounce" | "swing";
        };
        
        const anchors: PositionAnchor[] = [];
        
        // Add bounces
        for (const bounce of ballBounces) {
          anchors.push({
            timestamp: bounce.timestamp,
            courtY: bounce.court_pos[1],
            type: "bounce",
          });
        }
        
        // Add swings (if they have ball_hit_location)
        for (const swing of swings) {
          if (swing.ball_hit_location) {
            anchors.push({
              timestamp: swing.ball_hit.timestamp,
              courtY: swing.ball_hit_location[1],
              type: "swing",
            });
          }
        }
        
        // Sort anchors by timestamp
        anchors.sort((a, b) => a.timestamp - b.timestamp);
        
        // Find the most recent anchor before current time
        const recentAnchor = [...anchors]
          .filter(a => a.timestamp <= currentTime)
          .pop();
        
        // Calculate ball velocity from recent positions
        let velocityY = 0; // Positive = moving toward near side, Negative = moving toward far side
        if (ballPositions.length >= 2) {
          // Find positions near current time
          const nearbyPositions = ballPositions
            .filter(p => Math.abs(p.timestamp - currentTime) < 0.5)
            .sort((a, b) => a.timestamp - b.timestamp);
          
          if (nearbyPositions.length >= 2) {
            const recent = nearbyPositions[nearbyPositions.length - 1];
            const previous = nearbyPositions[nearbyPositions.length - 2];
            const dt = recent.timestamp - previous.timestamp;
            if (dt > 0) {
              // In pixel coords: higher Y = near side, lower Y = far side
              // So positive velocity = moving toward near side
              velocityY = (recent.Y - previous.Y) / dt;
            }
          }
        }
        
        // Calculate estimated court Y position
        let estimatedCourtY = PADEL_NET_POSITION; // Default to net (middle)
        let certainty = 0;
        let timeSinceAnchor = 0;
        
        if (recentAnchor) {
          timeSinceAnchor = currentTime - recentAnchor.timestamp;
          
          // Start from anchor position
          estimatedCourtY = recentAnchor.courtY;
          
          // Adjust based on velocity if we have it
          // Map pixel velocity to court velocity (rough approximation)
          // velocityY in pixels/sec, court is 20m, frame is roughly 0.5 of court height
          const courtVelocity = -velocityY * 40; // Negative because pixel Y is inverted
          
          // Predict position based on velocity and time
          const predictedY = recentAnchor.courtY + courtVelocity * timeSinceAnchor;
          
          // Blend between anchor position and velocity prediction based on time
          const velocityWeight = Math.min(1, timeSinceAnchor * 2); // Full velocity weight after 0.5s
          estimatedCourtY = recentAnchor.courtY * (1 - velocityWeight) + predictedY * velocityWeight;
          
          // Clamp to court bounds
          estimatedCourtY = Math.max(0, Math.min(PADEL_COURT_LENGTH, estimatedCourtY));
          
          // Certainty decreases over time
          certainty = Math.max(0, 1 - (timeSinceAnchor / BALL_ZONE_FADE_DURATION));
        }
        
        // Always show the panel when we have any data
        if (anchors.length > 0 || ballPositions.length > 0) {
          // Highlight the appropriate zone
          const ballOnFarSide = estimatedCourtY < PADEL_NET_POSITION;
          const zoneOpacity = BALL_ZONE_MAX_OPACITY * certainty;
          
          if (zoneOpacity > 0.02) {
            let zonePoints: ([number, number] | [null, null])[];
            let zoneColor: string;
            
            if (ballOnFarSide) {
              zonePoints = [
                courtKeypoints[0], courtKeypoints[1],
                courtKeypoints[7], courtKeypoints[6],
              ];
              zoneColor = "rgba(255, 150, 100, ";
            } else {
              zonePoints = [
                courtKeypoints[6], courtKeypoints[7],
                courtKeypoints[11], courtKeypoints[9],
              ];
              zoneColor = "rgba(100, 200, 255, ";
            }
            
            const validPoints = zonePoints.filter(p => p && p[0] !== null);
            if (validPoints.length === 4) {
              ctx.beginPath();
              ctx.moveTo(
                offsetX + zonePoints[0]![0]! * displayWidth,
                offsetY + zonePoints[0]![1]! * displayHeight
              );
              for (let i = 1; i < zonePoints.length; i++) {
                ctx.lineTo(
                  offsetX + zonePoints[i]![0]! * displayWidth,
                  offsetY + zonePoints[i]![1]! * displayHeight
                );
              }
              ctx.closePath();
              ctx.fillStyle = zoneColor + zoneOpacity + ")";
              ctx.fill();
            }
          }
          
          // Draw VERTICAL spectrum bar panel (positioned on left side)
          const panelX = offsetX + 10;
          const panelY = offsetY + 50; // Below the court keypoints legend
          const panelWidth = isFullscreen ? 70 : 60;
          const panelHeight = isFullscreen ? 320 : 260;
          
          // Panel background
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
          ctx.strokeStyle = "rgba(100, 100, 100, 0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
          
          // Title (rotated or abbreviated)
          ctx.font = `bold ${isFullscreen ? 10 : 8}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "white";
          ctx.fillText("🎾 Y-Pos", panelX + panelWidth / 2, panelY + 4);
          
          // Vertical spectrum bar
          const barX = panelX + 10;
          const barY = panelY + (isFullscreen ? 24 : 20);
          const barWidth = isFullscreen ? 24 : 20;
          const barHeight = panelHeight - (isFullscreen ? 70 : 58);
          
          // Gradient background: Orange (far/top) → Gray (net) → Blue (near/bottom)
          const gradient = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
          gradient.addColorStop(0, "rgba(255, 150, 100, 0.8)");    // Far (top)
          gradient.addColorStop(0.45, "rgba(150, 150, 150, 0.6)"); // Net area
          gradient.addColorStop(0.55, "rgba(150, 150, 150, 0.6)"); // Net area
          gradient.addColorStop(1, "rgba(100, 200, 255, 0.8)");    // Near (bottom)
          
          ctx.fillStyle = gradient;
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Net line indicator (horizontal in middle)
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(barX, barY + barHeight / 2);
          ctx.lineTo(barX + barWidth, barY + barHeight / 2);
          ctx.stroke();
          
          // Bar border
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
          
          // Position indicator (ball icon)
          // courtY: 0 = far (top), 20 = near (bottom)
          const positionRatio = estimatedCourtY / PADEL_COURT_LENGTH; // 0 = far (top), 1 = near (bottom)
          const indicatorX = barX + barWidth / 2;
          const indicatorY = barY + barHeight * positionRatio;
          
          // Certainty affects indicator size and opacity
          const indicatorRadius = (isFullscreen ? 10 : 8) * (0.5 + certainty * 0.5);
          const indicatorOpacity = 0.4 + certainty * 0.6;
          
          // Draw indicator glow
          ctx.beginPath();
          ctx.arc(indicatorX, indicatorY, indicatorRadius + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${indicatorOpacity * 0.3})`;
          ctx.fill();
          
          // Draw indicator
          ctx.beginPath();
          ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 0, ${indicatorOpacity})`;
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw velocity arrow (vertical)
          if (Math.abs(velocityY) > 0.05) {
            const arrowLength = Math.min(25, Math.abs(velocityY) * 40) * (isFullscreen ? 1.2 : 1);
            // velocityY > 0 means moving to near side (down in video), so arrow points down in bar
            const arrowDirection = velocityY > 0 ? 1 : -1;
            const arrowEndY = indicatorY + arrowLength * arrowDirection;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${indicatorOpacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(indicatorX, indicatorY);
            ctx.lineTo(indicatorX, arrowEndY);
            ctx.stroke();
            
            // Arrowhead
            const headSize = 5;
            ctx.beginPath();
            ctx.moveTo(indicatorX, arrowEndY);
            ctx.lineTo(indicatorX - headSize, arrowEndY - headSize * arrowDirection);
            ctx.lineTo(indicatorX + headSize, arrowEndY - headSize * arrowDirection);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 255, 255, ${indicatorOpacity})`;
            ctx.fill();
          }
          
          // Labels to the right of the bar
          ctx.font = `bold ${isFullscreen ? 9 : 7}px sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          
          // Far label (top)
          ctx.fillStyle = "rgba(255, 150, 100, 1)";
          ctx.fillText("FAR", barX + barWidth + 4, barY + 8);
          
          // Net label (middle)
          ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
          ctx.fillText("NET", barX + barWidth + 4, barY + barHeight / 2);
          
          // Near label (bottom)
          ctx.fillStyle = "rgba(100, 200, 255, 1)";
          ctx.fillText("NEAR", barX + barWidth + 4, barY + barHeight - 8);
          
          // Info text at bottom of panel
          ctx.font = `${isFullscreen ? 9 : 7}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(180, 180, 180, 1)";
          
          const infoY = barY + barHeight + 4;
          ctx.fillText(`${estimatedCourtY.toFixed(1)}m`, panelX + panelWidth / 2, infoY);
          ctx.fillText(`${Math.round(certainty * 100)}%`, panelX + panelWidth / 2, infoY + 10);
          ctx.fillText(`${timeSinceAnchor.toFixed(1)}s`, panelX + panelWidth / 2, infoY + 20);
        }
      }

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
  }, [courtKeypoints, videoRef, isFullscreen, isVideoReady, sport, ballBounces, ballPositions, swings]);

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

