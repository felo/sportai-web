"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
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
  return (
    <Flex gap="1" mb="4">
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
  );
}

