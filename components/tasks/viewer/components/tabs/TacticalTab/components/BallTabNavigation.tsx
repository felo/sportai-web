"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BALL_TABS } from "../constants";
import type { PlayerShotData } from "../../../ShotHeatmap";

interface BallTabNavigationProps {
  selectedBall: number;
  onBallChange: (ball: number) => void;
  ballDataMap: Record<number, PlayerShotData[]>;
}

export function BallTabNavigation({ 
  selectedBall, 
  onBallChange, 
  ballDataMap 
}: BallTabNavigationProps) {
  const isMobile = useIsMobile();

  return (
    <Box style={{ position: "relative", marginBottom: "var(--space-4)" }}>
      {/* Fade masks on mobile */}
      {isMobile && (
        <>
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "20px",
              background: "linear-gradient(to right, var(--gray-1), transparent)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
          <Box
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "20px",
              background: "linear-gradient(to left, var(--gray-1), transparent)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        </>
      )}
      <Flex 
        gap="1" 
        style={{
          overflowX: isMobile ? "auto" : "visible",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: isMobile ? "4px" : 0,
        }}
      >
        {BALL_TABS.map((tab) => {
          const isActive = selectedBall === tab.id;
          const hasData = (ballDataMap[tab.id] || []).some(d => d.totalShots > 0);
          
          return (
            <Box
              key={tab.id}
              onClick={() => onBallChange(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-2)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? "var(--accent-9)" : "var(--gray-3)",
                border: `1px solid ${isActive ? "var(--accent-9)" : "var(--gray-6)"}`,
                opacity: hasData ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              <Text
                size="1"
                weight="medium"
                style={{ color: isActive ? "white" : "var(--gray-11)", whiteSpace: "nowrap" }}
              >
                {tab.label} {tab.name}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

