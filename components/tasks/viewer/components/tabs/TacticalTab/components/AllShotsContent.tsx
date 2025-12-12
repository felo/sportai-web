"use client";

import { useMemo } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { LayersIcon } from "@radix-ui/react-icons";
import { ShotHeatmap, PlayerShotData } from "../../../ShotHeatmap";
import { formatSwingType } from "../../../../utils";
import { extractSwingTypes, filterBySwingType } from "../utils";
import { SectionHeader } from "./SectionHeader";
import { EmptyState } from "./EmptyState";
import { AnalysisDisplay } from "./AnalysisDisplay";
import type { BallSequenceClickData } from "../types";

type Sport = "tennis" | "padel" | "pickleball";

interface AllShotsContentProps {
  allShotsData: PlayerShotData[];
  hasAllShotsData: boolean;
  selectedSwingType: string | null;
  onSwingTypeChange: (type: string | null) => void;
  portraits: Record<number, string>;
  nicknames: Record<string, string>;
  nicknamesLoading: boolean;
  analysis: {
    isAnalyzing: boolean;
    analysis: string | null;
    error: string | null;
  };
  onBallSequenceClick: (data: BallSequenceClickData) => void;
  sport?: Sport;
}

export function AllShotsContent({
  allShotsData,
  hasAllShotsData,
  selectedSwingType,
  onSwingTypeChange,
  portraits,
  nicknames,
  nicknamesLoading,
  analysis,
  onBallSequenceClick,
  sport = "padel",
}: AllShotsContentProps) {
  const availableSwingTypes = useMemo(() => extractSwingTypes(allShotsData), [allShotsData]);
  const filteredData = useMemo(
    () => filterBySwingType(allShotsData, selectedSwingType),
    [allShotsData, selectedSwingType]
  );

  return (
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
          <SectionHeader
            icon={<LayersIcon width={14} height={14} style={{ color: "white" }} />}
            title="Shot Placement Overview"
            availableSwingTypes={availableSwingTypes}
            selectedSwingType={selectedSwingType}
            onSwingTypeChange={onSwingTypeChange}
          />
          
          <Text size="2" color="gray">
            {selectedSwingType 
              ? `Showing ${formatSwingType(selectedSwingType)} shots only`
              : "All shots from all players combined - see where shots originate and land"
            }
          </Text>
          
          {hasAllShotsData ? (
            <ShotHeatmap
              data={filteredData}
              shotLabel={selectedSwingType ? formatSwingType(selectedSwingType) : "Shot"}
              originLabel="Shot position"
              countLabel="shot"
              emptyMessage="No shot data available"
              ballType="serve"
              sport={sport}
              portraits={portraits}
              nicknames={nicknames}
              nicknamesLoading={nicknamesLoading}
            />
          ) : (
            <EmptyState 
              title="No shot data available"
              description="Shot placement data will appear here once detected"
            />
          )}
        </Flex>
      </Box>

      <Box mt="4">
        <AnalysisDisplay
          title="Shot Placement Analysis"
          isAnalyzing={analysis.isAnalyzing}
          analysis={analysis.analysis}
          error={analysis.error}
          onBallSequenceClick={onBallSequenceClick}
        />
      </Box>
    </Box>
  );
}

