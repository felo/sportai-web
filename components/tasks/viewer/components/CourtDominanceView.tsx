"use client";

import { useState, useMemo, useEffect, useId } from "react";
import { Box, Flex, Text, Card, SegmentedControl, Tooltip, Badge, Heading } from "@radix-ui/themes";
import { PersonIcon, TargetIcon } from "@radix-ui/react-icons";
import type { StatisticsResult, PlayerPosition } from "../types";

// Reuse grid dimensions from ShotHeatmap (for HALF court - one side only)
// Half court: 10m wide × 10m deep (from back wall to net)
const HALF_COURT = {
  depth: 10,        // meters from back wall to net
  width: 10,        // meters side to side
  aspectRatio: 1,   // 1:1 for half court
};

// Use 6x6 grid for half court (finer granularity for zone analysis)
const GRID_COLS = 6;  // Along width (10m side to side)
const GRID_ROWS = 6;  // Along depth (10m back to net)

// =============================================================================
// ZONE SYSTEM DEFINITIONS
// =============================================================================

type ZoneSystemId = "traffic-light" | "6-zone" | "9-zone" | "functional";

interface ZoneDefinition {
  id: string;
  name: string;
  emoji: string;
  color: string;
  // Boundaries in meters (from back wall, on half court 0-10m)
  yMin: number; // Distance from back wall (0 = back wall, 10 = net)
  yMax: number;
  xMin: number; // 0 = left side
  xMax: number; // 10 = right side
  // Grid cell boundaries (for rendering)
  colMin: number;
  colMax: number;
  rowMin: number;
  rowMax: number;
  // Tactical description
  description: string;
  tacticalAdvice: string;
  // Is this a "pressure" zone (defensive/transition)?
  isPressureZone?: boolean;
}

interface ZoneSystem {
  id: ZoneSystemId;
  name: string;
  description: string;
  zones: ZoneDefinition[];
}

// Helper to convert meter boundaries to grid cells
function metersToGrid(xMin: number, xMax: number, yMin: number, yMax: number): { colMin: number; colMax: number; rowMin: number; rowMax: number } {
  return {
    colMin: Math.floor((xMin / HALF_COURT.width) * GRID_COLS),
    colMax: Math.ceil((xMax / HALF_COURT.width) * GRID_COLS),
    // Row 0 is at net (y=10), Row 5 is at back wall (y=0)
    rowMin: GRID_ROWS - Math.ceil((yMax / HALF_COURT.depth) * GRID_ROWS),
    rowMax: GRID_ROWS - Math.floor((yMin / HALF_COURT.depth) * GRID_ROWS),
  };
}

// Traffic Light System (3 zones) - Classic coaching model for HALF COURT
const TRAFFIC_LIGHT_ZONES: ZoneDefinition[] = [
  {
    id: "green",
    name: "Net Zone",
    emoji: "🟢",
    color: "#10B981",
    yMin: 7, yMax: 10, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 7, 10),
    description: "Offensive position at the net",
    tacticalAdvice: "Finish points here with volleys and smashes",
  },
  {
    id: "orange", 
    name: "Transition Zone",
    emoji: "🟠",
    color: "#F59E0B",
    yMin: 3.5, yMax: 7, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 3.5, 7),
    description: "Mid-court transition area",
    tacticalAdvice: "Move forward when possible, don't stay here long",
    isPressureZone: true,
  },
  {
    id: "red",
    name: "Defense Zone", 
    emoji: "🔴",
    color: "#EF4444",
    yMin: 0, yMax: 3.5, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 0, 3.5),
    description: "Back court defensive position",
    tacticalAdvice: "Use lobs to reset, look for opportunities to advance",
    isPressureZone: true,
  },
];

