"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Box, Flex, Text, Heading, Card, DropdownMenu, IconButton, Badge } from "@radix-ui/themes";
import { TargetIcon, StackIcon, LayersIcon, MixerHorizontalIcon, Cross2Icon, CheckIcon, GridIcon } from "@radix-ui/react-icons";
import { StatisticsResult, BallBounce } from "../../types";
import { ShotHeatmap, PlayerShotData } from "../ShotHeatmap";
import { CourtDominanceView } from "../CourtDominanceView";
import type { BallSequenceType, PlayerTacticalData } from "@/types/tactical-analysis";
import { convertToTacticalData } from "@/types/tactical-analysis";
import { useTacticalAnalysis } from "@/hooks/useTacticalAnalysis";
import { usePlayerNicknames } from "@/hooks/usePlayerNicknames";
import { MarkdownWithSwings } from "@/components/markdown";
import { CollapsibleSection } from "@/components/ui";
import { StreamingIndicator } from "@/components/chat";
import { formatSwingType } from "../../utils";
import { 
  useServeData, 
  useReturnData, 
  useThirdBallData, 
  useFourthBallData, 
  useFifthBallData,
  useAllShotsData,
} from "../../hooks/useShotAnalysis";

interface TacticalTabProps {
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
  playerDisplayNames?: Record<number, string>;
  portraits?: Record<number, string>;
}

// High-level sub-tabs
type TacticalSubTab = "all-shots" | "ball-sequence" | "court-dominance";

const SUB_TABS: Array<{
  id: TacticalSubTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  { 
    id: "all-shots", 
    label: "All Shots", 
    icon: <LayersIcon width={16} height={16} />,
    description: "Shot placement overview for all players"
  },
  { 
    id: "ball-sequence", 
    label: "Ball Sequence", 
    icon: <StackIcon width={16} height={16} />,
    description: "Analyze shot patterns through the rally sequence"
  },
  { 
    id: "court-dominance", 
    label: "Court Dominance", 
    icon: <GridIcon width={16} height={16} />,
    description: "Player positioning and territory control"
  },
];

// Ball sequence configuration
const BALL_TABS: Array<{
  id: number;
  label: string;
  name: string;
  description: string;
  originLabel: string;
  countLabel: string;
  ballType: BallSequenceType;
}> = [
  { id: 1, label: "1st", name: "Serve", description: "Where each player serves from and to", originLabel: "Serve position", countLabel: "serve", ballType: "serve" },
  { id: 2, label: "2nd", name: "Return", description: "Where each player returns serves", originLabel: "Return position", countLabel: "return", ballType: "return" },
  { id: 3, label: "3rd", name: "Third Ball", description: "Server's first shot after return", originLabel: "Shot position", countLabel: "shot", ballType: "third-ball" },
  { id: 4, label: "4th", name: "Fourth Ball", description: "Returner's second shot", originLabel: "Shot position", countLabel: "shot", ballType: "fourth-ball" },
  { id: 5, label: "5th", name: "Fifth Ball", description: "Server's second shot after serve", originLabel: "Shot position", countLabel: "shot", ballType: "fifth-ball" },
];

// Analysis Display Component (no button, auto-triggers)
interface AnalysisDisplayProps {
  title: string;
  isAnalyzing: boolean;
  analysis: string | null;
  error: string | null;
}

function AnalysisDisplay({
  title,
  isAnalyzing,
  analysis,
  error,
}: AnalysisDisplayProps) {
  const hasResults = analysis || isAnalyzing || error;

  if (!hasResults) return null;

  return (
    <CollapsibleSection
      title={title}
      defaultOpen
    >
      {error ? (
        <Text size="2" color="red">{error}</Text>
      ) : analysis ? (
        <>
          <Box className="prose dark:prose-invert" style={{ maxWidth: "none", fontSize: "14px" }}>
            <MarkdownWithSwings>{analysis}</MarkdownWithSwings>
          </Box>
          {isAnalyzing && <StreamingIndicator />}
        </>
      ) : isAnalyzing ? (
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">Finding tactical patterns…</Text>
          <StreamingIndicator />
        </Flex>
      ) : null}
    </CollapsibleSection>
  );
}

