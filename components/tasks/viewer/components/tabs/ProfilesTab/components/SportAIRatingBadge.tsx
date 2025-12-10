"use client";

import { Box, Text, Tooltip } from "@radix-ui/themes";
import { getRatingTier } from "../utils/calculateRating";

interface SportAIRatingBadgeProps {
  rating: number;
  size?: "default" | "large";
}

// Size configurations
const SIZES = {
  default: {
    container: 52,
    inset: 3,
    saiFont: 8,
    ratingFont: 18,
    shadow: "0 4px 16px",
  },
  large: {
    container: 80,
    inset: 4,
    saiFont: 11,
    ratingFont: 32,
    shadow: "0 6px 24px",
  },
};

/**
 * Hexagonal badge displaying the SportAI Rating
 */
export function SportAIRatingBadge({ rating, size = "default" }: SportAIRatingBadgeProps) {
  const tier = getRatingTier(rating);
  const s = SIZES[size];

  return (
    <Tooltip content={`SportAI Rating: ${tier.label}`} side="top" align="start">
      <Box
        style={{
          position: "relative",
          width: s.container,
          height: s.container,
          flexShrink: 0,
        }}
      >
        {/* Hexagon shape */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            boxShadow: `${s.shadow} ${tier.glow}`,
          }}
        />
        {/* Inner content */}
        <Box
          style={{
            position: "absolute",
            inset: s.inset,
            background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: s.saiFont,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: size === "large" ? 1 : 0.5,
              lineHeight: 1,
              marginBottom: size === "large" ? 2 : 1,
            }}
          >
            SAI
          </Text>
          <Text
            style={{
              fontSize: s.ratingFont,
              fontWeight: 800,
              color: "white",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              lineHeight: 1,
            }}
          >
            {rating}
          </Text>
        </Box>
      </Box>
    </Tooltip>
  );
}

