import { useMemo, useEffect } from "react";
import { useTacticalAnalysis } from "@/hooks/useTacticalAnalysis";
import { usePlayerNicknames } from "@/hooks/usePlayerNicknames";
import { convertToTacticalData } from "@/types/tactical-analysis";
import type { PlayerTacticalData } from "@/types/tactical-analysis";
import type { PlayerShotData } from "../../../ShotHeatmap";
import { buildPlayerAnalysisData, buildBallSequenceData } from "../utils";
import type { TacticalSubTab } from "../types";

interface UseTacticalDataOptions {
  allShotsData: PlayerShotData[];
  serveData: PlayerShotData[];
  returnData: PlayerShotData[];
  thirdBallData: PlayerShotData[];
  fourthBallData: PlayerShotData[];
  fifthBallData: PlayerShotData[];
  activeSubTab: TacticalSubTab;
  allShotsAnalyzedRef: React.MutableRefObject<boolean>;
  ballSequenceAnalyzedRef: React.MutableRefObject<boolean>;
  nicknamesGeneratedRef: React.MutableRefObject<boolean>;
}

export function useTacticalData({
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
}: UseTacticalDataOptions) {
  const hasAllShotsData = allShotsData.length > 0 && allShotsData.some(d => d.totalShots > 0);

  // Player nicknames hook
  const { 
    nicknames, 
    isGenerating: nicknamesLoading, 
    generate: generateNicknames 
  } = usePlayerNicknames({ sport: "padel" });

  // Separate tactical analysis hooks for each sub-tab
  const allShotsAnalysis = useTacticalAnalysis({ sport: "padel" });
  const ballSequenceAnalysis = useTacticalAnalysis({ sport: "padel" });

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
  }, [hasAllShotsData, nicknamesLoading, nicknames, tacticalDataForNicknames, generateNicknames, nicknamesGeneratedRef]);

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
  }, [activeSubTab, hasAllShotsData, allShotsData, allShotsAnalysis, allShotsAnalyzedRef]);

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
  }, [
    activeSubTab, 
    serveData, 
    returnData, 
    thirdBallData, 
    fourthBallData, 
    fifthBallData, 
    ballSequenceAnalysis,
    ballSequenceAnalyzedRef,
  ]);

  return {
    hasAllShotsData,
    nicknames,
    nicknamesLoading,
    allShotsAnalysis,
    ballSequenceAnalysis,
  };
}

