"use client";

import { useState, useEffect } from "react";
import { Box } from "@radix-ui/themes";
import type { PlayerShotData } from "../../types";
import {
  COURT,
  GRID_COLS,
  GRID_ROWS,
  CELL_ANIMATION_DURATION,
  CELL_STAGGER_DELAY,
  TRAJECTORY_TOTAL_TIME,
} from "../../constants";
import { BackgroundCells } from "./BackgroundCells";
import { TrajectoryOverlay } from "./TrajectoryOverlay";
import { NumbersOverlay } from "./NumbersOverlay";
import { HoverLayer } from "./HoverLayer";
import { CellLocationDialog } from "../CellLocationDialog";

interface CourtGridProps {
  data: PlayerShotData;
  originLabel: string;
}

/**
 * Court grid visualization with animated layers
 * Manages animation state and coordinates between layers
 */
export function CourtGrid({ data, originLabel }: CourtGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [cellsAnimating, setCellsAnimating] = useState(false);
  const [cellsComplete, setCellsComplete] = useState(false);
  const [trajectoriesComplete, setTrajectoriesComplete] = useState(false);

  // Phase 1: Trigger cell animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setCellsAnimating(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Phase 2: Mark cells complete, then trajectories will start
  useEffect(() => {
    if (cellsAnimating) {
      const maxCellDelay =
        (GRID_COLS + GRID_ROWS - 2) * CELL_STAGGER_DELAY + CELL_ANIMATION_DURATION;
      const timer = setTimeout(() => setCellsComplete(true), maxCellDelay + 100);
      return () => clearTimeout(timer);
    }
  }, [cellsAnimating]);

  // Phase 3: Mark trajectories complete after they finish
  useEffect(() => {
    if (cellsComplete && data.pairs.length > 0) {
      const timer = setTimeout(() => setTrajectoriesComplete(true), TRAJECTORY_TOTAL_TIME + 100);
      return () => clearTimeout(timer);
    } else if (cellsComplete && data.pairs.length === 0) {
      setTrajectoriesComplete(true);
    }
  }, [cellsComplete, data.pairs.length]);

  const maxOrigin = Math.max(...data.origins.flat(), 1);
  const maxLanding = Math.max(...data.landings.flat(), 1);

  return (
    <>
      <Box
        style={{
          position: "relative",
          background: "var(--gray-3)",
          borderRadius: "var(--radius-3)",
          padding: "8px",
          border: "1px solid var(--gray-6)",
          overflow: "visible",
        }}
      >
        <Box
          style={{
            position: "relative",
            aspectRatio: `${COURT.aspectRatio} / 1`,
            overflow: "visible",
          }}
        >
          {/* Layer 1: Background cells */}
          <BackgroundCells
            origins={data.origins}
            landings={data.landings}
            maxOrigin={maxOrigin}
            maxLanding={maxLanding}
            hoveredCell={hoveredCell}
            cellsAnimating={cellsAnimating}
            cellsComplete={cellsComplete}
          />

          {/* Layer 2: SVG trajectories */}
          <TrajectoryOverlay
            pairs={data.pairs}
            playerId={data.playerId}
            cellsComplete={cellsComplete}
          />

          {/* Layer 3: Numbers overlay */}
          <NumbersOverlay
            origins={data.origins}
            landings={data.landings}
            hoveredCell={hoveredCell}
            trajectoriesComplete={trajectoriesComplete}
          />

          {/* Layer 4: Interactive hover layer */}
          <HoverLayer
            origins={data.origins}
            landings={data.landings}
            originDetails={data.originDetails}
            landingDetails={data.landingDetails}
            hoveredCell={hoveredCell}
            setHoveredCell={setHoveredCell}
            setSelectedCell={setSelectedCell}
            originLabel={originLabel}
          />
        </Box>
      </Box>

      {/* Cell location dialog */}
      <CellLocationDialog
        selectedCell={selectedCell}
        onClose={() => setSelectedCell(null)}
      />
    </>
  );
}





