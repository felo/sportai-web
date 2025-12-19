"use client";

import { useId } from "react";
import type { ShotPair } from "../../types";
import {
  GRID_COLS,
  GRID_ROWS,
  TRAJECTORY_ANIMATION_DURATION,
  getTrajectoryStagger,
  getTrailColor,
} from "../../constants";

interface TrajectoryOverlayProps {
  pairs: ShotPair[];
  playerId: number;
  cellsComplete: boolean;
}

/**
 * SVG overlay rendering animated shot trajectories
 */
export function TrajectoryOverlay({
  pairs,
  playerId,
  cellsComplete,
}: TrajectoryOverlayProps) {
  const uniqueId = useId();
  const cellWidth = 100 / GRID_COLS;
  const cellHeight = 100 / GRID_ROWS;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 2,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {pairs.map((pair, idx) => {
          const x1 = (pair.originCol + 0.5) * cellWidth;
          const y1 = (pair.originRow + 0.5) * cellHeight;
          const x2 = (pair.landingCol + 0.5) * cellWidth;
          const y2 = (pair.landingRow + 0.5) * cellHeight;

          return (
            <linearGradient
              key={`grad-${idx}`}
              id={`shot-gradient-${uniqueId}-${playerId}-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={getTrailColor(1)} />
              <stop offset="100%" stopColor={getTrailColor(0)} />
            </linearGradient>
          );
        })}
      </defs>
      {(() => {
        const trajectoryStagger = getTrajectoryStagger(pairs.length);

        return pairs.map((pair, idx) => {
          const x1 = (pair.originCol + 0.5) * cellWidth;
          const y1 = (pair.originRow + 0.5) * cellHeight;
          const x2 = (pair.landingCol + 0.5) * cellWidth;
          const y2 = (pair.landingRow + 0.5) * cellHeight;

          const midX = (x1 + x2) / 2;
          const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const arcHeight = Math.min(15, distance * 0.3);
          const midY = (y1 + y2) / 2 - arcHeight;

          const arcPath = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
          const arcLength = distance * 1.2;
          const animationDelay = idx * trajectoryStagger;

          return (
            <g key={idx} opacity={0.85}>
              {/* Shadow path */}
              <path
                d={arcPath}
                fill="none"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={cellsComplete ? 0 : arcLength}
                style={{
                  transition: cellsComplete
                    ? `stroke-dashoffset ${TRAJECTORY_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms`
                    : "none",
                }}
              />
              {/* Gradient path */}
              <path
                d={arcPath}
                fill="none"
                stroke={`url(#shot-gradient-${uniqueId}-${playerId}-${idx})`}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={cellsComplete ? 0 : arcLength}
                style={{
                  transition: cellsComplete
                    ? `stroke-dashoffset ${TRAJECTORY_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms`
                    : "none",
                }}
              />
              {/* Landing dot */}
              <circle
                cx={x2}
                cy={y2}
                r="1.5"
                fill="rgba(122, 219, 143, 0.9)"
                style={{
                  opacity: cellsComplete ? 1 : 0,
                  transform: cellsComplete ? "scale(1)" : "scale(0)",
                  transformOrigin: `${x2}px ${y2}px`,
                  transition: cellsComplete
                    ? `opacity 200ms ease ${animationDelay + TRAJECTORY_ANIMATION_DURATION - 100}ms, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay + TRAJECTORY_ANIMATION_DURATION - 100}ms`
                    : "none",
                }}
              />
            </g>
          );
        });
      })()}
    </svg>
  );
}










