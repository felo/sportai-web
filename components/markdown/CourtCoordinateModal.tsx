"use client";

import React from "react";
import { Dialog, Box, Flex, Text, Button } from "@radix-ui/themes";

// Court grid constants (same as ShotHeatmap)
const GRID_COLS = 12;
const GRID_ROWS = 6;
const COURT_ASPECT_RATIO = 2; // 20m length / 10m width

export interface CourtCoordinate {
  col: number;
  row: number;
  playerContext?: string; // e.g., "Player 1", "Player 2"
}

// Court zone for highlighting multiple cells
export interface CourtZone {
  name: string;
  description: string;
  cells: Array<{ col: number; row: number }>;
}

// Ball sequence types that can be clicked
export type BallSequenceType = 'serve' | 'return' | 'third-ball' | 'fourth-ball' | 'fifth-ball';

export interface BallSequenceClick {
  ballType: BallSequenceType;
  ballLabel: string;
  playerContext?: string;
}

// Court position term definitions with their zones
export const COURT_ZONE_DEFINITIONS: Record<string, CourtZone> = {
  // Far side zones (columns 6-11)
  'far-side right': {
    name: 'Far Side Right',
    description: 'Right side of opponent\'s court',
    cells: Array.from({ length: 6 }, (_, col) => 
      [4, 5].map(row => ({ col: col + 6, row }))
    ).flat(),
  },
  'far-side left': {
    name: 'Far Side Left', 
    description: 'Left side of opponent\'s court',
    cells: Array.from({ length: 6 }, (_, col) => 
      [0, 1].map(row => ({ col: col + 6, row }))
    ).flat(),
  },
  'far-side center': {
    name: 'Far Side Center',
    description: 'Center of opponent\'s court',
    cells: Array.from({ length: 6 }, (_, col) => 
      [2, 3].map(row => ({ col: col + 6, row }))
    ).flat(),
  },
  // Near side zones (columns 0-5)
  'near-side right': {
    name: 'Near Side Right',
    description: 'Right side of your court',
    cells: Array.from({ length: 6 }, (_, col) => 
      [4, 5].map(row => ({ col, row }))
    ).flat(),
  },
  'near-side left': {
    name: 'Near Side Left',
    description: 'Left side of your court', 
    cells: Array.from({ length: 6 }, (_, col) => 
      [0, 1].map(row => ({ col, row }))
    ).flat(),
  },
  'near-side center': {
    name: 'Near Side Center',
    description: 'Center of your court',
    cells: Array.from({ length: 6 }, (_, col) => 
      [2, 3].map(row => ({ col, row }))
    ).flat(),
  },
  // Shot directions
  'down-the-line': {
    name: 'Down the Line',
    description: 'Shots along the sidelines',
    cells: [
      // Left sideline (row 0)
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 0 })),
      // Right sideline (row 5)
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 5 })),
    ],
  },
  'cross-court': {
    name: 'Cross Court',
    description: 'Diagonal shots across the court',
    cells: [
      // Diagonal pattern - corners
      { col: 0, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 2 },
      { col: 9, row: 3 }, { col: 10, row: 4 }, { col: 11, row: 5 },
      { col: 0, row: 5 }, { col: 1, row: 4 }, { col: 2, row: 3 },
      { col: 9, row: 2 }, { col: 10, row: 1 }, { col: 11, row: 0 },
    ],
  },
  
  // === PADEL COURT ZONES ===
  
  // Service Boxes - where serves land and receivers position
  'service box': {
    name: 'Service Box',
    description: 'Area where serves land and receivers stand, diagonally opposite the server',
    cells: [
      // Near side service boxes (columns 3-5, all rows)
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 3, row }))
      ).flat(),
      // Far side service boxes (columns 6-8, all rows)
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 6, row }))
      ).flat(),
    ],
  },
  'service boxes': {
    name: 'Service Boxes',
    description: 'Areas where serves land and receivers stand, diagonally opposite the server',
    cells: [
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 3, row }))
      ).flat(),
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 6, row }))
      ).flat(),
    ],
  },
  
  // Receiving Boxes - diagonally opposite to service box
  'receiving box': {
    name: 'Receiving Box',
    description: 'Area where the receiver stands, diagonally opposite the server',
    cells: [
      // Receiving positions - mid-court areas
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 2, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 8, row }))
      ).flat(),
    ],
  },
  'receiving boxes': {
    name: 'Receiving Boxes',
    description: 'Areas where receivers stand, diagonally opposite the server',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 2, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 8, row }))
      ).flat(),
    ],
  },
  
  // Net Area - crucial for volleying
  'net area': {
    name: 'Net Area',
    description: 'Zone immediately adjacent to the net, crucial for volleying and finishing points',
    cells: [
      // Columns 5-6 (closest to net on both sides)
      ...Array.from({ length: GRID_ROWS }, (_, row) => ({ col: 5, row })),
      ...Array.from({ length: GRID_ROWS }, (_, row) => ({ col: 6, row })),
    ],
  },
  'net zone': {
    name: 'Net Zone',
    description: 'Zone immediately adjacent to the net, crucial for volleying and finishing points',
    cells: [
      ...Array.from({ length: GRID_ROWS }, (_, row) => ({ col: 5, row })),
      ...Array.from({ length: GRID_ROWS }, (_, row) => ({ col: 6, row })),
    ],
  },
  
  // Mid-Court Zone
  'mid-court': {
    name: 'Mid-Court Zone',
    description: 'Area between service line and back court, key transition zone',
    cells: [
      // Near side mid-court (columns 2-4)
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 2, row }))
      ).flat(),
      // Far side mid-court (columns 7-9)
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 7, row }))
      ).flat(),
    ],
  },
  'mid-court zone': {
    name: 'Mid-Court Zone',
    description: 'Area between service line and back court, balancing offense and defense',
    cells: [
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 2, row }))
      ).flat(),
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 7, row }))
      ).flat(),
    ],
  },
  
  // Back of the Court - near back glass
  'back of the court': {
    name: 'Back of the Court',
    description: 'Area near the back glass wall, requires good anticipation of rebounds',
    cells: [
      // Near side back (columns 0-1)
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      // Far side back (columns 10-11)
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  'back court': {
    name: 'Back Court',
    description: 'Area near the back glass wall, requires defensive technique',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  
  // Side Walls
  'side walls': {
    name: 'Side Walls',
    description: 'Glass walls on either side, integral for both offense and defense',
    cells: [
      // Left wall (row 0, all columns)
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 0 })),
      // Right wall (row 5, all columns)
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 5 })),
    ],
  },
  'side wall': {
    name: 'Side Wall',
    description: 'Glass wall on the side, used for rebounds and angles',
    cells: [
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 0 })),
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 5 })),
    ],
  },
  
  // Corners
  'corners': {
    name: 'Corners',
    description: 'Where side and back walls meet, challenging for retrieval and angles',
    cells: [
      // All four corners (2x2 areas)
      { col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 0 }, { col: 1, row: 1 },
      { col: 0, row: 4 }, { col: 0, row: 5 }, { col: 1, row: 4 }, { col: 1, row: 5 },
      { col: 10, row: 0 }, { col: 10, row: 1 }, { col: 11, row: 0 }, { col: 11, row: 1 },
      { col: 10, row: 4 }, { col: 10, row: 5 }, { col: 11, row: 4 }, { col: 11, row: 5 },
    ],
  },
  'corner': {
    name: 'Corner',
    description: 'Where side and back walls meet, challenging for retrieval',
    cells: [
      { col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 0 }, { col: 1, row: 1 },
      { col: 0, row: 4 }, { col: 0, row: 5 }, { col: 1, row: 4 }, { col: 1, row: 5 },
      { col: 10, row: 0 }, { col: 10, row: 1 }, { col: 11, row: 0 }, { col: 11, row: 1 },
      { col: 10, row: 4 }, { col: 10, row: 5 }, { col: 11, row: 4 }, { col: 11, row: 5 },
    ],
  },
  
  // Back Glass
  'back glass': {
    name: 'Back Glass',
    description: 'The back glass wall, used for defensive rebounds',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  'back wall': {
    name: 'Back Wall',
    description: 'The back glass wall area',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  'backwall': {
    name: 'Back Wall',
    description: 'The back glass wall area',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  'midcourt': {
    name: 'Mid-Court',
    description: 'Area between service line and back court',
    cells: [
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 2, row }))
      ).flat(),
      ...Array.from({ length: 3 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 7, row }))
      ).flat(),
    ],
  },
  'backcourt': {
    name: 'Back Court',
    description: 'Area near the back glass wall',
    cells: [
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col, row }))
      ).flat(),
      ...Array.from({ length: 2 }, (_, col) => 
        Array.from({ length: GRID_ROWS }, (_, row) => ({ col: col + 10, row }))
      ).flat(),
    ],
  },
  'sidewall': {
    name: 'Side Wall',
    description: 'Glass wall on the side',
    cells: [
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 0 })),
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 5 })),
    ],
  },
  'sidewalls': {
    name: 'Side Walls',
    description: 'Glass walls on either side',
    cells: [
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 0 })),
      ...Array.from({ length: GRID_COLS }, (_, col) => ({ col, row: 5 })),
    ],
  },
};

