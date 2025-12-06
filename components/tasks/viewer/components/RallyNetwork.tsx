"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { ResponsiveNetwork } from "@nivo/network";
import { logger } from "@/lib/logger";
import { StatisticsResult } from "../types";
import { formatSwingType } from "../utils";
import { SWING_TYPE_COLORS, PLAYER_CONFIG, CHART_THEME } from "../constants";

interface RallyNetworkProps {
  result: StatisticsResult;
  playerDisplayNames?: Record<number, string>;
}

interface NetworkNode {
  id: string;
  height: number;
  size: number;
  color: string;
  data: {
    label: string;
    type: "player" | "shot";
    count?: number;
    playerId?: number;
  };
}

interface NetworkLink {
  source: string;
  target: string;
  distance: number;
  strength: number;
  color: string;
  count: number;
}

/**
 * RallyNetwork - Visualizes player-to-shot-type relationships
 * 
 * Nodes:
 * - Large colored nodes = Players
 * - Smaller nodes = Shot types (forehand, backhand, serve, etc.)
 * 
 * Links:
 * - Connect players to their most used shot types
 * - Thicker/closer links = more frequently used
 */
export function RallyNetwork({ result, playerDisplayNames = {} }: RallyNetworkProps) {

  const { nodes, links, insights } = useMemo(() => {
    const players = result.players || [];
    const filteredPlayers = players.filter(p => p.swing_count >= 10);
    
    if (filteredPlayers.length === 0) {
      return { nodes: [], links: [], insights: [] };
    }

    // Build player color map for links
    const playerColorMap: Record<number, string> = {};
    filteredPlayers.forEach((p, idx) => {
      playerColorMap[p.player_id] = PLAYER_CONFIG.colors[idx % PLAYER_CONFIG.colors.length].primary;
    });

    // Collect all swings with player info
    const allSwings = filteredPlayers.flatMap(p => 
      p.swings?.map(s => ({ ...s, player_id: p.player_id })) || []
    );

    // Build player nodes
    const playerNodes: NetworkNode[] = filteredPlayers.map((p, idx) => {
      const displayIndex = idx + 1;
      
      return {
        id: `player-${p.player_id}`,
        height: 2,
        size: 32 + Math.sqrt(p.swing_count) * 1.5,
        color: playerColorMap[p.player_id],
        data: {
          label: playerDisplayNames[p.player_id] || `Player ${displayIndex}`,
          type: "player" as const,
          count: p.swing_count,
          playerId: p.player_id,
        },
      };
    });

    // Aggregate shot types from actual swings (not distribution)
    const globalShotCounts: Record<string, number> = {};
    const playerShotCounts: Record<number, Record<string, number>> = {};
    
    filteredPlayers.forEach(p => {
      playerShotCounts[p.player_id] = {};
    });

    allSwings.forEach(s => {
      const type = s.swing_type?.toLowerCase() || "unknown";
      globalShotCounts[type] = (globalShotCounts[type] || 0) + 1;
      
      if (playerShotCounts[s.player_id]) {
        playerShotCounts[s.player_id][type] = (playerShotCounts[s.player_id][type] || 0) + 1;
      }
    });

    // Build shot type nodes (only those with enough occurrences)
    const validShotTypes = Object.entries(globalShotCounts)
      .filter(([, count]) => count >= 3);
    
    const shotNodes: NetworkNode[] = validShotTypes.map(([type, count]) => ({
      id: `shot-${type}`,
      height: 1,
      size: 18 + Math.sqrt(count) * 1.2,
      color: SWING_TYPE_COLORS[type] || "#6B7280",
      data: {
        label: formatSwingType(type),
        type: "shot" as const,
        count,
      },
    }));

    // Build links: player → shot type usage
    const links: NetworkLink[] = [];
    const validShotTypeIds = new Set(validShotTypes.map(([type]) => `shot-${type}`));

    filteredPlayers.forEach(p => {
      const shotCounts = playerShotCounts[p.player_id] || {};
      const maxCount = Math.max(...Object.values(shotCounts), 1);
      const playerColor = playerColorMap[p.player_id];
      
      Object.entries(shotCounts).forEach(([type, count]) => {
        const targetId = `shot-${type}`;
        
        // Only create link if shot node exists
        if (count >= 2 && validShotTypeIds.has(targetId)) {
          const normalizedStrength = count / maxCount;
          
          links.push({
            source: `player-${p.player_id}`,
            target: targetId,
            distance: 100 - normalizedStrength * 30, // 70-100 range (closer)
            strength: normalizedStrength,
            color: playerColor,
            count,
          });
        }
      });
    });

    // Debug: log what we're creating
    logger.debug("[RallyNetwork] Data:", {
      players: filteredPlayers.length,
      shotTypes: shotNodes.length,
      links: links.length,
      linkDetails: links.slice(0, 5),
    });

    // Generate insights
    const insights: string[] = [];
    
    // Find dominant shot type
    const topShot = Object.entries(globalShotCounts)
      .sort(([, a], [, b]) => b - a)[0];
    if (topShot) {
      const percentage = Math.round((topShot[1] / allSwings.length) * 100);
      insights.push(`${formatSwingType(topShot[0])} is the most used shot (${percentage}%)`);
    }

    // Find player with most diverse shot selection
    const mostDiversePlayer = filteredPlayers.reduce<{ id: number; count: number } | null>((best, p) => {
      const shotTypes = Object.keys(playerShotCounts[p.player_id] || {}).length;
      if (!best || shotTypes > best.count) {
        return { id: p.player_id, count: shotTypes };
      }
      return best;
    }, null);
    if (mostDiversePlayer && mostDiversePlayer.count > 2) {
      const name = playerDisplayNames[mostDiversePlayer.id] || `Player`;
      insights.push(`${name} uses ${mostDiversePlayer.count} different shot types`);
    }

    return {
      nodes: [...playerNodes, ...shotNodes],
      links,
      insights,
    };
  }, [result, playerDisplayNames]);

  if (nodes.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="2"
        style={{ height: 300, color: "var(--gray-9)" }}
      >
        <Text size="2">Not enough data to show rally patterns</Text>
        <Text size="1" color="gray">Need at least one player with 10+ swings</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {/* Network Graph */}
      <Box
        style={{
          height: 380,
          background: "linear-gradient(135deg, var(--gray-2) 0%, var(--gray-1) 100%)",
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ResponsiveNetwork
          data={{ nodes, links }}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          linkDistance={(link) => link.distance}
          centeringStrength={0.8}
          repulsivity={6}
          distanceMin={1}
          distanceMax={300}
          iterations={60}
          nodeSize={(node) => node.size}
          activeNodeSize={(node) => node.size * 1.3}
          inactiveNodeSize={(node) => node.size * 0.7}
          nodeColor={(node) => node.color}
          nodeBorderWidth={2}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
          linkThickness={(link) => 2 + ((link as unknown as NetworkLink).strength || 0.5) * 4}
          linkBlendMode="normal"
          linkColor={(link) => (link as unknown as NetworkLink).color || "#666666"}
          motionConfig="gentle"
          isInteractive={true}
          nodeTooltip={({ node }) => {
            const nodeData = (node as unknown as NetworkNode).data;
            return (
              <Box
                style={{
                  background: "#1a1a1a",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: `2px solid ${node.color}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  minWidth: 140,
                }}
              >
                <Flex align="center" gap="2" mb="2">
                  <Box
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: nodeData.type === "player" ? "50%" : 4,
                      backgroundColor: node.color,
                      boxShadow: `0 0 8px ${node.color}`,
                    }}
                  />
                  <Text size="3" weight="bold" style={{ color: "#fff" }}>
                    {nodeData.label}
                  </Text>
                </Flex>
                <Text size="2" style={{ color: "#aaa" }}>
                  {nodeData.type === "player" ? "🎾 Total swings: " : "📊 Used: "}
                  <Text weight="bold" style={{ color: node.color }}>
                    {nodeData.count}
                  </Text>
                  {nodeData.type === "shot" && " times"}
                </Text>
              </Box>
            );
          }}
        />

        {/* Legend */}
        <Box
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            display: "flex",
            gap: 16,
            padding: "8px 12px",
            background: "var(--gray-a3)",
            borderRadius: "var(--radius-2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3B82F6, #EF4444)",
                border: "2px solid var(--gray-1)",
              }}
            />
            <Text size="1" color="gray">Players</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: "var(--radius-1)",
                background: "linear-gradient(135deg, #10B981, #8B5CF6)",
              }}
            />
            <Text size="1" color="gray">Shot Types</Text>
          </Flex>
        </Box>
      </Box>

      {/* Insights */}
      {insights.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {insights.map((insight, i) => (
            <Box
              key={i}
              style={{
                padding: "6px 12px",
                background: "var(--blue-a3)",
                borderRadius: "var(--radius-2)",
                border: "1px solid var(--blue-a5)",
              }}
            >
              <Text size="1" style={{ color: "var(--blue-11)" }}>
                💡 {insight}
              </Text>
            </Box>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

