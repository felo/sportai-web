"use client";

import { Box, Flex } from "@radix-ui/themes";
import { ToggleButton } from "@/components/ui";
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
          const hasData = (ballDataMap[tab.id] || []).some(d => d.totalShots > 0);

          return (
            <ToggleButton
              key={tab.id}
              label={`${tab.label} ${tab.name}`}
              isActive={selectedBall === tab.id}
              onClick={() => onBallChange(tab.id)}
              size="1"
              inactiveOpacity={hasData ? 1 : 0.5}
              noWrap
              flexShrink={false}
            />
          );
        })}
      </Flex>
    </Box>
  );
}
