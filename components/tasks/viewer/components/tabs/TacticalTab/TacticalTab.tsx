"use client";

import { Box } from "@radix-ui/themes";
import { StatisticsResult, BallBounce } from "../../../types";
import { CourtDominanceView } from "../../CourtDominanceView";
import { 
  useServeData, 
  useReturnData, 
  useThirdBallData, 
  useFourthBallData, 
  useFifthBallData,
  useAllShotsData,
} from "../../../hooks/useShotAnalysis";
import { useTacticalTabState, useTacticalData } from "./hooks";
import { SubTabNavigation, AllShotsContent, BallSequenceContent, EmptyState } from "./components";

interface TacticalTabProps {
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
  playerDisplayNames?: Record<number, string>;
  portraits?: Record<number, string>;
  sport?: "tennis" | "padel" | "pickleball";
}

export function TacticalTab({ 
  result, 
  enhancedBallBounces, 
  playerDisplayNames = {}, 
  portraits = {},
  sport = "padel",
}: TacticalTabProps) {
  // State management
  const {
    activeSubTab,
    setActiveSubTab,
    selectedBall,
    setSelectedBall,
    selectedSwingTypes,
    setSelectedSwingTypes,
    selectedBallSwingTypes,
    setSelectedBallSwingTypes,
    allShotsAnalyzedRef,
    ballSequenceAnalyzedRef,
    nicknamesGeneratedRef,
    ballSequenceSectionRef,
    handleBallSequenceClick,
  } = useTacticalTabState();

  // Extract shot data using reusable hooks
  const allShotsData = useAllShotsData({ result, playerDisplayNames });
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

  // Tactical data and analysis
  const {
    hasAllShotsData,
    nicknames,
    nicknamesLoading,
    allShotsAnalysis,
    ballSequenceAnalysis,
  } = useTacticalData({
    allShotsData,
    serveData,
    returnData,
    thirdBallData,
    fourthBallData,
    fifthBallData,
    activeSubTab,
    allShotsAnalyzedRef,
    ballSequenceAnalyzedRef,
    nicknamesGeneratedRef,
    sport,
  });

  // Early return for no result
  if (!result) {
    return <EmptyState title="Tactical analysis not available" fullPage />;
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <SubTabNavigation 
        activeSubTab={activeSubTab} 
        onTabChange={setActiveSubTab} 
      />

      {activeSubTab === "all-shots" && (
        <AllShotsContent
          allShotsData={allShotsData}
          hasAllShotsData={hasAllShotsData}
          selectedSwingTypes={selectedSwingTypes}
          onSwingTypesChange={setSelectedSwingTypes}
          portraits={portraits}
          nicknames={nicknames}
          nicknamesLoading={nicknamesLoading}
          analysis={allShotsAnalysis}
          onBallSequenceClick={handleBallSequenceClick}
          sport={sport}
        />
      )}

      {activeSubTab === "ball-sequence" && (
        <BallSequenceContent
          selectedBall={selectedBall}
          onBallChange={setSelectedBall}
          ballDataMap={ballDataMap}
          selectedBallSwingTypes={selectedBallSwingTypes}
          onBallSwingTypesChange={setSelectedBallSwingTypes}
          portraits={portraits}
          nicknames={nicknames}
          nicknamesLoading={nicknamesLoading}
          analysis={ballSequenceAnalysis}
          onBallSequenceClick={handleBallSequenceClick}
          sectionRef={ballSequenceSectionRef}
          sport={sport}
        />
      )}

      {activeSubTab === "court-dominance" && (
        <CourtDominanceView
          result={result}
          playerDisplayNames={playerDisplayNames}
          portraits={portraits}
          sport={sport}
        />
      )}
    </Box>
  );
}



