"use client";

import { Box, Tooltip } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { ScrollButtonProps } from "../types";

/**
 * A circular scroll button for horizontal carousel navigation.
 */
export function ScrollButton({ direction, onClick }: ScrollButtonProps) {
  return (
    <Tooltip content={direction === "left" ? "Scroll left" : "Scroll right"}>
      <Box
        onClick={onClick}
        style={{
          position: "absolute",
          [direction]: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 40,
          height: 40,
          borderRadius: "50%",
          backgroundColor: "var(--gray-12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(-50%)";
        }}
      >
        {direction === "left" ? (
          <ChevronLeftIcon width={20} height={20} style={{ color: "var(--gray-1)" }} />
        ) : (
          <ChevronRightIcon width={20} height={20} style={{ color: "var(--gray-1)" }} />
        )}
      </Box>
    </Tooltip>
  );
}
