"use client";

import { useRef, useEffect, useState, RefObject } from "react";
import { OVERLAY_COLORS } from "../constants";
import { POSE_CONNECTIONS } from "@/types/pose";
import { formatSwingType } from "../utils";

// ============================================================================
// POSE SKELETON CONFIGURATION - Tweak these to adjust skeleton size
// ============================================================================
const POSE_CONFIG = {
  // Multiplier for joint radius (relative to bounding box height)
  jointRadiusMultiplier: 0.08,  // Increase for larger joints
  // Multiplier for line width (relative to bounding box height)
  lineWidthMultiplier: 0.06,   // Increase for thicker lines
  // Min/max clamps for joint radius (in pixels)
  jointRadiusMin: 2,
  jointRadiusMax: 6,
  // Min/max clamps for line width (in pixels)
  lineWidthMin: 1,
  lineWidthMax: 4,
  // Colors
  jointColor: "#FF9800",        // Orange
  lineColor: "#7ADB8F",         // Mint green
};

interface BallPosition {
  timestamp: number;
  X: number;
  Y: number;
}

interface BallBounce {
  timestamp: number;
  court_pos: [number, number];
  player_id: number;
  type: string;
}

interface SwingAnnotation {
  bbox: [number, number, number, number];
  box_confidence: number;
  keypoints?: number[][]; // COCO 17-point format: [[x, y], ...]
  confidences?: number[];
}

interface SwingWithPlayer {
  start: { timestamp: number; frame_nr: number };
  end: { timestamp: number; frame_nr: number };
  swing_type: string;
  ball_speed: number;
  volley: boolean;
  serve: boolean;
  ball_hit: { timestamp: number; frame_nr: number };
  confidence?: number;
  annotations?: SwingAnnotation[];
  player_id: number;
}

interface BallTrackerOverlayProps {
  ballPositions: BallPosition[];
  rawBallPositions?: BallPosition[]; // Original unfiltered positions for comparison (drawn in red)
  ballBounces: BallBounce[];
  swings: SwingWithPlayer[];
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Time window in seconds to search for nearest ball position */
  timeThreshold?: number;
  /** Whether to apply perspective scaling based on Y position */
  usePerspective?: boolean;
  /** Whether to show the ball indicator circle */
  showIndicator?: boolean;
  /** Whether to show the ball trail */
  showTrail?: boolean;
  /** Whether to smooth/interpolate the trail curves */
  useSmoothing?: boolean;
  /** Whether to show bounce ripple effects */
  showBounceRipples?: boolean;
  /** Whether to show velocity on swings */
  showVelocity?: boolean;
  /** Whether to show player bounding boxes */
  showPlayerBoxes?: boolean;
  /** Whether to show pose skeletons */
  showPose?: boolean;
  /** Map of player_id to display name (e.g., { 0: "Player 1", 3: "Player 2" }) */
  playerDisplayNames?: Record<number, string>;
  /** Whether the player is in fullscreen mode (scales overlay 2x) */
  isFullscreen?: boolean;
  /** Whether the video is ready to play (triggers overlay initialization) */
  isVideoReady?: boolean;
  /** Show filter radius debug circle (max distance ball can move per frame) */
  showFilterRadius?: boolean;
}

// Binary search to find index near a timestamp
function findIndexNearTimestamp(positions: BallPosition[], timestamp: number): number {
  let left = 0;
  let right = positions.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid].timestamp < timestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left;
}