// Helper functions for zone labels
const getSideLabel = (c: number) => c < 6 ? "Near Side" : "Far Side";
const getWidthLabel = (r: number) => r < 2 ? "Left" : r > 3 ? "Right" : "Center";

interface CourtCoordinateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinate: CourtCoordinate | null;
  zone: CourtZone | null;
}

export function CourtCoordinateModal({ open, onOpenChange, coordinate, zone }: CourtCoordinateModalProps) {
  if (!coordinate && !zone) return null;

  // Build a set of highlighted cells
  const highlightedCells = new Set<string>();
  if (coordinate) {
    highlightedCells.add(`${coordinate.col},${coordinate.row}`);
  }
  if (zone) {
    zone.cells.forEach(cell => highlightedCells.add(`${cell.col},${cell.row}`));
  }

  const title = zone 
    ? zone.name 
    : coordinate 
      ? `${getSideLabel(coordinate.col)} · ${getWidthLabel(coordinate.row)}`
      : '';
  
  const description = zone
    ? zone.description
    : coordinate
      ? `Grid position (${coordinate.col}, ${coordinate.row})`
      : '';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 400 }}>
        <Dialog.Title>
          {title}
          {coordinate?.playerContext && (
            <Text size="2" color="gray" style={{ fontWeight: 400, marginLeft: 8 }}>
              ({coordinate.playerContext})
            </Text>
          )}
        </Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {description}
        </Dialog.Description>
        
        {/* Court grid with highlighted cells */}
        <Box
          style={{
            background: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            padding: "12px",
            marginTop: "16px",
          }}
        >
          {/* Side labels above */}
          <Flex justify="between" mb="2" px="1">
            <Text size="1" color="gray">Near Side</Text>
            <Text size="1" color="gray" style={{ opacity: 0.6 }}>|  Net  |</Text>
            <Text size="1" color="gray">Far Side</Text>
          </Flex>
          
          <Box
            style={{
              position: "relative",
              aspectRatio: `${COURT_ASPECT_RATIO} / 1`,
            }}
          >
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gap: "2px",
              }}
            >
              {Array.from({ length: GRID_ROWS }).flatMap((_, y) =>
                Array.from({ length: GRID_COLS }).map((_, x) => {
                  const isHighlighted = highlightedCells.has(`${x},${y}`);
                  const isNetColumn = x === Math.floor(GRID_COLS / 2);
                  
                  return (
                    <Box
                      key={`modal-${x}-${y}`}
                      style={{
                        backgroundColor: isHighlighted 
                          ? zone ? "rgba(56, 178, 172, 0.8)" : "var(--accent-9)"
                          : "var(--gray-5)",
                        borderRadius: "2px",
                        borderLeft: isNetColumn ? "2px solid var(--gray-8)" : undefined,
                        boxShadow: isHighlighted ? (zone ? "0 0 8px rgba(56, 178, 172, 0.6)" : "0 0 12px var(--accent-8)") : "none",
                        animation: isHighlighted && !zone ? "coordinatePulse 1.5s ease-in-out infinite" : "none",
                      }}
                    />
                  );
                })
              )}
            </Box>
          </Box>
          
          {/* Row labels */}
          <Flex justify="between" mt="2" px="1">
            <Text size="1" color="gray" style={{ fontFamily: "monospace", fontSize: "9px" }}>Row 0 (Left)</Text>
            <Text size="1" color="gray" style={{ fontFamily: "monospace", fontSize: "9px" }}>Row 5 (Right)</Text>
          </Flex>
        </Box>
        
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft">Close</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
      
      {/* Pulse animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes coordinatePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.15); }
        }
      `}} />
    </Dialog.Root>
  );
}

/**
 * Parse coordinate string like "(1, 0)", "Grid (1, 0)", "(Grid 10,0)", or "Grid 10,0" into CourtCoordinate
 */
export function parseCoordinate(text: string): CourtCoordinate | null {
  // Match patterns like (1, 0), (1,0), Grid (1, 0), (Grid 10,0), Grid 10,0
  const match = text.match(/(\d{1,2})\s*,\s*(\d)/);
  if (match) {
    const col = parseInt(match[1], 10);
    const row = parseInt(match[2], 10);
    // Validate ranges
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      return { col, row };
    }
  }
  return null;
}

