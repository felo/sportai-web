"use client";

import { Box, Flex } from "@radix-ui/themes";
import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import type { SortColumn, SortDirection } from "../types";

interface SortableHeaderProps {
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
}

/**
 * Sortable table header component with visual indicator.
 */
export function SortableHeader({
  column,
  currentColumn,
  direction,
  onSort,
  children,
}: SortableHeaderProps) {
  const isActive = currentColumn === column;

  return (
    <Flex
      align="center"
      gap="1"
      onClick={() => onSort(column)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
      {isActive ? (
        direction === "asc" ? (
          <ChevronUpIcon width={12} height={12} />
        ) : (
          <ChevronDownIcon width={12} height={12} />
        )
      ) : (
        <Box style={{ width: 12, height: 12, opacity: 0.3 }}>
          <ChevronDownIcon width={12} height={12} />
        </Box>
      )}
    </Flex>
  );
}