// 6-Zone Tactical System - Split by depth AND side (HALF COURT)
const SIX_ZONE_SYSTEM: ZoneDefinition[] = [
  // Net zones (7-10m from back wall)
  {
    id: "net-deuce",
    name: "Net Deuce",
    emoji: "🎯",
    color: "#10B981",
    yMin: 7, yMax: 10, xMin: 0, xMax: 5,
    ...metersToGrid(0, 5, 7, 10),
    description: "Net position on deuce side",
    tacticalAdvice: "Control the diagonal, intercept crosses",
  },
  {
    id: "net-ad",
    name: "Net Ad",
    emoji: "🎯",
    color: "#059669",
    yMin: 7, yMax: 10, xMin: 5, xMax: 10,
    ...metersToGrid(5, 10, 7, 10),
    description: "Net position on advantage side",
    tacticalAdvice: "Protect the line, attack the middle",
  },
  // Transition zones (3.5-7m from back wall)
  {
    id: "trans-deuce",
    name: "Transition Deuce",
    emoji: "⚡",
    color: "#F59E0B",
    yMin: 3.5, yMax: 7, xMin: 0, xMax: 5,
    ...metersToGrid(0, 5, 3.5, 7),
    description: "Mid-court deuce side",
    tacticalAdvice: "Move up or back quickly",
    isPressureZone: true,
  },
  {
    id: "trans-ad",
    name: "Transition Ad",
    emoji: "⚡",
    color: "#D97706",
    yMin: 3.5, yMax: 7, xMin: 5, xMax: 10,
    ...metersToGrid(5, 10, 3.5, 7),
    description: "Mid-court advantage side",
    tacticalAdvice: "Avoid lingering in no-man's land",
    isPressureZone: true,
  },
  // Defense zones (0-3.5m from back wall)
  {
    id: "defense-deuce",
    name: "Defense Deuce",
    emoji: "🛡️",
    color: "#EF4444",
    yMin: 0, yMax: 3.5, xMin: 0, xMax: 5,
    ...metersToGrid(0, 5, 0, 3.5),
    description: "Back court deuce corner",
    tacticalAdvice: "Use glass walls, lob to reset",
    isPressureZone: true,
  },
  {
    id: "defense-ad",
    name: "Defense Ad",
    emoji: "🛡️",
    color: "#DC2626",
    yMin: 0, yMax: 3.5, xMin: 5, xMax: 10,
    ...metersToGrid(5, 10, 0, 3.5),
    description: "Back court advantage corner",
    tacticalAdvice: "Recover position, look for counter",
    isPressureZone: true,
  },
];

