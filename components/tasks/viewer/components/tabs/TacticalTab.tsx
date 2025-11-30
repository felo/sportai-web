"use client";

import { useState } from "react";
import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { TargetIcon } from "@radix-ui/react-icons";
import { StatisticsResult, BallBounce } from "../../types";
import { ShotHeatmap } from "../ShotHeatmap";
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
const BALL_TABS = [
  { id: 1, label: "1st", name: "Serve", description: "Where each player serves from and to", originLabel: "Serve position", countLabel: "serve" },
  { id: 2, label: "2nd", name: "Return", description: "Where each player returns serves", originLabel: "Return position", countLabel: "return" },
  { id: 3, label: "3rd", name: "Third Ball", description: "Server's first shot after return", originLabel: "Shot position", countLabel: "shot" },
  { id: 4, label: "4th", name: "Fourth Ball", description: "Returner's second shot", originLabel: "Shot position", countLabel: "shot" },
  { id: 5, label: "5th", name: "Fifth Ball", description: "Server's second shot after serve", originLabel: "Shot position", countLabel: "shot" },
];

export function TacticalTab({ result, enhancedBallBounces, playerDisplayNames = {} }: TacticalTabProps) {
  const [selectedBall, setSelectedBall] = useState(1);

  // Extract shot data using reusable hooks
  const serveData = useServeData({ result, playerDisplayNames });
  const returnData = useReturnData({ result, playerDisplayNames });
  const thirdBallData = useThirdBallData({ result, playerDisplayNames });
  const fourthBallData = useFourthBallData({ result, playerDisplayNames });
  const fifthBallData = useFifthBallData({ result, playerDisplayNames });

  // Map ball number to data
  const ballDataMap: Record<number, typeof serveData> = {
    1: serveData,
    2: returnData,
    3: thirdBallData,
    4: fourthBallData,
    5: fifthBallData,
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
          <Heading size="3" weight="medium" mb="3">Ball Sequence Analysis</Heading>
          <Text size="2" color="gray" mb="3">
            Analyze shot patterns through the rally sequence
          </Text>
          
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