// Binary search for finding nearest position (much faster for large arrays)
function findNearestBallPosition(
  positions: BallPosition[],
  currentTime: number,
  threshold: number
): BallPosition | null {
  if (!positions.length) return null;

  const left = findIndexNearTimestamp(positions, currentTime);

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

// Get trail of ball positions leading up to current time
function getTrailPositions(
  positions: BallPosition[],
  currentTime: number,
  trailDuration: number
): BallPosition[] {
  if (!positions.length) return [];

  const endIndex = findIndexNearTimestamp(positions, currentTime);
  const startTime = currentTime - trailDuration;
  
  const trail: BallPosition[] = [];
  
  // Collect positions from startTime to currentTime
  for (let i = Math.max(0, endIndex - 100); i <= Math.min(positions.length - 1, endIndex + 1); i++) {
    const pos = positions[i];
    if (pos.timestamp >= startTime && pos.timestamp <= currentTime + 0.05) {
      trail.push(pos);
    }
  }
  
  return trail;
}

// Interpolate between green and yellow based on age (0 = current/green, 1 = old/yellow)
function getTrailColor(age: number, alpha: number): string {
  // Green: rgb(122, 219, 143) - #7ADB8F
  // Yellow: rgb(255, 200, 50)
  const r = Math.round(122 + (255 - 122) * age);
  const g = Math.round(219 + (200 - 219) * age);
  const b = Math.round(143 + (50 - 143) * age);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Interpolate between red and dark red for raw/unfiltered trail (comparison mode)
function getRawTrailColor(age: number, alpha: number): string {
  // Red: rgb(239, 68, 68) - Tailwind red-500
  // Dark red: rgb(153, 27, 27) - Tailwind red-800
  const r = Math.round(239 + (153 - 239) * age);
  const g = Math.round(68 + (27 - 68) * age);
  const b = Math.round(68 + (27 - 68) * age);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to get bounce color - all bounces are yellow
function getBounceColor(_type: string): { r: number; g: number; b: number } {
  // Yellow - var(--yellow-9) / #EAB308
  return { r: 234, g: 179, b: 8 };
}


export function BallTrackerOverlay({
  ballPositions,
  rawBallPositions,
  ballBounces,
  swings,
  videoRef,
  timeThreshold = 0.1,
  usePerspective = true,
  showIndicator = false,
  showTrail = true,
  useSmoothing = true,
  showBounceRipples = true,
  showVelocity = true,
  showPlayerBoxes = false,
  showPose = false,
  playerDisplayNames = {},
  isFullscreen = false,
  isVideoReady = false,
  showFilterRadius = false,
}: BallTrackerOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastPausedRef = useRef<boolean>(true);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Scale factor for fullscreen mode (2x all overlay items)
  const scale = isFullscreen ? 2 : 1;

  // Track video element resize (handles fullscreen transitions)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setVideoDimensions({ width, height });
      }
    });

    resizeObserver.observe(video);
    return () => resizeObserver.disconnect();
  }, [videoRef, isVideoReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (!ballPositions.length && !ballBounces.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TRAIL_DURATION = 0.5; // seconds of trail to show
    const TRAIL_MIN_WIDTH = 0.5 * scale;
    const TRAIL_MAX_WIDTH = 4 * scale;
    
    // Perspective constants (same as indicator) - scaled for fullscreen
    const minRadius = 0.25 * scale;
    const maxRadius = 8 * scale;
    
    // Ripple settings from config - scaled for fullscreen
    const rippleConfig = OVERLAY_COLORS.ripple;
    const rippleDuration = rippleConfig.durationMs / 1000; // Convert to seconds
    const rippleMinRadius = rippleConfig.minRadius * scale;
    const rippleMaxRadius = rippleConfig.maxRadius * scale;
    const rippleLineWidth = rippleConfig.lineWidth * scale;
    
    // Helper to calculate perspective scale for a Y position
    const getPerspectiveScale = (y: number): number => {
      if (!usePerspective) return 1;
      const perspectiveY = Math.pow(y, 0.8);
      return (minRadius + (maxRadius - minRadius) * perspectiveY) / maxRadius;
    };

    const draw = () => {
      const currentTime = video.currentTime;
      const isPaused = video.paused;
      const position = findNearestBallPosition(ballPositions, currentTime, timeThreshold);
      const trail = getTrailPositions(ballPositions, currentTime, TRAIL_DURATION);

      // Calculate the actual video rendering area (accounting for object-fit: contain letterboxing)
      const dpr = window.devicePixelRatio || 1;
      let logicalWidth = 0;
      let logicalHeight = 0;
      let offsetX = 0;
      let offsetY = 0;
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Get the actual rendered position of the video element relative to the canvas parent
      const parent = canvas.parentElement;
      if (!parent) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const parentRect = parent.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();
      
      // Calculate video element's position relative to canvas parent
      const videoOffsetX = videoRect.left - parentRect.left;
      const videoOffsetY = videoRect.top - parentRect.top;
      const containerWidth = videoRect.width;
      const containerHeight = videoRect.height;
      
      if (videoWidth && videoHeight && containerWidth && containerHeight) {
        const videoAspect = videoWidth / videoHeight;
        const containerAspect = containerWidth / containerHeight;
        
        if (containerAspect > videoAspect) {
          // Container is wider than video - letterbox on sides
          logicalHeight = containerHeight;
          logicalWidth = containerHeight * videoAspect;
          offsetX = videoOffsetX + (containerWidth - logicalWidth) / 2;
          offsetY = videoOffsetY;
        } else {
          // Container is taller than video - letterbox on top/bottom
          logicalWidth = containerWidth;
          logicalHeight = containerWidth / videoAspect;
          offsetX = videoOffsetX;
          offsetY = videoOffsetY + (containerHeight - logicalHeight) / 2;
        }
      } else {
        // Fallback to video element dimensions if native dimensions not available
        logicalWidth = containerWidth;
        logicalHeight = containerHeight;
        offsetX = videoOffsetX;
        offsetY = videoOffsetY;
      }
      
      // Update canvas size and position
      const targetWidth = Math.round(logicalWidth * dpr);
      const targetHeight = Math.round(logicalHeight * dpr);
      
      // Always update position (in case video moved), only update size if changed
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;
      
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;
      }
      
      // Always reset transform and apply DPR scaling (transforms are cumulative)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear canvas
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      // Draw raw/unfiltered ball trail first (underneath) - red color for comparison
      if (showTrail && rawBallPositions && rawBallPositions.length > 0) {
        const rawTrail = getTrailPositions(rawBallPositions, currentTime, TRAIL_DURATION);
        
        if (rawTrail.length >= 2) {
          if (useSmoothing && rawTrail.length >= 3) {
            // Draw smooth curve for raw trail
            for (let i = 0; i < rawTrail.length - 1; i++) {
              const p0 = rawTrail[Math.max(0, i - 1)];
              const p1 = rawTrail[i];
              const p2 = rawTrail[i + 1];
              const p3 = rawTrail[Math.min(rawTrail.length - 1, i + 2)];
              
              const x1 = p1.X * logicalWidth;
              const y1 = p1.Y * logicalHeight;
              const x2 = p2.X * logicalWidth;
              const y2 = p2.Y * logicalHeight;
              
              const tension = 0.5;
              const cp1x = x1 + (p2.X * logicalWidth - p0.X * logicalWidth) * tension / 3;
              const cp1y = y1 + (p2.Y * logicalHeight - p0.Y * logicalHeight) * tension / 3;
              const cp2x = x2 - (p3.X * logicalWidth - p1.X * logicalWidth) * tension / 3;
              const cp2y = y2 - (p3.Y * logicalHeight - p1.Y * logicalHeight) * tension / 3;
              
              const age1 = Math.max(0, Math.min(1, (currentTime - p1.timestamp) / TRAIL_DURATION));
              const age2 = Math.max(0, Math.min(1, (currentTime - p2.timestamp) / TRAIL_DURATION));
              
              const alpha1 = 0.6 * (1 - age1 * 0.7); // Slightly more transparent than filtered
              const alpha2 = 0.6 * (1 - age2 * 0.7);
              
              const avgY = (p1.Y + p2.Y) / 2;
              const perspectiveScale = getPerspectiveScale(avgY);
              const lineWidth = TRAIL_MIN_WIDTH + (TRAIL_MAX_WIDTH - TRAIL_MIN_WIDTH) * perspectiveScale;
              
              const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
              gradient.addColorStop(0, getRawTrailColor(age1, alpha1));
              gradient.addColorStop(1, getRawTrailColor(age2, alpha2));
              
              ctx.strokeStyle = gradient;
              ctx.lineWidth = lineWidth;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
              ctx.stroke();
            }
          } else {
            // Draw straight line segments for raw trail (no smoothing)
            for (let i = 0; i < rawTrail.length - 1; i++) {
              const p1 = rawTrail[i];
              const p2 = rawTrail[i + 1];
              
              const x1 = p1.X * logicalWidth;
              const y1 = p1.Y * logicalHeight;
              const x2 = p2.X * logicalWidth;
              const y2 = p2.Y * logicalHeight;
              
              const age1 = Math.max(0, Math.min(1, (currentTime - p1.timestamp) / TRAIL_DURATION));
              const age2 = Math.max(0, Math.min(1, (currentTime - p2.timestamp) / TRAIL_DURATION));
              
              const alpha1 = 0.6 * (1 - age1 * 0.7);
              const alpha2 = 0.6 * (1 - age2 * 0.7);
              
              const avgY = (p1.Y + p2.Y) / 2;
              const perspectiveScale = getPerspectiveScale(avgY);
              const lineWidth = TRAIL_MIN_WIDTH + (TRAIL_MAX_WIDTH - TRAIL_MIN_WIDTH) * perspectiveScale;
              
              const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
              gradient.addColorStop(0, getRawTrailColor(age1, alpha1));
              gradient.addColorStop(1, getRawTrailColor(age2, alpha2));
              
              ctx.strokeStyle = gradient;
              ctx.lineWidth = lineWidth;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
      }

      // Draw ball trail (gradient from yellow to green) - filtered positions on top
      if (showTrail && trail.length >= 2) {
        if (useSmoothing && trail.length >= 3) {
          // Draw smooth curve using quadratic bezier curves
          // We draw each segment separately to apply per-segment gradients and widths
          for (let i = 0; i < trail.length - 1; i++) {
            const p0 = trail[Math.max(0, i - 1)];
            const p1 = trail[i];
            const p2 = trail[i + 1];
            const p3 = trail[Math.min(trail.length - 1, i + 2)];
            
            const x1 = p1.X * logicalWidth;
            const y1 = p1.Y * logicalHeight;
            const x2 = p2.X * logicalWidth;
            const y2 = p2.Y * logicalHeight;
            
            // Calculate control points using Catmull-Rom to Bezier conversion
            const tension = 0.5;
            const cp1x = x1 + (p2.X * logicalWidth - p0.X * logicalWidth) * tension / 3;
            const cp1y = y1 + (p2.Y * logicalHeight - p0.Y * logicalHeight) * tension / 3;
            const cp2x = x2 - (p3.X * logicalWidth - p1.X * logicalWidth) * tension / 3;
            const cp2y = y2 - (p3.Y * logicalHeight - p1.Y * logicalHeight) * tension / 3;
            
            // Calculate age (0 = current, 1 = oldest)
            const age1 = Math.max(0, Math.min(1, (currentTime - p1.timestamp) / TRAIL_DURATION));
            const age2 = Math.max(0, Math.min(1, (currentTime - p2.timestamp) / TRAIL_DURATION));
            
            // Fade out opacity for older segments
            const alpha1 = 0.8 * (1 - age1 * 0.7);
            const alpha2 = 0.8 * (1 - age2 * 0.7);
            
            // Calculate perspective-based line width
            const avgY = (p1.Y + p2.Y) / 2;
            const perspectiveScale = getPerspectiveScale(avgY);
            const lineWidth = TRAIL_MIN_WIDTH + (TRAIL_MAX_WIDTH - TRAIL_MIN_WIDTH) * perspectiveScale;
            
            // Create gradient for this segment
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, getTrailColor(age1, alpha1));
            gradient.addColorStop(1, getTrailColor(age2, alpha2));
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
            ctx.stroke();
          }
        } else {
          // Draw straight line segments (no smoothing)
          for (let i = 0; i < trail.length - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            
            const x1 = p1.X * logicalWidth;
            const y1 = p1.Y * logicalHeight;
            const x2 = p2.X * logicalWidth;
            const y2 = p2.Y * logicalHeight;
            
            // Calculate age (0 = current, 1 = oldest)
            const age1 = Math.max(0, Math.min(1, (currentTime - p1.timestamp) / TRAIL_DURATION));
            const age2 = Math.max(0, Math.min(1, (currentTime - p2.timestamp) / TRAIL_DURATION));
            
            // Fade out opacity for older segments
            const alpha1 = 0.8 * (1 - age1 * 0.7);
            const alpha2 = 0.8 * (1 - age2 * 0.7);
            
            // Calculate perspective-based line width
            const avgY = (p1.Y + p2.Y) / 2;
            const perspectiveScale = getPerspectiveScale(avgY);
            const lineWidth = TRAIL_MIN_WIDTH + (TRAIL_MAX_WIDTH - TRAIL_MIN_WIDTH) * perspectiveScale;
            
            // Create gradient for this segment
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, getTrailColor(age1, alpha1));
            gradient.addColorStop(1, getTrailColor(age2, alpha2));
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }

      // Draw bounce ripples
      if (showBounceRipples && ballBounces.length > 0 && ballPositions.length > 0) {
        // Mobile: tone down ripples (smaller, more subtle)
        const rippleMobileCheck = logicalWidth < 480;
        const rippleMobileScale = rippleMobileCheck ? 0.6 : 1;
        const rippleOpacityScale = rippleMobileCheck ? 0.5 : 1;
        
        for (const bounce of ballBounces) {
          const timeSinceBounce = currentTime - bounce.timestamp;
          
          // Only draw ripples that are currently active (within animation duration)
          if (timeSinceBounce >= 0 && timeSinceBounce <= rippleDuration) {
            // Find the ball position at the bounce timestamp (use ball_positions for video frame coords)
            const bouncePosition = findNearestBallPosition(ballPositions, bounce.timestamp, 0.2);
            if (!bouncePosition) continue;
            
            const progress = timeSinceBounce / rippleDuration; // 0 to 1
            
            // Use ball_positions coordinates (video frame coordinates)
            const x = bouncePosition.X * logicalWidth;
            const y = bouncePosition.Y * logicalHeight;
            
            // Calculate perspective scale based on Y position
            const perspectiveScale = getPerspectiveScale(bouncePosition.Y);
            
            // Animate radius from min to max (using scaled values, reduced on mobile)
            const currentRadius = (rippleMinRadius + (rippleMaxRadius - rippleMinRadius) * progress) * perspectiveScale * rippleMobileScale;
            
            // Fade out opacity as ripple expands (reduced on mobile)
            const opacity = rippleConfig.startOpacity * (1 - progress) * rippleOpacityScale;
            
            // Get color based on bounce type
            const color = getBounceColor(bounce.type);
            
            // Scale line width with perspective (using scaled value, reduced on mobile)
            const lineWidth = rippleLineWidth * perspectiveScale * rippleMobileScale;
            
            // Draw the ripple ring
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
            ctx.lineWidth = Math.max(1, lineWidth * (1 - progress * 0.5)); // Line gets thinner as it expands
            ctx.beginPath();
            ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw a subtle inner glow at the start (skip on mobile for cleaner look)
            if (progress < 0.3 && !rippleMobileCheck) {
              const glowOpacity = opacity * 0.5 * (1 - progress / 0.3);
              const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius * 0.5);
              glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity})`);
              glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
              ctx.fillStyle = glowGradient;
              ctx.beginPath();
              ctx.arc(x, y, currentRadius * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw velocity display for swings
      if (showVelocity && swings.length > 0 && ballPositions.length > 0) {
        const velocityConfig = OVERLAY_COLORS.velocity;
        const displayDuration = velocityConfig.displayDurationMs / 1000;
        
        // Scale velocity display for fullscreen
        const velFontSize = velocityConfig.fontSize * scale;
        const velPadding = velocityConfig.padding * scale;
        const velBorderRadius = velocityConfig.borderRadius * scale;
        const velOffset = velocityConfig.offsetFromBall * scale;
        
        for (const swing of swings) {
          // Skip swings with no ball speed
          if (!swing.ball_speed || swing.ball_speed <= 0) continue;
          
          const timeSinceHit = currentTime - swing.ball_hit.timestamp;
          
          // Only show velocity around the swing hit time
          if (timeSinceHit >= -0.1 && timeSinceHit <= displayDuration) {
            // Find ball position at the swing timestamp
            const swingBallPos = findNearestBallPosition(ballPositions, swing.ball_hit.timestamp, 0.2);
            if (!swingBallPos) continue;
            
            // Calculate opacity with fade in/out
            let opacity = 1;
            if (timeSinceHit < 0) {
              // Fade in
              opacity = 1 + (timeSinceHit / 0.1);
            } else if (timeSinceHit > displayDuration - velocityConfig.fadeOutMs / 1000) {
              // Fade out
              const fadeProgress = (timeSinceHit - (displayDuration - velocityConfig.fadeOutMs / 1000)) / (velocityConfig.fadeOutMs / 1000);
              opacity = 1 - fadeProgress;
            }
            opacity = Math.max(0, Math.min(1, opacity));
            
            if (opacity <= 0) continue;
            
            // Get ball position for display location
            const ballX = swingBallPos.X * logicalWidth;
            const ballY = swingBallPos.Y * logicalHeight;
            
            // Determine position to avoid player (prefer above the ball, offset to side)
            const offsetDistance = velOffset;
            let boxX = ballX;
            let boxY: number;
            
            // Check if there's an annotation with player bbox
            const annotation = swing.annotations?.[0];
            if (annotation) {
              const [bx1, by1, bx2, by2] = annotation.bbox;
              const playerCenterX = ((bx1 + bx2) / 2) * logicalWidth;
              const playerTop = by1 * logicalHeight;
              const playerBottom = by2 * logicalHeight;
              
              // Place velocity box on opposite side of player from ball
              if (ballY < playerTop) {
                // Ball is above player, place box above ball
                boxY = ballY - offsetDistance;
              } else if (ballY > playerBottom) {
                // Ball is below player, place box below ball
                boxY = ballY + offsetDistance;
              } else {
                // Ball overlaps player, place to the side
                boxY = ballY - offsetDistance;
                boxX = ballX + (ballX < playerCenterX ? -offsetDistance : offsetDistance);
              }
            } else {
              // No bbox, default to above the ball (typical overhead camera view)
              boxY = ballY - offsetDistance;
            }
            
            // Format swing type using shared utility
            const swingTypeFormatted = formatSwingType(swing.swing_type);
            
            // Format velocity text (no perspective scaling - must stay readable!)
            const speed = Math.round(swing.ball_speed);
            const speedText = `${speed}`;
            const unit = "km/h";
            
            // Mobile detection: hide swing type and use smaller fonts on narrow screens
            const isMobile = logicalWidth < 480;
            const mobileScale = isMobile ? 0.75 : 1;
            
            // Calculate text dimensions (scaled for fullscreen and mobile)
            const fontSize = velFontSize * mobileScale;
            const typeFontSize = fontSize * 0.6;
            const unitFontSize = fontSize * 0.65;
            
            // Measure speed + unit
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            const speedMetrics = ctx.measureText(speedText);
            ctx.font = `${unitFontSize}px system-ui, -apple-system, sans-serif`;
            const unitMetrics = ctx.measureText(unit);
            
            const padding = velPadding * mobileScale;
            const speedRowWidth = speedMetrics.width + unitMetrics.width + padding * 0.5;
            
            // On mobile: only speed row, no swing type row
            let totalWidth: number;
            let boxHeight: number;
            if (isMobile) {
              totalWidth = speedRowWidth + padding * 2;
              boxHeight = fontSize + padding * 2;
            } else {
              // Measure swing type for desktop
              ctx.font = `${typeFontSize}px system-ui, -apple-system, sans-serif`;
              const typeMetrics = ctx.measureText(swingTypeFormatted);
              totalWidth = Math.max(typeMetrics.width, speedRowWidth) + padding * 2;
              boxHeight = typeFontSize + fontSize + padding * 2.5;
            }
            
            // Clamp box position to canvas bounds
            boxX = Math.max(totalWidth / 2 + 5, Math.min(logicalWidth - totalWidth / 2 - 5, boxX));
            boxY = Math.max(boxHeight / 2 + 5, Math.min(logicalHeight - boxHeight / 2 - 5, boxY));
            
            // Draw background box
            const boxLeft = boxX - totalWidth / 2;
            const boxTop = boxY - boxHeight / 2;
            const borderRadius = velBorderRadius * mobileScale;
            
            ctx.globalAlpha = opacity;
            
            // Draw connecting line from ball to box (hidden on mobile by using background color)
            ctx.strokeStyle = isMobile ? velocityConfig.backgroundColor : velocityConfig.borderColor;
            ctx.lineWidth = 1.5 * scale * mobileScale;
            ctx.beginPath();
            ctx.moveTo(ballX, ballY);
            ctx.lineTo(boxX, boxY);
            ctx.stroke();
            
            // Draw small dot at ball end of line (hidden on mobile by using background color)
            ctx.fillStyle = isMobile ? velocityConfig.backgroundColor : velocityConfig.borderColor;
            ctx.beginPath();
            ctx.arc(ballX, ballY, 3 * scale * mobileScale, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw rounded rectangle background
            ctx.fillStyle = velocityConfig.backgroundColor;
            ctx.beginPath();
            ctx.roundRect(boxLeft, boxTop, totalWidth, boxHeight, borderRadius);
            ctx.fill();
            
            // Draw border (only on desktop)
            if (!isMobile) {
              ctx.strokeStyle = velocityConfig.borderColor;
              ctx.lineWidth = 2 * mobileScale;
              ctx.beginPath();
              ctx.roundRect(boxLeft, boxTop, totalWidth, boxHeight, borderRadius);
              ctx.stroke();
            }
            
            let speedY: number;
            
            if (isMobile) {
              // Mobile: just speed + unit centered vertically
              speedY = boxTop + boxHeight / 2;
            } else {
              // Desktop: draw swing type (above, smaller, gray)
              const typeY = boxTop + padding + typeFontSize / 2;
              ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
              ctx.font = `${typeFontSize}px system-ui, -apple-system, sans-serif`;
              ctx.textBaseline = "middle";
              ctx.fillText(swingTypeFormatted, boxLeft + padding, typeY);
              
              // Speed text below type
              speedY = typeY + typeFontSize / 2 + padding * 0.5 + fontSize / 2;
            }
            
            // Draw speed text
            ctx.fillStyle = velocityConfig.textColor;
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textBaseline = "middle";
            ctx.fillText(speedText, boxLeft + padding, speedY);
            
            // Draw unit text (next to speed)
            ctx.fillStyle = velocityConfig.unitColor;
            ctx.font = `${unitFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.fillText(unit, boxLeft + padding + speedMetrics.width + padding * 0.3, speedY);
            
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw player bounding boxes
      if (showPlayerBoxes && swings.length > 0) {
        const playerBoxConfig = OVERLAY_COLORS.playerBox;
        const displayDuration = playerBoxConfig.displayDurationMs / 1000;
        
        // Track which players we've drawn to avoid duplicates at the same timestamp
        const drawnPlayers = new Set<number>();
        
        for (const swing of swings) {
          // Skip if no annotation with bbox
          if (!swing.annotations?.[0]?.bbox) continue;
          
          const timeSinceHit = currentTime - swing.ball_hit.timestamp;
          
          // Only show around the swing hit time
          if (timeSinceHit >= -0.1 && timeSinceHit <= displayDuration) {
            // Skip if we've already drawn this player at this time
            if (drawnPlayers.has(swing.player_id)) continue;
            drawnPlayers.add(swing.player_id);
            
            const annotation = swing.annotations[0];
            const [bx1, by1, bx2, by2] = annotation.bbox;
            
            // Convert normalized coords to logical pixels
            const x1 = bx1 * logicalWidth;
            const y1 = by1 * logicalHeight;
            const x2 = bx2 * logicalWidth;
            const y2 = by2 * logicalHeight;
            const boxWidth = x2 - x1;
            const boxHeight = y2 - y1;
            
            // Calculate opacity with fade in/out
            let opacity = 1;
            if (timeSinceHit < 0) {
              opacity = 1 + (timeSinceHit / 0.1);
            } else if (timeSinceHit > displayDuration - 0.3) {
              const fadeProgress = (timeSinceHit - (displayDuration - 0.3)) / 0.3;
              opacity = 1 - fadeProgress;
            }
            opacity = Math.max(0, Math.min(1, opacity));
            
            if (opacity <= 0) continue;
            
            // Get player color (cycle through available colors)
            const colorIndex = swing.player_id % playerBoxConfig.colors.length;
            const colors = playerBoxConfig.colors[colorIndex];
            
            ctx.globalAlpha = opacity;
            
            // Draw filled background
            ctx.fillStyle = colors.fill;
            ctx.fillRect(x1, y1, boxWidth, boxHeight);
            
            // Draw border
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = playerBoxConfig.lineWidth;
            ctx.strokeRect(x1, y1, boxWidth, boxHeight);
            
            // Draw player label (use display name if available, fallback to P + id)
            const label = playerDisplayNames[swing.player_id] || `P${swing.player_id}`;
            const fontSize = playerBoxConfig.labelFontSize;
            const padding = playerBoxConfig.labelPadding;
            
            ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
            const labelMetrics = ctx.measureText(label);
            const labelWidth = labelMetrics.width + padding * 2;
            const labelHeight = fontSize + padding * 2;
            
            // Position label at top of box
            const labelX = x1;
            const labelY = y1 - labelHeight;
            
            // Draw label background
            ctx.fillStyle = `rgba(0, 0, 0, ${playerBoxConfig.labelBackgroundOpacity})`;
            ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label border (same color as box)
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
            
            // Draw label text
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
            
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw pose skeletons (custom drawing for proper perspective scaling)
      // Uses full annotations array to show pose throughout the entire swing
      if (showPose && swings.length > 0) {
        const fadeInDuration = 0.15; // Fade in at start
        const fadeOutDuration = 0.3; // Fade out at end
        const drawnPoses = new Set<number>();
        
        for (const swing of swings) {
          // Skip if no annotations with keypoints
          if (!swing.annotations || swing.annotations.length === 0) continue;
          
          // Filter annotations that have keypoints
          const validAnnotations = swing.annotations.filter(
            ann => ann.keypoints && ann.keypoints.length >= 17
          );
          if (validAnnotations.length === 0) continue;
          
          const swingStart = swing.start.timestamp;
          const swingEnd = swing.end.timestamp;
          const swingDuration = swingEnd - swingStart;
          
          // Check if current time is within the swing window
          if (currentTime < swingStart - fadeInDuration || currentTime > swingEnd + fadeOutDuration) {
            continue;
          }
          
          // Skip if we've already drawn this player's pose
          if (drawnPoses.has(swing.player_id)) continue;
          drawnPoses.add(swing.player_id);
          
          // Find which annotation to use based on current time
          // Map current time to annotation index
          let annotation;
          if (validAnnotations.length === 1) {
            annotation = validAnnotations[0];
          } else {
            // Calculate progress through the swing (0 to 1)
            const progress = Math.max(0, Math.min(1, (currentTime - swingStart) / swingDuration));
            // Map to annotation index
            const annotationIndex = Math.min(
              validAnnotations.length - 1,
              Math.floor(progress * validAnnotations.length)
            );
            annotation = validAnnotations[annotationIndex];
          }
          
          if (!annotation?.keypoints) continue;
          
          // Calculate opacity with fade in/out
          let opacity = 1;
          if (currentTime < swingStart) {
            // Fade in before swing starts
            opacity = 1 - (swingStart - currentTime) / fadeInDuration;
          } else if (currentTime > swingEnd) {
            // Fade out after swing ends
            opacity = 1 - (currentTime - swingEnd) / fadeOutDuration;
          }
          opacity = Math.max(0, Math.min(1, opacity));
          
          if (opacity <= 0) continue;
          
          ctx.globalAlpha = opacity;
          
          // Convert keypoints from [[x, y], ...] to { x, y, score }[] format
          // and scale to pixel coordinates (same approach as VideoPoseViewerCore)
          const scaledKeypoints = annotation.keypoints.map((kp, idx) => {
            if (!kp || kp.length < 2) {
              return { x: 0, y: 0, score: 0, name: `keypoint_${idx}` };
            }
            // Check if keypoint is valid (not at origin)
            const isValid = kp[0] > 0.01 || kp[1] > 0.01;
            return {
              x: kp[0] * logicalWidth,
              y: kp[1] * logicalHeight,
              score: isValid ? (annotation.confidences?.[idx] ?? 1.0) : 0,
              name: `keypoint_${idx}`,
            };
          });
          
          // Calculate player's center Y for perspective scaling
          let playerCenterY = 0.5; // Default to middle
          if (annotation.bbox) {
            const [, by1, , by2] = annotation.bbox;
            playerCenterY = (by1 + by2) / 2; // Normalized center Y
          } else {
            const validKps = scaledKeypoints.filter(kp => (kp.score ?? 0) > 0.3);
            if (validKps.length > 0) {
              const avgY = validKps.reduce((sum, kp) => sum + kp.y, 0) / validKps.length;
              playerCenterY = avgY / logicalHeight; // Normalize
            }
          }
          
          // Apply perspective scaling (same as ball indicator)
          const perspectiveScale = getPerspectiveScale(playerCenterY);
          
          // Calculate base sizes from bounding box height
          let boxHeight = 100; // Default
          if (annotation.bbox) {
            const [, by1, , by2] = annotation.bbox;
            boxHeight = (by2 - by1) * logicalHeight;
          } else {
            const validKps = scaledKeypoints.filter(kp => (kp.score ?? 0) > 0.3);
            if (validKps.length > 0) {
              const yCoords = validKps.map(kp => kp.y);
              boxHeight = Math.max(...yCoords) - Math.min(...yCoords);
            }
          }
          
          // Calculate sizes using POSE_CONFIG constants
          const baseRadius = Math.max(
            POSE_CONFIG.jointRadiusMin, 
            Math.min(POSE_CONFIG.jointRadiusMax, boxHeight * POSE_CONFIG.jointRadiusMultiplier)
          );
          const baseLineWidth = Math.max(
            POSE_CONFIG.lineWidthMin, 
            Math.min(POSE_CONFIG.lineWidthMax, boxHeight * POSE_CONFIG.lineWidthMultiplier)
          );
          const jointRadius = baseRadius * perspectiveScale;
          const lineWidth = baseLineWidth * perspectiveScale;
          
          // Draw skeleton connections directly (no face - indices 0-4)
          ctx.strokeStyle = POSE_CONFIG.lineColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          
          for (const conn of POSE_CONNECTIONS) {
            // Skip face connections (indices 0-4)
            if (conn.start <= 4 || conn.end <= 4) continue;
            
            const p1 = scaledKeypoints[conn.start];
            const p2 = scaledKeypoints[conn.end];
            
            if (p1 && p2 && (p1.score ?? 0) > 0.3 && (p2.score ?? 0) > 0.3) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
          
          // Draw keypoints (skip face - indices 0-4)
          for (let i = 5; i < scaledKeypoints.length; i++) {
            const kp = scaledKeypoints[i];
            if ((kp.score ?? 0) > 0.3) {
              // Small filled circle
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, jointRadius, 0, 2 * Math.PI);
              ctx.fillStyle = POSE_CONFIG.jointColor;
              ctx.fill();
            }
          }
          
          ctx.globalAlpha = 1;
        }
      }

      // Draw ball indicator (circle, crosshairs, glow)
      if (showIndicator && position) {
        const x = position.X * logicalWidth;
        const y = position.Y * logicalHeight;
        
        // Calculate radius using perspective
        const perspectiveScale = getPerspectiveScale(position.Y);
        const radius = minRadius + (maxRadius - minRadius) * perspectiveScale;
        
        // Scale crosshair and glow proportionally  
        const scale = perspectiveScale;
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

      // Draw filter radius circle (debug visualization)
      // Shows the maximum distance the ball can move before being filtered out
      // Velocity-based: larger radius when ball is moving fast, smaller when slow
      if (showFilterRadius && position) {
        const x = position.X * logicalWidth;
        const y = position.Y * logicalHeight;
        
        // Calculate current velocity from recent positions
        let currentVelocity = 0;
        let avgVelX = 0;
        let avgVelY = 0;
        
        if (trail.length >= 2) {
          const numSamples = Math.min(5, trail.length - 1);
          let totalVel = 0;
          let validSamples = 0;
          
          for (let i = trail.length - numSamples; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            if (prev && curr) {
              const dt = curr.timestamp - prev.timestamp;
              if (dt > 0) {
                const dx = curr.X - prev.X;
                const dy = curr.Y - prev.Y;
                const vel = Math.sqrt(dx * dx + dy * dy) / dt;
                totalVel += vel;
                avgVelX += dx / dt;
                avgVelY += dy / dt;
                validSamples++;
              }
            }
          }
          if (validSamples > 0) {
            currentVelocity = totalVel / validSamples;
            avgVelX /= validSamples;
            avgVelY /= validSamples;
          }
        }
        
        // Velocity-based filter radius:
        // - Minimum: 3% of frame (for stationary/slow ball like serve toss)
        // - Maximum: 12% of frame (for fast shots)
        // - Scales with velocity: base + velocity * scale_factor
        const MIN_RADIUS = 0.03;
        const MAX_RADIUS = 0.12;
        const VELOCITY_SCALE = 0.08; // How much velocity affects radius
        
        const dynamicRadius = Math.min(MAX_RADIUS, MIN_RADIUS + currentVelocity * VELOCITY_SCALE);
        const filterRadius = dynamicRadius * logicalWidth;
        
        // Draw dashed circle showing the filter boundary
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = "rgba(255, 100, 100, 0.7)"; // Red-ish
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(x, y, filterRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
        
        // Draw label with current values
        const radiusPercent = (dynamicRadius * 100).toFixed(1);
        const velDisplay = (currentVelocity * 100).toFixed(0);
        ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "rgba(255, 100, 100, 0.9)";
        ctx.textAlign = "center";
        ctx.fillText(`Filter: ${radiusPercent}% (vel: ${velDisplay}%/s)`, x, y - filterRadius - 8 * scale);
        
        // Draw predicted direction arrow
        const velMagnitude = Math.sqrt(avgVelX * avgVelX + avgVelY * avgVelY);
        if (velMagnitude > 0.02) {
          // Predict ~0.1 seconds ahead
          const predictionTime = 0.1;
          const arrowEndX = x + avgVelX * predictionTime * logicalWidth;
          const arrowEndY = y + avgVelY * predictionTime * logicalHeight;
          
          // Clamp arrow length
          const arrowDx = arrowEndX - x;
          const arrowDy = arrowEndY - y;
          const arrowLength = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
          const maxArrowLength = filterRadius * 2;
          
          let finalEndX = arrowEndX;
          let finalEndY = arrowEndY;
          if (arrowLength > maxArrowLength) {
            const ratio = maxArrowLength / arrowLength;
            finalEndX = x + arrowDx * ratio;
            finalEndY = y + arrowDy * ratio;
          }
          
          // Draw arrow line
          ctx.strokeStyle = "rgba(100, 200, 255, 0.9)"; // Cyan/blue
          ctx.lineWidth = 3 * scale;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(finalEndX, finalEndY);
          ctx.stroke();
          
          // Draw arrowhead
          const headLength = 10 * scale;
          const angle = Math.atan2(finalEndY - y, finalEndX - x);
          
          ctx.fillStyle = "rgba(100, 200, 255, 0.9)";
          ctx.beginPath();
          ctx.moveTo(finalEndX, finalEndY);
          ctx.lineTo(
            finalEndX - headLength * Math.cos(angle - Math.PI / 6),
            finalEndY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            finalEndX - headLength * Math.cos(angle + Math.PI / 6),
            finalEndY - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }

      lastPausedRef.current = isPaused;
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [ballPositions, rawBallPositions, ballBounces, swings, videoRef, timeThreshold, usePerspective, showIndicator, showTrail, useSmoothing, showBounceRipples, showVelocity, showPlayerBoxes, showPose, scale, isVideoReady, videoDimensions, showFilterRadius]);

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