// 9-Zone Grid System - Detailed 3×3 analysis (HALF COURT)
const NINE_ZONE_SYSTEM: ZoneDefinition[] = [
  // Row 1: Net (6.67-10m from back wall)
  { 
    id: "net-left", 
    name: "Net Left", 
    emoji: "1️⃣", 
    color: "#10B981",
    yMin: 6.67, yMax: 10, xMin: 0, xMax: 3.33,
    ...metersToGrid(0, 3.33, 6.67, 10),
    description: "Net left corner", 
    tacticalAdvice: "Strong position for right-handed players" 
  },
  { 
    id: "net-center", 
    name: "Net Center", 
    emoji: "2️⃣", 
    color: "#059669",
    yMin: 6.67, yMax: 10, xMin: 3.33, xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 6.67, 10),
    description: "Net center - the T", 
    tacticalAdvice: "Control the T, dominate the net" 
  },
  { 
    id: "net-right", 
    name: "Net Right", 
    emoji: "3️⃣", 
    color: "#047857",
    yMin: 6.67, yMax: 10, xMin: 6.67, xMax: 10,
    ...metersToGrid(6.67, 10, 6.67, 10),
    description: "Net right corner", 
    tacticalAdvice: "Strong position for left-handed players" 
  },
  // Row 2: Mid (3.33-6.67m from back wall)
  { 
    id: "mid-left", 
    name: "Mid Left", 
    emoji: "4️⃣", 
    color: "#F59E0B",
    yMin: 3.33, yMax: 6.67, xMin: 0, xMax: 3.33,
    ...metersToGrid(0, 3.33, 3.33, 6.67),
    description: "Mid left", 
    tacticalAdvice: "Transition point - move forward or back",
    isPressureZone: true,
  },
  { 
    id: "mid-center", 
    name: "Mid Center", 
    emoji: "5️⃣", 
    color: "#D97706",
    yMin: 3.33, yMax: 6.67, xMin: 3.33, xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 3.33, 6.67),
    description: "Mid center - no-man's land", 
    tacticalAdvice: "Danger zone! Avoid staying here",
    isPressureZone: true,
  },
  { 
    id: "mid-right", 
    name: "Mid Right", 
    emoji: "6️⃣", 
    color: "#B45309",
    yMin: 3.33, yMax: 6.67, xMin: 6.67, xMax: 10,
    ...metersToGrid(6.67, 10, 3.33, 6.67),
    description: "Mid right", 
    tacticalAdvice: "Transition point - move forward or back",
    isPressureZone: true,
  },
  // Row 3: Back (0-3.33m from back wall)
  { 
    id: "back-left", 
    name: "Back Left", 
    emoji: "7️⃣", 
    color: "#EF4444",
    yMin: 0, yMax: 3.33, xMin: 0, xMax: 3.33,
    ...metersToGrid(0, 3.33, 0, 3.33),
    description: "Back left corner", 
    tacticalAdvice: "Use corner glass walls creatively",
    isPressureZone: true,
  },
  { 
    id: "back-center", 
    name: "Back Center", 
    emoji: "8️⃣", 
    color: "#DC2626",
    yMin: 0, yMax: 3.33, xMin: 3.33, xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 0, 3.33),
    description: "Back center", 
    tacticalAdvice: "Standard defensive position",
    isPressureZone: true,
  },
  { 
    id: "back-right", 
    name: "Back Right", 
    emoji: "9️⃣", 
    color: "#B91C1C",
    yMin: 0, yMax: 3.33, xMin: 6.67, xMax: 10,
    ...metersToGrid(6.67, 10, 0, 3.33),
    description: "Back right corner", 
    tacticalAdvice: "Use corner glass walls creatively",
    isPressureZone: true,
  },
];

// Functional Zone System (Advanced) - Based on shot types (HALF COURT)
const FUNCTIONAL_ZONES: ZoneDefinition[] = [
  {
    id: "volley",
    name: "Volley Zone",
    emoji: "🎯",
    color: "#10B981",
    yMin: 8.5, yMax: 10, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 8.5, 10),
    description: "Prime finishing area",
    tacticalAdvice: "Take the ball early, put away with power",
  },
  {
    id: "bandeja",
    name: "Bandeja Zone", 
    emoji: "🏸",
    color: "#3B82F6",
    yMin: 6, yMax: 8.5, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 6, 8.5),
    description: "Bandeja and vibora territory",
    tacticalAdvice: "Control shots, push opponents back",
  },
  {
    id: "no-mans-land",
    name: "No-Man's Land",
    emoji: "⚠️",
    color: "#F59E0B",
    yMin: 4, yMax: 6, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 4, 6),
    description: "Danger zone - transition only",
    tacticalAdvice: "Never stay here! Move forward or back",
    isPressureZone: true,
  },
  {
    id: "service-box",
    name: "Service Box",
    emoji: "📦",
    color: "#8B5CF6",
    yMin: 2, yMax: 4, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 2, 4),
    description: "Rally building area",
    tacticalAdvice: "Work the point, look for net approach",
    isPressureZone: true,
  },
  {
    id: "glass-wall",
    name: "Glass Wall Zone",
    emoji: "🧱",
    color: "#EF4444",
    yMin: 0, yMax: 2, xMin: 0, xMax: 10,
    ...metersToGrid(0, 10, 0, 2),
    description: "Defensive survival area",
    tacticalAdvice: "Use walls creatively, lob to reset",
    isPressureZone: true,
  },
];

