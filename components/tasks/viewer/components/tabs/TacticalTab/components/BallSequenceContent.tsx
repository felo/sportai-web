"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { TargetIcon } from "@radix-ui/react-icons";
import { ShotHeatmap, PlayerShotData } from "../../../ShotHeatmap";
import { formatSwingType } from "../../../../utils";
import { extractSwingTypes, filterBySwingType } from "../utils";
import { BALL_TABS } from "../constants";
import { BallTabNavigation } from "./BallTabNavigation";
import { SectionHeader } from "./SectionHeader";
import { AnalysisDisplay } from "./AnalysisDisplay";
import type { BallSequenceClickData } from "../types";

type Sport = "tennis" | "padel" | "pickleball";

interface BallSequenceContentProps {
  selectedBall: number;
  onBallChange: (ball: number) => void;
  ballDataMap: Record<number, PlayerShotData[]>;
  selectedBallSwingTypes: string[];
  onBallSwingTypesChange: (types: string[]) => void;
  portraits: Record<number, string>;
  nicknames: Record<string, string>;
  nicknamesLoading: boolean;
  analysis: {
    isAnalyzing: boolean;
    analysis: string | null;
    error: string | null;
  };
  onBallSequenceClick: (data: BallSequenceClickData) => void;
  sectionRef: React.RefObject<HTMLDivElement>;
  sport?: Sport;
}

export function BallSequenceContent({
  selectedBall,
  onBallChange,
  ballDataMap,
  selectedBallSwingTypes,
  onBallSwingTypesChange,
  portraits,
  nicknames,
  nicknamesLoading,
  analysis,
  onBallSequenceClick,
  sectionRef,
  sport = "padel",
}: BallSequenceContentProps) {
  const currentBallData = ballDataMap[selectedBall] || [];
  const currentTab = BALL_TABS.find(t => t.id === selectedBall) || BALL_TABS[0];
  
  const availableBallSwingTypes = useMemo(
    () => extractSwingTypes(currentBallData), 
    [currentBallData]
  );
  
  const filteredBallData = useMemo(
    () => filterBySwingType(currentBallData, selectedBallSwingTypes),
    [currentBallData, selectedBallSwingTypes]
  );

  return (
    <Flex direction="column" gap="4" ref={sectionRef}>
      <Box>
        <Box mb="3">
          <Heading size="3" weight="medium">Ball Sequence Overview</Heading>
          <Text size="2" color="gray">
            Analyze shot patterns through the rally sequence
          </Text>
        </Box>
        
        <BallTabNavigation
          selectedBall={selectedBall}
          onBallChange={onBallChange}
          ballDataMap={ballDataMap}
        />

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
            <SectionHeader
              icon={
                <Text size="2" weight="bold" style={{ color: "white" }}>
                  {currentTab.id}
                </Text>
              }
              title={currentTab.name}
              availableSwingTypes={availableBallSwingTypes}
              selectedSwingTypes={selectedBallSwingTypes}
              onSwingTypesChange={onBallSwingTypesChange}
            />
            
            <Text size="2" color="gray">
              {selectedBallSwingTypes.length > 0
                ? `Showing ${selectedBallSwingTypes.map(formatSwingType).join(", ")} shots`
                : currentTab.description
              }
            </Text>
            
            <ShotHeatmap
              data={filteredBallData}
              shotLabel={selectedBallSwingTypes.length === 1 ? formatSwingType(selectedBallSwingTypes[0]) : currentTab.name}
              originLabel={currentTab.originLabel}
              countLabel={currentTab.countLabel}
              emptyMessage={`No ${currentTab.name.toLowerCase()} data available`}
              ballType={currentTab.ballType}
              sport={sport}
              portraits={portraits}
              nicknames={nicknames}
              nicknamesLoading={nicknamesLoading}
            />
          </Flex>
        </Box>

        <Box mt="4">
          <AnalysisDisplay
            title={
              <Flex align="center" gap="2">
                <TargetIcon width={16} height={16} />
                <span>Ball Sequence Analysis</span>
              </Flex>
            }
            isAnalyzing={analysis.isAnalyzing}
            analysis={analysis.analysis}
            error={analysis.error}
            onBallSequenceClick={onBallSequenceClick}
          />
        </Box>
      </Box>
    </Flex>
  );
}