// Helper to build player analysis data from shot data
function buildPlayerAnalysisData(
  allShotsData: PlayerShotData[],
  label: string = "All Shots"
) {
  return allShotsData
    .filter(d => d.totalShots > 0)
    .map(playerData => ({
      playerName: playerData.displayName,
      playerId: playerData.playerId,
      ballTypes: [{
        ballType: "all-shots" as BallSequenceType,
        ballLabel: label,
        playerData: convertToTacticalData(playerData),
      }],
    }));
}

// Helper to build ball sequence analysis data
function buildBallSequenceData(
  serveData: PlayerShotData[],
  returnData: PlayerShotData[],
  thirdBallData: PlayerShotData[],
  fourthBallData: PlayerShotData[],
  fifthBallData: PlayerShotData[]
) {
  const allPlayerIds = new Set<number>();
  
  [...serveData, ...returnData, ...thirdBallData, ...fourthBallData, ...fifthBallData].forEach(d => {
    if (d.totalShots > 0) allPlayerIds.add(d.playerId);
  });
  
  return Array.from(allPlayerIds).sort((a, b) => a - b).map(playerId => {
    const servePlayer = serveData.find(d => d.playerId === playerId);
    const returnPlayer = returnData.find(d => d.playerId === playerId);
    const thirdPlayer = thirdBallData.find(d => d.playerId === playerId);
    const fourthPlayer = fourthBallData.find(d => d.playerId === playerId);
    const fifthPlayer = fifthBallData.find(d => d.playerId === playerId);
    
    const playerName = servePlayer?.displayName || returnPlayer?.displayName || `Player ${playerId}`;
    
    const ballTypes = [
      servePlayer && servePlayer.totalShots > 0 ? { ballType: "serve" as BallSequenceType, ballLabel: "Serve", playerData: convertToTacticalData(servePlayer) } : null,
      returnPlayer && returnPlayer.totalShots > 0 ? { ballType: "return" as BallSequenceType, ballLabel: "Return", playerData: convertToTacticalData(returnPlayer) } : null,
      thirdPlayer && thirdPlayer.totalShots > 0 ? { ballType: "third-ball" as BallSequenceType, ballLabel: "Third Ball", playerData: convertToTacticalData(thirdPlayer) } : null,
      fourthPlayer && fourthPlayer.totalShots > 0 ? { ballType: "fourth-ball" as BallSequenceType, ballLabel: "Fourth Ball", playerData: convertToTacticalData(fourthPlayer) } : null,
      fifthPlayer && fifthPlayer.totalShots > 0 ? { ballType: "fifth-ball" as BallSequenceType, ballLabel: "Fifth Ball", playerData: convertToTacticalData(fifthPlayer) } : null,
    ].filter(Boolean) as Array<{ ballType: BallSequenceType; ballLabel: string; playerData: ReturnType<typeof convertToTacticalData> }>;
    
    return {
      playerName,
      playerId,
      ballTypes,
    };
  }).filter(p => p.ballTypes.length > 0);
}