// All zone systems
const ZONE_SYSTEMS: ZoneSystem[] = [
  {
    id: "traffic-light",
    name: "Traffic Light",
    description: "Simple 3-zone system (Green/Orange/Red)",
    zones: TRAFFIC_LIGHT_ZONES,
  },
  {
    id: "6-zone",
    name: "6-Zone Tactical",
    description: "Split by depth and court side",
    zones: SIX_ZONE_SYSTEM,
  },
  {
    id: "9-zone",
    name: "9-Zone Grid",
    description: "Detailed 3×3 grid analysis",
    zones: NINE_ZONE_SYSTEM,
  },
  {
    id: "functional",
    name: "Functional",
    description: "Based on shot types and tactics",
    zones: FUNCTIONAL_ZONES,
  },
];

// =============================================================================
// DATA PROCESSING
// =============================================================================

interface ZoneStat {
  zoneId: string;
  zoneName: string;
  timeSpent: number; // seconds
  percentage: number; // % of total time
  entryCount: number; // how many times entered
}

interface PlayerDominance {
  playerId: number;
  playerName: string;
  totalTime: number;
  zones: ZoneStat[];
  dominantZone: string; // zone where they spent most time
  dominantZonePercentage: number;
  pressureZoneTime: number; // time spent in "bad" zones
  pressurePercentage: number;
}

