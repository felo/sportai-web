"use client";

import { Box, Flex, Text, Dialog, Button } from "@radix-ui/themes";
import { COURT, GRID_COLS, GRID_ROWS, PULSE_KEYFRAMES } from "../constants";
import { getSideLabel, getWidthLabel } from "../utils";

interface CellLocationDialogProps {
  selectedCell: { col: number; row: number } | null;
  onClose: () => void;
}

/**
 * Dialog showing grid location with highlighted cell
 */
export function CellLocationDialog({ selectedCell, onClose }: CellLocationDialogProps) {
  return (
    <Dialog.Root open={selectedCell !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content style={{ maxWidth: 400 }}>
        <Dialog.Title>
          {selectedCell &&
            `${getSideLabel(selectedCell.col)} · ${getWidthLabel(selectedCell.row)}`}
        </Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Grid position ({selectedCell?.col}, {selectedCell?.row})
        </Dialog.Description>

        {/* Court grid with highlighted cell */}
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
            <Text size="1" color="gray">
              Near Side
            </Text>
            <Text size="1" color="gray" style={{ opacity: 0.6 }}>
              | Net |
            </Text>
            <Text size="1" color="gray">
              Far Side
            </Text>
          </Flex>

          <Box
            style={{
              position: "relative",
              aspectRatio: `${COURT.aspectRatio} / 1`,
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
                  const isSelected = selectedCell?.col === x && selectedCell?.row === y;
                  const isNetColumn = x === Math.floor(GRID_COLS / 2);

                  return (
                    <Box
                      key={`modal-${x}-${y}`}
                      style={{
                        backgroundColor: isSelected ? "var(--accent-9)" : "var(--gray-5)",
                        borderRadius: "2px",
                        borderLeft: isNetColumn ? "2px solid var(--gray-8)" : undefined,
                        boxShadow: isSelected ? "0 0 12px var(--accent-8)" : "none",
                        animation: isSelected ? "pulse 1.5s ease-in-out infinite" : "none",
                      }}
                    />
                  );
                })
              )}
            </Box>
          </Box>

          {/* Row labels */}
          <Flex justify="between" mt="2" px="1">
            <Text size="1" color="gray" style={{ fontFamily: "monospace", fontSize: "9px" }}>
              Row 0 (Left)
            </Text>
            <Text size="1" color="gray" style={{ fontFamily: "monospace", fontSize: "9px" }}>
              Row 5 (Right)
            </Text>
          </Flex>
        </Box>

        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft">Close</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>

      {/* Pulse animation */}
      <style dangerouslySetInnerHTML={{ __html: PULSE_KEYFRAMES }} />
    </Dialog.Root>
  );
}










