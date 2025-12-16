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
  selectedSwingTypes: string[];
  onSwingTypesChange: (types: string[]) => void;
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
  selectedSwingTypes,
  onSwingTypesChange,
  portraits,
  nicknames,
  nicknamesLoading,
  analysis,
  onBallSequenceClick,
  sport = "padel",
}: AllShotsContentProps) {
  const availableSwingTypes = useMemo(() => extractSwingTypes(allShotsData), [allShotsData]);
  const filteredData = useMemo(
    () => filterBySwingType(allShotsData, selectedSwingTypes),
    [allShotsData, selectedSwingTypes]
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
            selectedSwingTypes={selectedSwingTypes}
            onSwingTypesChange={onSwingTypesChange}
          />
          
          <Text size="2" color="gray">
            {selectedSwingTypes.length > 0
              ? `Showing ${selectedSwingTypes.map(formatSwingType).join(", ")} shots`
              : "All shots from all players combined - see where shots originate and land"
            }
          </Text>
          
          {hasAllShotsData ? (
            <ShotHeatmap
              data={filteredData}
              shotLabel={selectedSwingTypes.length === 1 ? formatSwingType(selectedSwingTypes[0]) : "Shot"}
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

