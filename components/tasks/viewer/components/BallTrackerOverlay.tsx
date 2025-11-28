"use client";

import { useRef, useEffect, RefObject } from "react";

interface BallPosition {
  timestamp: number;
  X: number;
  Y: number;
}

interface BallTrackerOverlayProps {
  ballPositions: BallPosition[];
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Time window in seconds to search for nearest ball position */
  timeThreshold?: number;
  /** Whether to apply perspective scaling based on Y position */
  usePerspective?: boolean;
}

// Binary search for finding nearest position (much faster for large arrays)
function findNearestBallPosition(
  positions: BallPosition[],
  currentTime: number,
  threshold: number
): BallPosition | null {
  if (!positions.length) return null;

  // Binary search to find approximate position
  let left = 0;
  let right = positions.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid].timestamp < currentTime) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Check neighbors to find the closest
  let nearest: BallPosition | null = null;
  let minDiff = Infinity;

  for (let i = Math.max(0, left - 1); i <= Math.min(positions.length - 1, left + 1); i++) {
    const diff = Math.abs(positions[i].timestamp - currentTime);
    if (diff < minDiff && diff <= threshold) {
      minDiff = diff;
      nearest = positions[i];
    }
  }

  return nearest;
}

export function BallTrackerOverlay({
  ballPositions,
  videoRef,
  timeThreshold = 0.1,
  usePerspective = true,
}: BallTrackerOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastPausedRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !ballPositions.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const currentTime = video.currentTime;
      const isPaused = video.paused;
      const position = findNearestBallPosition(ballPositions, currentTime, timeThreshold);

      // Update canvas size to match parent
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (position) {
        const x = position.X * canvas.width;
        const y = position.Y * canvas.height;
        
        // Perspective effect for bird's eye court view:
        // Y=0 (top) = far end of court = smaller
        // Y=1 (bottom) = near end of court = larger
        const minRadius = 0.25;
        const maxRadius = 8;
        
        let radius: number;
        if (usePerspective) {
          // Use a slight power curve for more natural perspective falloff
          const perspectiveY = Math.pow(position.Y, 0.8);
          radius = minRadius + (maxRadius - minRadius) * perspectiveY;
        } else {
          // No perspective - always use max size
          radius = maxRadius;
        }
        
        // Scale crosshair and glow proportionally  
        const scale = radius / maxRadius;
        const crosshairLength = 25 * scale;
        const glowSize = 10 * scale;
        const lineWidth = 2 + 1.5 * scale;

        // Draw crosshairs only when paused
        if (isPaused) {
          ctx.strokeStyle = "rgba(122, 219, 143, 0.5)";
          ctx.lineWidth = lineWidth;
          
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(x - crosshairLength, y);
          ctx.lineTo(x + crosshairLength, y);
          ctx.stroke();
          
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(x, y - crosshairLength);
          ctx.lineTo(x, y + crosshairLength);
          ctx.stroke();
        }

        // Draw outer glow
        const gradient = ctx.createRadialGradient(x, y, radius, x, y, radius + glowSize);
        gradient.addColorStop(0, "rgba(122, 219, 143, 0.4)");
        gradient.addColorStop(1, "rgba(122, 219, 143, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius + glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw filled circle
        ctx.fillStyle = "rgba(122, 219, 143, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw ring
        ctx.strokeStyle = "#7ADB8F";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      lastPausedRef.current = isPaused;
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [ballPositions, videoRef, timeThreshold, usePerspective]);

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
        zIndex: 10,
      }}
    />
  );
}

