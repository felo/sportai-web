"use client";

import { Box } from "@radix-ui/themes";

// Padel court dimensions in meters (portrait/vertical orientation)
// Standard court: 20m long (Y axis) x 10m wide (X axis)
const COURT = {
  length: 20,        // Y axis (vertical) - top to bottom
  width: 10,         // X axis (horizontal) - left to right
  serviceLineFromBack: 3, // Service line is 3m from back wall
  backWallSolid: 4,  // Solid wall section at back corners
};

interface PadelCourt2DProps {
  className?: string;
}

export function PadelCourt2D({ className }: PadelCourt2DProps) {
  // Court colors
  const courtColor = "#3B5DC9"; // Blue court surface (matching reference)
  const lineColor = "#ffffff";
  const wallColor = "#1a1a2e"; // Dark walls
  const netColor = "#6B7DB3"; // Slightly lighter blue for net
  
  const wallThickness = 0.3;
  const lineWidth = 0.05;
  
  return (
    <Box
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "var(--radius-3)",
        overflow: "hidden",
        backgroundColor: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${COURT.width} ${COURT.length}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {/* Court surface */}
        <rect
          x={0}
          y={0}
          width={COURT.width}
          height={COURT.length}
          fill={courtColor}
        />
        
        {/* === WALLS === */}
        
        {/* Top back wall (full width) */}
        <rect x={0} y={0} width={COURT.width} height={wallThickness} fill={wallColor} />
        
        {/* Bottom back wall (full width) */}
        <rect x={0} y={COURT.length - wallThickness} width={COURT.width} height={wallThickness} fill={wallColor} />
        
        {/* Left side wall - solid section at top corner (4m) */}
        <rect x={0} y={0} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        
        {/* Left side wall - solid section at bottom corner (4m) */}
        <rect x={0} y={COURT.length - COURT.backWallSolid} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        
        {/* Right side wall - solid section at top corner (4m) */}
        <rect x={COURT.width - wallThickness} y={0} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        
        {/* Right side wall - solid section at bottom corner (4m) */}
        <rect x={COURT.width - wallThickness} y={COURT.length - COURT.backWallSolid} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        
        {/* === NET === */}
        <rect
          x={0}
          y={COURT.length / 2 - 0.15}
          width={COURT.width}
          height={0.3}
          fill={netColor}
        />
        
        {/* === COURT LINES === */}
        
        {/* Outer boundary */}
        <rect
          x={wallThickness}
          y={wallThickness}
          width={COURT.width - wallThickness * 2}
          height={COURT.length - wallThickness * 2}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        
        {/* Top service line (3m from top back wall) */}
        <line
          x1={wallThickness}
          y1={COURT.serviceLineFromBack}
          x2={COURT.width - wallThickness}
          y2={COURT.serviceLineFromBack}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        
        {/* Bottom service line (3m from bottom back wall) */}
        <line
          x1={wallThickness}
          y1={COURT.length - COURT.serviceLineFromBack}
          x2={COURT.width - wallThickness}
          y2={COURT.length - COURT.serviceLineFromBack}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        
        {/* Center line - top half (from service line to net) */}
        <line
          x1={COURT.width / 2}
          y1={COURT.serviceLineFromBack}
          x2={COURT.width / 2}
          y2={COURT.length / 2}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        
        {/* Center line - bottom half (from net to service line) */}
        <line
          x1={COURT.width / 2}
          y1={COURT.length / 2}
          x2={COURT.width / 2}
          y2={COURT.length - COURT.serviceLineFromBack}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
      </svg>
    </Box>
  );
}

