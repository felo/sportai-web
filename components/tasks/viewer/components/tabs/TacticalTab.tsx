"use client";

import { useState } from "react";
import { Box, Flex, Text, Heading, Button } from "@radix-ui/themes";
import { TargetIcon } from "@radix-ui/react-icons";
import { StatisticsResult, BallBounce } from "../../types";
import { ShotHeatmap } from "../ShotHeatmap";
import type { BallSequenceType } from "@/types/tactical-analysis";
import { convertToTacticalData } from "@/types/tactical-analysis";
import { useTacticalAnalysis } from "@/hooks/useTacticalAnalysis";
import { MarkdownWithSwings } from "@/components/markdown";
import { CollapsibleSection } from "@/components/ui";
import { StreamingIndicator } from "@/components/chat";
import buttonStyles from "@/styles/buttons.module.css";
// import { BounceHeatmap } from "../BounceHeatmap";
// import { RallyNetwork } from "../RallyNetwork";
import { 
  useServeData, 
  useReturnData, 
  useThirdBallData, 
  useFourthBallData, 
  useFifthBallData 
} from "../../hooks/useShotAnalysis";

interface TacticalTabProps {
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
  playerDisplayNames?: Record<number, string>;
}

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

export function TacticalTab({ result, enhancedBallBounces, playerDisplayNames = {} }: TacticalTabProps) {
  const [selectedBall, setSelectedBall] = useState(1);

  // Extract shot data using reusable hooks
  const serveData = useServeData({ result, playerDisplayNames });
  const returnData = useReturnData({ result, playerDisplayNames });
  const thirdBallData = useThirdBallData({ result, playerDisplayNames });
  const fourthBallData = useFourthBallData({ result, playerDisplayNames });
  const fifthBallData = useFifthBallData({ result, playerDisplayNames });

  // Tactical analysis hook for "Analyse All"
  const { analyzeAll, isAnalyzing, analysis, error } = useTacticalAnalysis({
    sport: "padel",
  });

  // Map ball number to data
  const ballDataMap: Record<number, typeof serveData> = {
    1: serveData,
    2: returnData,
    3: thirdBallData,
    4: fourthBallData,
    5: fifthBallData,
  };

  // Handle Analyse All button click
  const handleAnalyseAll = async () => {
    // Build data for all players
    const allPlayerIds = new Set<number>();
    
    // Collect all unique player IDs
    [...serveData, ...returnData, ...thirdBallData, ...fourthBallData, ...fifthBallData].forEach(d => {
      if (d.totalShots > 0) allPlayerIds.add(d.playerId);
    });
    
    // Build players array with all ball types for each player
    const players = Array.from(allPlayerIds).map(playerId => {
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

    await analyzeAll({ players });
  };

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
  const currentData = ballDataMap[selectedBall] || [];

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex direction="column" gap="4">
        {/* Ball Sequence Analysis */}
        <Box>
          <Flex justify="between" align="center" mb="3">
            <Box>
              <Heading size="3" weight="medium">Ball Sequence Analysis</Heading>
              <Text size="2" color="gray">
                Analyze shot patterns through the rally sequence
              </Text>
            </Box>
            <Button
              className={isAnalyzing ? buttonStyles.actionButtonLoading : buttonStyles.actionButton}
              size="2"
              onClick={handleAnalyseAll}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  Analysing
                  <span className={buttonStyles.loadingDots}>
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              ) : (
                "Analyse Ball Sequence"
              )}
            </Button>
          </Flex>

          {/* Analyse All Result Section */}
          {(analysis || isAnalyzing || error) && (
            <Box style={{ marginBottom: "16px" }}>
              <CollapsibleSection
                title="🎯 Complete Tactical Analysis"
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
                  <StreamingIndicator />
                ) : null}
              </CollapsibleSection>
            </Box>
          )}
          
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
              overflow: "visible", // Allow tooltips to overflow
            }}
          >
            <Flex direction="column" gap="3">
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
              </Flex>
              <Text size="2" color="gray">{currentTab.description}</Text>
              
              <ShotHeatmap
                data={currentData}
                shotLabel={currentTab.name}
                originLabel={currentTab.originLabel}
                countLabel={currentTab.countLabel}
                emptyMessage={`No ${currentTab.name.toLowerCase()} data available`}
                ballType={currentTab.ballType}
                sport="padel"
              />
            </Flex>
          </Box>
        </Box>

{/* Court Coverage - hidden for now
        <Box>
          <Heading size="3" weight="medium" mb="3">Court Coverage</Heading>
          <Text size="2" color="gray" mb="3">Ball bounce distribution across the court</Text>
          {result.bounce_heatmap ? (
            <BounceHeatmap
              heatmap={result.bounce_heatmap}
              totalBounces={(enhancedBallBounces || result.ball_bounces || []).length}
            />
          ) : (
            <Card style={{ padding: "40px", textAlign: "center" }}>
              <Text color="gray">No bounce heatmap data available</Text>
            </Card>
          )}
        </Box>
*/}

{/* Rally Patterns Network - hidden for now
        <Box>
          <Heading size="3" weight="medium" mb="3">Rally Patterns</Heading>
          <Text size="2" color="gray" mb="3">
            How players connect to their preferred shot types
          </Text>
          <RallyNetwork result={result} playerDisplayNames={playerDisplayNames} />
        </Box>
*/}
      </Flex>
    </Box>
  );
}
