"use client";

import { ReactNode, useState } from "react";
import { Box, Tooltip } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";

export interface FlipCardProps {
  /** Content for the front face */
  front: ReactNode;
  /** Content for the back face */
  back: ReactNode;
  /** Width of the card (default: 340) */
  width?: number;
  /** Height of the card (default: 604) */
  height?: number;
  /** Tooltip text when showing front (default: "View back") */
  frontTooltip?: string;
  /** Tooltip text when showing back (default: "View front") */
  backTooltip?: string;
  /** Whether to show the flip button (default: true) */
  showFlipButton?: boolean;
  /** Custom flip button icon */
  flipIcon?: ReactNode;
}

/**
 * A card that flips to show different content on front and back.
 * Includes an optional corner flip button indicator.
 *
 * @example
 * <FlipCard
 *   front={<RadarChart />}
 *   back={<StatsCard />}
 *   frontTooltip="View stats"
 *   backTooltip="View chart"
 * />
 */
export function FlipCard({
  front,
  back,
  width = 340,
  height = 604,
  frontTooltip = "View back",
  backTooltip = "View front",
  showFlipButton = true,
  flipIcon,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      style={{
        width,
        height,
        perspective: 1200,
        position: "relative",
      }}
    >
      {/* Card container with 3D transform */}
      <Box
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face */}
        <Box
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            opacity: isFlipped ? 0 : 1,
            transition: "opacity 0.3s ease-in-out",
            transitionDelay: isFlipped ? "0s" : "0.3s",
          }}
        >
          {front}
        </Box>
        {/* Back face */}
        <Box
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: isFlipped ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            transitionDelay: isFlipped ? "0.3s" : "0s",
          }}
        >
          {back}
        </Box>
      </Box>

      {/* Flip button (corner triangle) */}
      {showFlipButton && (
        <Tooltip content={isFlipped ? backTooltip : frontTooltip} side="top" align="end">
          <Box
            onClick={() => setIsFlipped(!isFlipped)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 48,
              height: 48,
              cursor: "pointer",
              zIndex: 10,
              overflow: "hidden",
            }}
          >
            {/* Triangle background */}
            <Box
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "0 0 48px 48px",
                borderColor: `transparent transparent ${isHovered ? "var(--gray-9)" : "var(--gray-8)"} transparent`,
                transition: "border-color 0.2s ease",
              }}
            />
            {/* Flip icon */}
            <Box
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gray-1)",
                transform: isFlipped ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            >
              {flipIcon ?? <UpdateIcon width={14} height={14} />}
            </Box>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

export default FlipCard;
