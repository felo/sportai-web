"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { OVERLAY_COLORS } from "../../../constants";
import { formatSwingType } from "../../../utils";
import { COURT, GRID_COLS, GRID_ROWS } from "../constants";
import type { CellTooltipProps } from "../types";

/**
 * Tooltip component for grid cells showing shot details
 */
export function CellTooltip({
  originDetails,
  landingDetails,
  col,
  row,
  visible,
}: CellTooltipProps) {
  if (!visible) return null;

  const { velocity } = OVERLAY_COLORS;
  const hasData = originDetails.length > 0 || landingDetails.length > 0;

  // Calculate court position in meters (center of cell)
  // col maps to length (0-20m), row maps to width (0-10m)
  const courtLengthPos = ((col + 0.5) / GRID_COLS) * COURT.length; // 0-20m
  const courtWidthPos = ((row + 0.5) / GRID_ROWS) * COURT.width; // 0-10m

  // Smart positioning: adjust based on cell position in grid
  const isNearLeftEdge = col < 3;
  const isNearRightEdge = col >= GRID_COLS - 3;

  let horizontalPosition: React.CSSProperties;
  let arrowPosition: React.CSSProperties;

  if (isNearLeftEdge) {
    horizontalPosition = { left: 0, transform: "none" };
    arrowPosition = { left: "20px", transform: "none" };
  } else if (isNearRightEdge) {
    horizontalPosition = { right: 0, transform: "none" };
    arrowPosition = { right: "20px", left: "auto", transform: "none" };
  } else {
    horizontalPosition = { left: "50%", transform: "translateX(-50%)" };
    arrowPosition = { left: "50%", transform: "translateX(-50%)" };
  }

  // Group shots by type
  const originByType: Record<string, { count: number; speeds: number[] }> = {};
  originDetails.forEach((s) => {
    if (!originByType[s.swingType]) originByType[s.swingType] = { count: 0, speeds: [] };
    originByType[s.swingType].count++;
    if (s.speed > 0) originByType[s.swingType].speeds.push(s.speed);
  });

  const landingByType: Record<string, { count: number; speeds: number[] }> = {};
  landingDetails.forEach((s) => {
    if (!landingByType[s.swingType]) landingByType[s.swingType] = { count: 0, speeds: [] };
    landingByType[s.swingType].count++;
    if (s.speed > 0) landingByType[s.swingType].speeds.push(s.speed);
  });

  return (
    <Box
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        zIndex: 1000,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
        ...horizontalPosition,
      }}
    >
      <Box
        style={{
          backgroundColor: velocity.backgroundColor,
          border: `2px solid ${velocity.borderColor}`,
          borderRadius: velocity.borderRadius,
          padding: hasData ? "8px 12px" : "6px 10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
          minWidth: hasData ? "120px" : "auto",
        }}
      >
        {/* Grid coordinate and court position */}
        <Text
          size="1"
          style={{
            color: "rgba(255, 255, 255, 0.6)",
            display: "block",
            marginBottom: hasData ? "4px" : "0",
          }}
        >
          <Text style={{ fontFamily: "monospace", color: "rgba(255, 255, 255, 0.8)" }}>
            ({col},{row})
          </Text>
          {" · "}📍 {courtLengthPos.toFixed(1)}m × {courtWidthPos.toFixed(1)}m
        </Text>

        {/* Origin shots */}
        {Object.entries(originByType).map(([type, data]) => {
          const avgSpeed =
            data.speeds.length > 0
              ? Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length)
              : 0;
          return (
            <Flex key={`origin-${type}`} align="center" gap="2" style={{ marginBottom: "2px" }}>
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: "rgba(255, 200, 50, 0.9)",
                }}
              />
              <Text size="1" style={{ color: velocity.textColor }}>
                {formatSwingType(type)} ×{data.count}
                {avgSpeed > 0 && (
                  <Text style={{ color: velocity.unitColor }}> ({avgSpeed} km/h)</Text>
                )}
              </Text>
            </Flex>
          );
        })}

        {/* Landing shots */}
        {Object.entries(landingByType).map(([type, data]) => {
          const avgSpeed =
            data.speeds.length > 0
              ? Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length)
              : 0;
          return (
            <Flex key={`landing-${type}`} align="center" gap="2" style={{ marginBottom: "2px" }}>
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: "rgba(122, 219, 143, 0.9)",
                }}
              />
              <Text size="1" style={{ color: velocity.textColor }}>
                {formatSwingType(type)} ×{data.count}
                {avgSpeed > 0 && (
                  <Text style={{ color: velocity.unitColor }}> ({avgSpeed} km/h)</Text>
                )}
              </Text>
            </Flex>
          );
        })}
      </Box>

      {/* Arrow */}
      <Box
        style={{
          position: "absolute",
          top: "100%",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${velocity.borderColor}`,
          ...arrowPosition,
        }}
      />
    </Box>
  );
}