export function TacticalTab({ result, enhancedBallBounces, playerDisplayNames = {}, portraits = {} }: TacticalTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<TacticalSubTab>("all-shots");
  const [selectedBall, setSelectedBall] = useState(1);
  const [selectedSwingType, setSelectedSwingType] = useState<string | null>(null);
  const [selectedBallSwingType, setSelectedBallSwingType] = useState<string | null>(null);
  
  // Track if we've already triggered analysis for each tab
  const allShotsAnalyzedRef = useRef(false);
  const ballSequenceAnalyzedRef = useRef(false);
  const nicknamesGeneratedRef = useRef(false);

  // Extract shot data using reusable hooks
  const allShotsData = useAllShotsData({ result, playerDisplayNames });
  const serveData = useServeData({ result, playerDisplayNames });
  const returnData = useReturnData({ result, playerDisplayNames });
  const thirdBallData = useThirdBallData({ result, playerDisplayNames });
  const fourthBallData = useFourthBallData({ result, playerDisplayNames });
  const fifthBallData = useFifthBallData({ result, playerDisplayNames });

  // Extract unique swing types from all shots data
  const availableSwingTypes = useMemo(() => {
    const swingTypes = new Set<string>();
    allShotsData.forEach(player => {
      player.pairs.forEach(pair => {
        if (pair.swingType) {
          swingTypes.add(pair.swingType);
        }
      });
    });
    return Array.from(swingTypes).sort();
  }, [allShotsData]);

  // Filter shot data by swing type
  const filteredAllShotsData = useMemo((): PlayerShotData[] => {
    if (!selectedSwingType) return allShotsData;
    
    return allShotsData.map(player => {
      // Filter pairs by swing type
      const filteredPairs = player.pairs.filter(p => p.swingType === selectedSwingType);
      
      if (filteredPairs.length === 0) {
        return {
          ...player,
          origins: player.origins.map(row => row.map(() => 0)),
          landings: player.landings.map(row => row.map(() => 0)),
          pairs: [],
          originDetails: player.originDetails?.map(row => row.map(() => [])) || [],
          landingDetails: player.landingDetails?.map(row => row.map(() => [])) || [],
          avgSpeed: 0,
          topSpeed: 0,
          totalShots: 0,
        };
      }
      
      // Rebuild grids from filtered pairs
      const origins = player.origins.map(row => row.map(() => 0));
      const landings = player.landings.map(row => row.map(() => 0));
      const originDetails = player.origins.map(row => row.map(() => [] as any[]));
      const landingDetails = player.landings.map(row => row.map(() => [] as any[]));
      
      let totalSpeed = 0;
      let topSpeed = 0;
      
      filteredPairs.forEach(pair => {
        origins[pair.originRow][pair.originCol]++;
        landings[pair.landingRow][pair.landingCol]++;
        
        originDetails[pair.originRow][pair.originCol].push({
          swingType: pair.swingType,
          speed: pair.speed,
          isOrigin: true,
        });
        landingDetails[pair.landingRow][pair.landingCol].push({
          swingType: pair.swingType,
          speed: pair.speed,
          isOrigin: false,
        });
        
        if (pair.speed > 0) {
          totalSpeed += pair.speed;
          topSpeed = Math.max(topSpeed, pair.speed);
        }
      });
      
      const avgSpeed = filteredPairs.length > 0 ? totalSpeed / filteredPairs.length : 0;
      
      return {
        ...player,
        origins,
        landings,
        pairs: filteredPairs,
        originDetails,
        landingDetails,
        avgSpeed,
        topSpeed,
        totalShots: filteredPairs.length,
      };
    });
  }, [allShotsData, selectedSwingType]);

  // Player nicknames hook
  const { nicknames, isGenerating: nicknamesLoading, generate: generateNicknames } = usePlayerNicknames({
    sport: "padel",
  });

  // Separate tactical analysis hooks for each sub-tab
  const allShotsAnalysis = useTacticalAnalysis({ sport: "padel" });
  const ballSequenceAnalysis = useTacticalAnalysis({ sport: "padel" });

  // Map ball number to data
  const ballDataMap: Record<number, typeof serveData> = {
    1: serveData,
    2: returnData,
    3: thirdBallData,
    4: fourthBallData,
    5: fifthBallData,
  };

  const hasAllShotsData = allShotsData.length > 0 && allShotsData.some(d => d.totalShots > 0);

  // Get current ball data
  const currentBallData = ballDataMap[selectedBall] || [];

  // Extract unique swing types from current ball data
  const availableBallSwingTypes = useMemo(() => {
    const swingTypes = new Set<string>();
    currentBallData.forEach(player => {
      player.pairs.forEach(pair => {
        if (pair.swingType) {
          swingTypes.add(pair.swingType);
        }
      });
    });
    return Array.from(swingTypes).sort();
  }, [currentBallData]);

  // Reset ball swing type filter when ball tab changes
  useEffect(() => {
    setSelectedBallSwingType(null);
  }, [selectedBall]);

  // Filter ball data by swing type
  const filteredBallData = useMemo((): PlayerShotData[] => {
    if (!selectedBallSwingType) return currentBallData;
    
    return currentBallData.map(player => {
      const filteredPairs = player.pairs.filter(p => p.swingType === selectedBallSwingType);
      
      if (filteredPairs.length === 0) {
        return {
          ...player,
          origins: player.origins.map(row => row.map(() => 0)),
          landings: player.landings.map(row => row.map(() => 0)),
          pairs: [],
          originDetails: player.originDetails?.map(row => row.map(() => [])) || [],
          landingDetails: player.landingDetails?.map(row => row.map(() => [])) || [],
          avgSpeed: 0,
          topSpeed: 0,
          totalShots: 0,
        };
      }
      
      const origins = player.origins.map(row => row.map(() => 0));
      const landings = player.landings.map(row => row.map(() => 0));
      const originDetails = player.origins.map(row => row.map(() => [] as any[]));
      const landingDetails = player.landings.map(row => row.map(() => [] as any[]));
      
      let totalSpeed = 0;
      let topSpeed = 0;
      
      filteredPairs.forEach(pair => {
        origins[pair.originRow][pair.originCol]++;
        landings[pair.landingRow][pair.landingCol]++;
        
        originDetails[pair.originRow][pair.originCol].push({
          swingType: pair.swingType,
          speed: pair.speed,
          isOrigin: true,
        });
        landingDetails[pair.landingRow][pair.landingCol].push({
          swingType: pair.swingType,
          speed: pair.speed,
          isOrigin: false,
        });
        
        if (pair.speed > 0) {
          totalSpeed += pair.speed;
          topSpeed = Math.max(topSpeed, pair.speed);
        }
      });
      
      const avgSpeed = filteredPairs.length > 0 ? totalSpeed / filteredPairs.length : 0;
      
      return {
        ...player,
        origins,
        landings,
        pairs: filteredPairs,
        originDetails,
        landingDetails,
        avgSpeed,
        topSpeed,
        totalShots: filteredPairs.length,
      };
    });
  }, [currentBallData, selectedBallSwingType]);

  // Build tactical data for nickname generation
  const tacticalDataForNicknames = useMemo((): PlayerTacticalData[] => {
    return allShotsData
      .filter(d => d.totalShots > 0)
      .map(playerData => convertToTacticalData(playerData));
  }, [allShotsData]);

  // Auto-generate nicknames when we have shot data
  useEffect(() => {
    if (
      hasAllShotsData &&
      !nicknamesGeneratedRef.current &&
      !nicknamesLoading &&
      Object.keys(nicknames).length === 0 &&
      tacticalDataForNicknames.length > 0
    ) {
      nicknamesGeneratedRef.current = true;
      generateNicknames(tacticalDataForNicknames);
    }
  }, [hasAllShotsData, nicknamesLoading, nicknames, tacticalDataForNicknames, generateNicknames]);

  // Auto-trigger All Shots analysis when tab is active
  useEffect(() => {
    if (
      activeSubTab === "all-shots" &&
      hasAllShotsData &&
      !allShotsAnalyzedRef.current &&
      !allShotsAnalysis.isAnalyzing &&
      !allShotsAnalysis.analysis
    ) {
      allShotsAnalyzedRef.current = true;
      const players = buildPlayerAnalysisData(allShotsData);
      if (players.length > 0) {
        allShotsAnalysis.analyzeAll({ players });
      }
    }
  }, [activeSubTab, hasAllShotsData, allShotsData, allShotsAnalysis]);

  // Auto-trigger Ball Sequence analysis when tab is active
  useEffect(() => {
    if (
      activeSubTab === "ball-sequence" &&
      !ballSequenceAnalyzedRef.current &&
      !ballSequenceAnalysis.isAnalyzing &&
      !ballSequenceAnalysis.analysis
    ) {
      const players = buildBallSequenceData(
        serveData,
        returnData,
        thirdBallData,
        fourthBallData,
        fifthBallData
      );
      if (players.length > 0) {
        ballSequenceAnalyzedRef.current = true;
        ballSequenceAnalysis.analyzeAll({ players });
      }
    }
  }, [activeSubTab, serveData, returnData, thirdBallData, fourthBallData, fifthBallData, ballSequenceAnalysis]);

  if (!result) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <TargetIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">Tactical analysis not available</Text>
        </Flex>
      </Box>
    );
  }

  const currentTab = BALL_TABS.find(t => t.id === selectedBall) || BALL_TABS[0];

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* High-level Sub-Tab Navigation */}
      <Flex gap="2" mb="4">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <Box
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-3)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? "var(--accent-9)" : "var(--gray-3)",
                border: `1px solid ${isActive ? "var(--accent-9)" : "var(--gray-6)"}`,
              }}
            >
              <Flex align="center" gap="2">
                <Box style={{ color: isActive ? "white" : "var(--gray-11)" }}>
                  {tab.icon}
                </Box>
                <Text
                  size="2"
                  weight="medium"
                  style={{ color: isActive ? "white" : "var(--gray-11)" }}
                >
                  {tab.label}
                </Text>
              </Flex>
            </Box>
          );
        })}
      </Flex>

      {/* All Shots Sub-Tab Content */}
      {activeSubTab === "all-shots" && (
        <Box>
          <Box
            style={{
              padding: "16px",
              background: "var(--gray-2)",
              borderRadius: "var(--radius-3)",
              border: "1px solid var(--gray-5)",
              overflow: "visible",
            }}
          >
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between">
                <Flex align="center" gap="2">
                  <Box
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent-9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LayersIcon width={14} height={14} style={{ color: "white" }} />
                  </Box>
                  <Heading size="3" weight="medium">Shot Placement Overview</Heading>
                  {selectedSwingType && (
                    <Badge 
                      color="green" 
                      variant="soft"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedSwingType(null)}
                    >
                      {formatSwingType(selectedSwingType)}
                      <Cross2Icon width={12} height={12} style={{ marginLeft: 4 }} />
                    </Badge>
                  )}
                </Flex>
                
                {/* Filter Dropdown */}
                {availableSwingTypes.length > 0 && (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <IconButton
                        variant="soft"
                        size="2"
                        style={{
                          position: "relative",
                        }}
                      >
                        <MixerHorizontalIcon width={16} height={16} />
                        {selectedSwingType && (
                          <Box
                            style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--accent-9)",
                            }}
                          />
                        )}
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Label>Filter by Shot Type</DropdownMenu.Label>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        onClick={() => setSelectedSwingType(null)}
                        style={{ 
                          fontWeight: !selectedSwingType ? 600 : 400,
                          color: !selectedSwingType ? "var(--accent-11)" : undefined,
                        }}
                      >
                        <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
                          <span>All Shots</span>
                          {!selectedSwingType && <CheckIcon width={16} height={16} />}
                        </Flex>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      {availableSwingTypes.map(swingType => (
                        <DropdownMenu.Item
                          key={swingType}
                          onClick={() => setSelectedSwingType(swingType)}
                          style={{ 
                            fontWeight: selectedSwingType === swingType ? 600 : 400,
                            color: selectedSwingType === swingType ? "var(--accent-11)" : undefined,
                          }}
                        >
                          <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
                            <span>{formatSwingType(swingType)}</span>
                            {selectedSwingType === swingType && <CheckIcon width={16} height={16} />}
                          </Flex>
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                )}
              </Flex>
              <Text size="2" color="gray">
                {selectedSwingType 
                  ? `Showing ${formatSwingType(selectedSwingType)} shots only`
                  : "All shots from all players combined - see where shots originate and land"
                }
              </Text>
              
              {hasAllShotsData ? (
                <ShotHeatmap
                  data={filteredAllShotsData}
                  shotLabel={selectedSwingType ? formatSwingType(selectedSwingType) : "Shot"}
                  originLabel="Shot position"
                  countLabel="shot"
                  emptyMessage="No shot data available"
                  ballType="serve"
                  sport="padel"
                  portraits={portraits}
                  nicknames={nicknames}
                  nicknamesLoading={nicknamesLoading}
                />
              ) : (
                <Card style={{ border: "1px solid var(--gray-5)" }}>
                  <Flex 
                    direction="column" 
                    gap="2" 
                    p="6" 
                    align="center" 
                    justify="center"
                  >
                    <TargetIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
                    <Text size="2" color="gray" weight="medium">No shot data available</Text>
                    <Text size="1" color="gray">Shot placement data will appear here once detected</Text>
                  </Flex>
                </Card>
              )}
            </Flex>
          </Box>

          {/* Analysis Section (auto-triggered) - below the overview */}
          <Box mt="4">
            <AnalysisDisplay
              title="🎯 Shot Placement Analysis"
              isAnalyzing={allShotsAnalysis.isAnalyzing}
              analysis={allShotsAnalysis.analysis}
              error={allShotsAnalysis.error}
            />
          </Box>
        </Box>
      )}

      {/* Ball Sequence Sub-Tab Content */}
      {activeSubTab === "ball-sequence" && (
        <Flex direction="column" gap="4">
          {/* Ball Sequence Analysis */}
          <Box>
            <Box mb="3">
              <Heading size="3" weight="medium">Ball Sequence Overview</Heading>
              <Text size="2" color="gray">
                Analyze shot patterns through the rally sequence
              </Text>
            </Box>
            
            {/* Ball tabs */}
            <Flex gap="1" mb="4">
              {BALL_TABS.map((tab) => {
                const isActive = selectedBall === tab.id;
                const hasData = (ballDataMap[tab.id] || []).some(d => d.totalShots > 0);
                
                return (
                  <Box
                    key={tab.id}
                    onClick={() => setSelectedBall(tab.id)}
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

            {/* Current ball analysis */}
            <Box
              style={{
                padding: "16px",
                background: "var(--gray-2)",
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--gray-5)",
                overflow: "visible",
              }}
            >
              <Flex direction="column" gap="3">
                <Flex align="center" justify="between">
                  <Flex align="center" gap="2">
                    <Box
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--accent-9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text size="2" weight="bold" style={{ color: "white" }}>
                        {currentTab.id}
                      </Text>
                    </Box>
                    <Heading size="3" weight="medium">{currentTab.name}</Heading>
                    {selectedBallSwingType && (
                      <Badge 
                        color="green" 
                        variant="soft"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedBallSwingType(null)}
                      >
                        {formatSwingType(selectedBallSwingType)}
                        <Cross2Icon width={12} height={12} style={{ marginLeft: 4 }} />
                      </Badge>
                    )}
                  </Flex>
                  
                  {/* Filter Dropdown */}
                  {availableBallSwingTypes.length > 0 && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton
                          variant="soft"
                          size="2"
                          style={{
                            position: "relative",
                          }}
                        >
                          <MixerHorizontalIcon width={16} height={16} />
                          {selectedBallSwingType && (
                            <Box
                              style={{
                                position: "absolute",
                                top: -2,
                                right: -2,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--accent-9)",
                              }}
                            />
                          )}
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Label>Filter by Shot Type</DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          onClick={() => setSelectedBallSwingType(null)}
                          style={{ 
                            fontWeight: !selectedBallSwingType ? 600 : 400,
                            color: !selectedBallSwingType ? "var(--accent-11)" : undefined,
                          }}
                        >
                          <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
                            <span>All Shots</span>
                            {!selectedBallSwingType && <CheckIcon width={16} height={16} />}
                          </Flex>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        {availableBallSwingTypes.map(swingType => (
                          <DropdownMenu.Item
                            key={swingType}
                            onClick={() => setSelectedBallSwingType(swingType)}
                            style={{ 
                              fontWeight: selectedBallSwingType === swingType ? 600 : 400,
                              color: selectedBallSwingType === swingType ? "var(--accent-11)" : undefined,
                            }}
                          >
                            <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
                              <span>{formatSwingType(swingType)}</span>
                              {selectedBallSwingType === swingType && <CheckIcon width={16} height={16} />}
                            </Flex>
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )}
                </Flex>
                <Text size="2" color="gray">
                  {selectedBallSwingType 
                    ? `Showing ${formatSwingType(selectedBallSwingType)} shots only`
                    : currentTab.description
                  }
                </Text>
                
                <ShotHeatmap
                  data={filteredBallData}
                  shotLabel={selectedBallSwingType ? formatSwingType(selectedBallSwingType) : currentTab.name}
                  originLabel={currentTab.originLabel}
                  countLabel={currentTab.countLabel}
                  emptyMessage={`No ${currentTab.name.toLowerCase()} data available`}
                  ballType={currentTab.ballType}
                  sport="padel"
                  portraits={portraits}
                  nicknames={nicknames}
                  nicknamesLoading={nicknamesLoading}
                />
              </Flex>
            </Box>

            {/* Analysis Result Section (auto-triggered) - below the overview */}
            <Box mt="4">
              <AnalysisDisplay
                title="🎯 Ball Sequence Analysis"
                isAnalyzing={ballSequenceAnalysis.isAnalyzing}
                analysis={ballSequenceAnalysis.analysis}
                error={ballSequenceAnalysis.error}
              />
            </Box>
          </Box>
        </Flex>
      )}

      {/* Court Dominance Sub-Tab Content */}
      {activeSubTab === "court-dominance" && (
        <CourtDominanceView
          result={result}
          playerDisplayNames={playerDisplayNames}
          portraits={portraits}
        />
      )}
    </Box>
  );
}