function calculateZoneDominance(
  playerPositions: PlayerPosition[],
  zones: ZoneDefinition[],
  rallies: [number, number][]
): ZoneStat[] {
  // Only count time during rallies (active play)
  const rallyPositions = playerPositions.filter(pos => 
    rallies.some(([start, end]) => pos.timestamp >= start && pos.timestamp <= end)
  );
  
  if (rallyPositions.length === 0) return zones.map(z => ({
    zoneId: z.id,
    zoneName: z.name,
    timeSpent: 0,
    percentage: 0,
    entryCount: 0,
  }));
  
  const zoneTimes: Record<string, { time: number; entries: number }> = {};
  zones.forEach(z => zoneTimes[z.id] = { time: 0, entries: 0 });
  
  let totalTime = 0;
  let lastTimestamp = rallyPositions[0]?.timestamp || 0;
  let lastZone: string | null = null;
  
  // Sort positions by timestamp
  const sortedPositions = [...rallyPositions].sort((a, b) => a.timestamp - b.timestamp);
  
  sortedPositions.forEach(pos => {
    // Use court_X and court_Y (actual court coordinates in meters)
    // court_X: 0-10m (width), court_Y: 0-20m (length, but half court is 0-10m)
    // Skip if court coordinates not available
    if (pos.court_X === undefined || pos.court_Y === undefined) return;
    
    // For half court analysis, we use positions on one side (0-10m depth)
    // court_Y 0-10 = near side, 10-20 = far side
    const courtX = pos.court_X;
    const courtY = pos.court_Y <= 10 ? pos.court_Y : pos.court_Y - 10; // Map to 0-10 range
    
    // Find which zone this position is in
    const zone = zones.find(z => 
      courtX >= z.xMin && courtX <= z.xMax &&
      courtY >= z.yMin && courtY <= z.yMax
    );
    
    if (zone) {
      const dt = pos.timestamp - lastTimestamp;
      // Only count if delta is reasonable (not a gap between rallies)
      if (dt > 0 && dt < 2) {
        zoneTimes[zone.id].time += dt;
        totalTime += dt;
      }
      
      // Track zone entries (when player moves to a new zone)
      if (lastZone !== zone.id) {
        zoneTimes[zone.id].entries++;
        lastZone = zone.id;
      }
    }
    
    lastTimestamp = pos.timestamp;
  });
  
  return zones.map(z => ({
    zoneId: z.id,
    zoneName: z.name,
    timeSpent: zoneTimes[z.id].time,
    percentage: totalTime > 0 ? (zoneTimes[z.id].time / totalTime) * 100 : 0,
    entryCount: zoneTimes[z.id].entries,
  }));
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface CourtDominanceViewProps {
  result: StatisticsResult | null;
  playerDisplayNames?: Record<number, string>;
  portraits?: Record<number, string>;
}

export function CourtDominanceView({
  result,
  playerDisplayNames = {},
  portraits = {},
}: CourtDominanceViewProps) {
  const [selectedSystem, setSelectedSystem] = useState<ZoneSystemId>("traffic-light");
  const [selectedPlayer, setSelectedPlayer] = useState<number | "all">("all");
  const [isVisible, setIsVisible] = useState(false);
  
  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  const currentSystem = ZONE_SYSTEMS.find(s => s.id === selectedSystem) || ZONE_SYSTEMS[0];
  
  // Get valid players (with enough swings)
  const validPlayers = useMemo(() => {
    const players = result?.players || [];
    return players.filter(p => p.swing_count >= 10);
  }, [result]);
  
  // Calculate dominance for each player
  const playerDominance = useMemo((): PlayerDominance[] => {
    if (!result?.player_positions) return [];
    
    const rallies = result.rallies || [];
    
    return validPlayers.map((player, idx) => {
      const positions = result.player_positions?.[String(player.player_id)] || [];
      const zones = calculateZoneDominance(positions, currentSystem.zones, rallies);
      
      const totalTime = zones.reduce((sum, z) => sum + z.timeSpent, 0);
      const dominantZoneStat = zones.reduce((max, z) => z.timeSpent > max.timeSpent ? z : max, zones[0]);
      
      // Calculate "pressure" time (time in defensive/transition zones)
      const pressureZoneIds = currentSystem.zones
        .filter(z => z.isPressureZone)
        .map(z => z.id);
      const pressureTime = zones
        .filter(z => pressureZoneIds.includes(z.zoneId))
        .reduce((sum, z) => sum + z.timeSpent, 0);
      
      return {
        playerId: player.player_id,
        playerName: playerDisplayNames[player.player_id] || `Player ${idx + 1}`,
        totalTime,
        zones,
        dominantZone: dominantZoneStat?.zoneName || "Unknown",
        dominantZonePercentage: dominantZoneStat?.percentage || 0,
        pressureZoneTime: pressureTime,
        pressurePercentage: totalTime > 0 ? (pressureTime / totalTime) * 100 : 0,
      };
    });
  }, [result, currentSystem, playerDisplayNames, validPlayers]);
  
  // Aggregate all players for "All" view
  const aggregatedZones = useMemo((): ZoneStat[] => {
    if (selectedPlayer === "all") {
      const combined: Record<string, ZoneStat> = {};
      currentSystem.zones.forEach(z => {
        combined[z.id] = { zoneId: z.id, zoneName: z.name, timeSpent: 0, percentage: 0, entryCount: 0 };
      });
      
      playerDominance.forEach(pd => {
        pd.zones.forEach(z => {
          combined[z.zoneId].timeSpent += z.timeSpent;
          combined[z.zoneId].entryCount += z.entryCount;
        });
      });
      
      const total = Object.values(combined).reduce((sum, z) => sum + z.timeSpent, 0);
      Object.values(combined).forEach(z => {
        z.percentage = total > 0 ? (z.timeSpent / total) * 100 : 0;
      });
      
      return Object.values(combined);
    }
    
    return playerDominance.find(p => p.playerId === selectedPlayer)?.zones || [];
  }, [selectedPlayer, playerDominance, currentSystem]);
  
  // No data state
  if (!result?.player_positions || Object.keys(result.player_positions).length === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex align="center" justify="center" direction="column" gap="3" p="6">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "var(--gray-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TargetIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
          </Box>
          <Heading size="4" weight="medium" style={{ color: "var(--gray-11)" }}>
            No Position Data Available
          </Heading>
          <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
            Player position tracking data is needed for court dominance analysis. 
            This data is collected during video processing.
          </Text>
        </Flex>
      </Card>
    );
  }
  
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex direction="column" gap="4">
        {/* Controls */}
        <Card 
          style={{ 
            border: "1px solid var(--gray-5)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.3s ease-out",
          }}
        >
          <Flex direction="column" gap="3" p="4">
            <Flex justify="between" align="start" wrap="wrap" gap="4">
              {/* Zone System Selector */}
              <Flex direction="column" gap="2">
                <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Zone System
                </Text>
                <SegmentedControl.Root 
                  value={selectedSystem} 
                  onValueChange={(v) => setSelectedSystem(v as ZoneSystemId)}
                  size="2"
                >
                  {ZONE_SYSTEMS.map(sys => (
                    <SegmentedControl.Item key={sys.id} value={sys.id}>
                      {sys.name}
                    </SegmentedControl.Item>
                  ))}
                </SegmentedControl.Root>
                <Text size="1" color="gray">{currentSystem.description}</Text>
              </Flex>
              
              {/* Player Selector */}
              {playerDominance.length > 0 && (
                <Flex direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Player Filter
                  </Text>
                  <SegmentedControl.Root 
                    value={String(selectedPlayer)} 
                    onValueChange={(v) => setSelectedPlayer(v === "all" ? "all" : Number(v))}
                    size="2"
                  >
                    <SegmentedControl.Item value="all">All Players</SegmentedControl.Item>
                    {playerDominance.map(p => (
                      <SegmentedControl.Item key={p.playerId} value={String(p.playerId)}>
                        {p.playerName}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl.Root>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Card>
        
        {/* Main Content: Court + Stats */}
        <Flex gap="4" wrap="wrap">
          {/* Court Visualization - uses same grid style as ShotHeatmap */}
          <Card 
            style={{ 
              border: "1px solid var(--gray-5)", 
              flex: "1 1 340px",
              minWidth: 300,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease-out",
              transitionDelay: "0.1s",
            }}
          >
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Court Position Heatmap</Heading>
              <Text size="2" color="gray">Half court view (your side)</Text>
              
              <CourtZoneGrid
                zones={currentSystem.zones}
                zoneStats={aggregatedZones}
                isVisible={isVisible}
              />
            </Flex>
          </Card>
          
          {/* Zone Stats */}
          <Card 
            style={{ 
              border: "1px solid var(--gray-5)", 
              flex: "1 1 280px",
              minWidth: 260,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease-out",
              transitionDelay: "0.15s",
            }}
          >
            <Flex direction="column" gap="4" p="4">
              <Heading size="3" weight="bold">Zone Breakdown</Heading>
              
              {aggregatedZones.map((zoneStat, idx) => {
                const zoneDef = currentSystem.zones.find(z => z.id === zoneStat.zoneId);
                if (!zoneDef) return null;
                
                return (
                  <Tooltip key={zoneStat.zoneId} content={zoneDef.tacticalAdvice}>
                    <Flex 
                      direction="column" 
                      gap="2"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(10px)",
                        transition: "all 0.3s ease-out",
                        transitionDelay: `${0.2 + idx * 0.05}s`,
                        cursor: "help",
                      }}
                    >
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2">
                          <Text style={{ fontSize: 16 }}>{zoneDef.emoji}</Text>
                          <Text size="2" weight="medium">{zoneStat.zoneName}</Text>
                          {zoneDef.isPressureZone && (
                            <Badge size="1" color="orange" variant="soft">Pressure</Badge>
                          )}
                        </Flex>
                        <Text size="3" weight="bold" style={{ color: zoneDef.color, fontVariantNumeric: "tabular-nums" }}>
                          {zoneStat.percentage.toFixed(1)}%
                        </Text>
                      </Flex>
                      
                      {/* Progress bar */}
                      <Box style={{ height: 8, borderRadius: 4, backgroundColor: "var(--gray-4)", overflow: "hidden" }}>
                        <Box
                          style={{
                            width: isVisible ? `${zoneStat.percentage}%` : "0%",
                            height: "100%",
                            backgroundColor: zoneDef.color,
                            borderRadius: 4,
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            transitionDelay: `${0.3 + idx * 0.05}s`,
                          }}
                        />
                      </Box>
                      
                      <Flex justify="between">
                        <Text size="1" color="gray" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {zoneStat.timeSpent.toFixed(1)}s total
                        </Text>
                        <Text size="1" color="gray" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {zoneStat.entryCount} entries
                        </Text>
                      </Flex>
                    </Flex>
                  </Tooltip>
                );
              })}
            </Flex>
          </Card>
        </Flex>
        
        {/* Player Cards (when showing all) */}
        {selectedPlayer === "all" && playerDominance.length > 1 && (
          <Flex gap="4" wrap="wrap">
            {playerDominance.map((player, idx) => (
              <PlayerDominanceCard
                key={player.playerId}
                player={player}
                portrait={portraits[player.playerId]}
                zones={currentSystem.zones}
                delay={0.25 + idx * 0.1}
                isVisible={isVisible}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

// Court grid visualization - matches ShotHeatmap style
function CourtZoneGrid({
  zones,
  zoneStats,
  isVisible,
}: {
  zones: ZoneDefinition[];
  zoneStats: ZoneStat[];
  isVisible: boolean;
}) {
  const uniqueId = useId();
  
  // Create a grid of cells with zone assignments
  const cellZones = useMemo(() => {
    const grid: (ZoneDefinition | null)[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        // Find which zone this cell belongs to
        const zone = zones.find(z => 
          col >= z.colMin && col < z.colMax &&
          row >= z.rowMin && row < z.rowMax
        );
        grid[row][col] = zone || null;
      }
    }
    return grid;
  }, [zones]);
  
  return (
    <Box
      style={{
        position: "relative",
        background: "var(--gray-3)",
        borderRadius: "var(--radius-3)",
        padding: "8px",
        border: "1px solid var(--gray-6)",
      }}
    >
      <Box
        style={{
          position: "relative",
          aspectRatio: "1 / 1", // Square for half court (10m × 10m)
        }}
      >
        {/* Grid cells */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: "2px",
          }}
        >
          {cellZones.flatMap((row, rowIdx) =>
            row.map((zone, colIdx) => {
              const stat = zone ? zoneStats.find(s => s.zoneId === zone.id) : null;
              const intensity = stat ? Math.max(0.2, Math.min(0.7, stat.percentage / 40)) : 0.1;
              const cellDelay = (colIdx + rowIdx) * 40;
              
              return (
                <Box
                  key={`${rowIdx}-${colIdx}`}
                  style={{
                    backgroundColor: zone ? zone.color : "var(--gray-4)",
                    opacity: isVisible ? intensity : 0,
                    borderRadius: "2px",
                    transition: `opacity 0.5s ease-out ${cellDelay}ms`,
                  }}
                />
              );
            })
          )}
        </Box>
        
        {/* Zone labels overlay */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {zones.map((zone, idx) => {
            const stat = zoneStats.find(s => s.zoneId === zone.id);
            const percentage = stat?.percentage || 0;
            
            // Calculate center position for this zone
            const left = ((zone.colMin + zone.colMax) / 2 / GRID_COLS) * 100;
            const top = ((zone.rowMin + zone.rowMax) / 2 / GRID_ROWS) * 100;
            
            return (
              <Flex
                key={zone.id}
                direction="column"
                align="center"
                gap="0"
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.4s ease-out ${0.3 + idx * 0.05}s`,
                }}
              >
                <Text style={{ fontSize: 20 }}>{zone.emoji}</Text>
                <Text 
                  size="2" 
                  weight="bold" 
                  style={{ 
                    color: "white", 
                    textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {percentage.toFixed(0)}%
                </Text>
              </Flex>
            );
          })}
        </Box>
        
        {/* Net indicator (at top) */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "var(--gray-12)",
            borderRadius: "2px 2px 0 0",
          }}
        />
        <Text
          size="1"
          weight="medium"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "var(--gray-11)",
            fontSize: 9,
          }}
        >
          NET ↑
        </Text>
        
        {/* Back wall indicator (at bottom) */}
        <Text
          size="1"
          weight="medium"
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            color: "var(--gray-9)",
            fontSize: 9,
          }}
        >
          BACK WALL
        </Text>
      </Box>
    </Box>
  );
}

// Individual player card
function PlayerDominanceCard({
  player,
  portrait,
  zones,
  delay,
  isVisible,
}: {
  player: PlayerDominance;
  portrait?: string;
  zones: ZoneDefinition[];
  delay: number;
  isVisible: boolean;
}) {
  const dominantZoneDef = zones.find(z => z.name === player.dominantZone);
  
  return (
    <Card 
      style={{ 
        border: "1px solid var(--gray-5)", 
        flex: "1 1 240px",
        minWidth: 220,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(15px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transitionDelay: `${delay}s`,
      }}
    >
      <Flex direction="column" gap="3" p="4">
        {/* Player header */}
        <Flex align="center" gap="3">
          <Box
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${dominantZoneDef?.color || "var(--accent-9)"}`,
              backgroundColor: portrait ? "transparent" : (dominantZoneDef?.color || "var(--accent-9)"),
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${dominantZoneDef?.color || "var(--accent-9)"}40`,
            }}
          >
            {portrait ? (
              <img 
                src={portrait} 
                alt={player.playerName} 
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} 
              />
            ) : (
              <PersonIcon width={24} height={24} style={{ color: "white" }} />
            )}
          </Box>
          <Flex direction="column" gap="0">
            <Text size="3" weight="bold">{player.playerName}</Text>
            <Flex align="center" gap="1">
              <Text style={{ fontSize: 12 }}>{dominantZoneDef?.emoji || "📍"}</Text>
              <Text size="2" color="gray">{player.dominantZone}</Text>
            </Flex>
          </Flex>
        </Flex>
        
        {/* Stats */}
        <Flex gap="2" wrap="wrap">
          <Tooltip content="Total tracked time during rallies">
            <Badge color="gray" variant="soft" size="2" style={{ cursor: "help" }}>
              ⏱️ {player.totalTime.toFixed(0)}s tracked
            </Badge>
          </Tooltip>
          <Tooltip content="Time spent in defensive or transition zones">
            <Badge 
              color={player.pressurePercentage > 60 ? "red" : player.pressurePercentage > 40 ? "orange" : "mint"} 
              variant="soft" 
              size="2"
              style={{ cursor: "help" }}
            >
              {player.pressurePercentage > 50 ? "⚠️" : "✓"} {player.pressurePercentage.toFixed(0)}% pressure
            </Badge>
          </Tooltip>
        </Flex>
        
        {/* Top 3 zones mini-chart */}
        <Flex direction="column" gap="1">
          {player.zones
            .slice()
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3)
            .map(zoneStat => {
              const zoneDef = zones.find(z => z.id === zoneStat.zoneId);
              if (!zoneDef) return null;
              
              return (
                <Flex key={zoneStat.zoneId} align="center" gap="2">
                  <Text style={{ fontSize: 12, width: 20, textAlign: "center" }}>{zoneDef.emoji}</Text>
                  <Box style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "var(--gray-4)", overflow: "hidden" }}>
                    <Box
                      style={{
                        width: `${zoneStat.percentage}%`,
                        height: "100%",
                        backgroundColor: zoneDef.color,
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                  <Text size="1" color="gray" style={{ width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {zoneStat.percentage.toFixed(0)}%
                  </Text>
                </Flex>
              );
            })}
        </Flex>
      </Flex>
    </Card>
  );
}
