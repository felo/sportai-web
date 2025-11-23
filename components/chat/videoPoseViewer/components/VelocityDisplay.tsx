"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import type { VelocityStats } from "../types";

interface VelocityDisplayProps {
  velocityStatsLeft: VelocityStats;
  velocityStatsRight: VelocityStats;
  hasLeftElbow: boolean;
  hasRightElbow: boolean;
  isPortraitVideo: boolean;
  isMobile: boolean;
}

export function VelocityDisplay({
  velocityStatsLeft,
  velocityStatsRight,
  hasLeftElbow,
  hasRightElbow,
  isPortraitVideo,
  isMobile,
}: VelocityDisplayProps) {
  if (!hasLeftElbow && !hasRightElbow) return null;

  return (
    <Flex direction="column" gap="1" align="end">
      {/* Left Wrist Velocity */}
      {hasLeftElbow && (
        <Box style={{ 
          backgroundColor: "rgba(0, 0, 0, 0.6)", 
          backdropFilter: "blur(4px)", 
          padding: isPortraitVideo ? "6px 8px" : "8px 12px", 
          borderRadius: "var(--radius-3)" 
        }}>
          <Flex direction="column" gap="1" align="end">
            <Text size="1" weight="medium" style={{ 
              color: "white", 
              fontFamily: "var(--font-mono)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              L Wrist Velocity
            </Text>
            <Text size="1" style={{ 
              color: "rgba(255, 255, 255, 0.9)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              Current: <span style={{ color: "#00E676", fontWeight: "bold" }}>{velocityStatsLeft.current.toFixed(1)} km/h</span>
            </Text>
            <Text size="1" style={{ 
              color: "rgba(255, 255, 255, 0.9)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              Peak: <span style={{ color: "#FF9800", fontWeight: "bold" }}>{velocityStatsLeft.peak.toFixed(1)} km/h</span>
            </Text>
          </Flex>
        </Box>
      )}
      
      {/* Right Wrist Velocity */}
      {hasRightElbow && (
        <Box style={{ 
          backgroundColor: "rgba(0, 0, 0, 0.6)", 
          backdropFilter: "blur(4px)", 
          padding: isPortraitVideo ? "6px 8px" : "8px 12px", 
          borderRadius: "var(--radius-3)" 
        }}>
          <Flex direction="column" gap="1" align="end">
            <Text size="1" weight="medium" style={{ 
              color: "white", 
              fontFamily: "var(--font-mono)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              R Wrist Velocity
            </Text>
            <Text size="1" style={{ 
              color: "rgba(255, 255, 255, 0.9)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              Current: <span style={{ color: "#00E676", fontWeight: "bold" }}>{velocityStatsRight.current.toFixed(1)} km/h</span>
            </Text>
            <Text size="1" style={{ 
              color: "rgba(255, 255, 255, 0.9)", 
              textAlign: "right", 
              fontSize: isMobile ? "9px" : "10px", 
              whiteSpace: "nowrap" 
            }}>
              Peak: <span style={{ color: "#FF9800", fontWeight: "bold" }}>{velocityStatsRight.peak.toFixed(1)} km/h</span>
            </Text>
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

