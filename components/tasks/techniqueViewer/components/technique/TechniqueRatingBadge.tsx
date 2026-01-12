"use client";

import { Box, Text, Tooltip } from "@radix-ui/themes";
import { getTechniqueRatingTier } from "./techniqueUtils";

interface TechniqueRatingBadgeProps {
  score: number;
  size?: "small" | "default" | "large";
  showLabel?: boolean;
}

// Size configurations
const SIZES = {
  small: {
    container: 40,
    inset: 2,
    labelFont: 6,
    scoreFont: 14,
    shadow: "0 2px 8px",
  },
  default: {
    container: 56,
    inset: 3,
    labelFont: 8,
    scoreFont: 20,
    shadow: "0 4px 16px",
  },
  large: {
    container: 80,
    inset: 4,
    labelFont: 10,
    scoreFont: 32,
    shadow: "0 6px 24px",
  },
};

/**
 * Hexagonal badge displaying technique score
 */
export function TechniqueRatingBadge({ 
  score, 
  size = "default",
  showLabel = false,
}: TechniqueRatingBadgeProps) {
  const tier = getTechniqueRatingTier(score);
  const s = SIZES[size];

  return (
    <Tooltip content={`${tier.label} Technique`} side="top" align="center">
      <Box
        style={{
          position: "relative",
          width: s.container,
          height: s.container,
          flexShrink: 0,
        }}
      >
        {/* Outer glow */}
        <Box
          style={{
            position: "absolute",
            inset: -4,
            background: `radial-gradient(circle, ${tier.glow} 0%, transparent 70%)`,
            opacity: 0.6,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
        
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
          {showLabel && (
            <Text
              style={{
                fontSize: s.labelFont,
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                letterSpacing: 0.5,
                lineHeight: 1,
                marginBottom: 1,
              }}
            >
              {tier.emoji}
            </Text>
          )}
          <Text
            style={{
              fontSize: s.scoreFont,
              fontWeight: 800,
              color: "white",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              lineHeight: 1,
            }}
          >
            {score}
          </Text>
        </Box>
        
        {/* Animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
        `}</style>
      </Box>
    </Tooltip>
  );
}
