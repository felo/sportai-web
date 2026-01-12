import { useState, useEffect, RefObject } from "react";
import { StatisticsResult } from "../types";
import type { TimelineFilterState } from "../components/TimelineFilter";

interface UseRallySelectionOptions {
  result: StatisticsResult | null;
  currentTime: number;
  timelineFilters: TimelineFilterState;
  videoRef: RefObject<HTMLVideoElement | null>;
}

interface UseRallySelectionResult {
  selectedRallyIndex: number | null;
  setSelectedRallyIndex: (index: number | null) => void;
}

export function useRallySelection({
  result,
  currentTime,
  timelineFilters,
  videoRef,
}: UseRallySelectionOptions): UseRallySelectionResult {
  const [selectedRallyIndex, setSelectedRallyIndex] = useState<number | null>(null);

  // Auto-select first rally when result loads and showOnlyRallies is enabled
  useEffect(() => {
    if (!result?.rallies || result.rallies.length === 0) return;
    if (!timelineFilters.showOnlyRallies) return;
    if (selectedRallyIndex !== null) return;
    
    setSelectedRallyIndex(0);
  }, [result?.rallies, timelineFilters.showOnlyRallies, selectedRallyIndex]);

  // Auto-select rally when playhead enters it
  useEffect(() => {
    if (!result || !result.rallies) return;
    
    const currentRallyIndex = result.rallies.findIndex(
      ([start, end]) => currentTime >= start && currentTime <= end
    );
    
    if (currentRallyIndex !== -1 && selectedRallyIndex !== currentRallyIndex) {
      setSelectedRallyIndex(currentRallyIndex);
    }
  }, [currentTime, result, selectedRallyIndex]);

  // Auto-skip between rallies when "show only rallies" filter is enabled
  useEffect(() => {
    if (!timelineFilters.showOnlyRallies || !result?.rallies || !videoRef.current) return;
    
    const rallies = result.rallies;
    if (rallies.length === 0) return;
    
    const video = videoRef.current;
    if (video.paused) return;
    
    const buffer = timelineFilters.rallyBuffer;
    
    // Find if we're currently inside a rally (including buffer zone before)
    const currentRallyIndex = rallies.findIndex(
      ([start, end]) => currentTime >= Math.max(0, start - buffer) && currentTime <= end
    );
    
    if (currentRallyIndex !== -1) {
      const [, rallyEnd] = rallies[currentRallyIndex];
      const timeToEnd = rallyEnd - currentTime;
      
      // If we're within 0.1s of the rally end, prepare to skip
      if (timeToEnd <= 0.1 && timeToEnd > 0) {
        const nextRallyIndex = currentRallyIndex + 1;
        if (nextRallyIndex < rallies.length) {
          const [nextRallyStart] = rallies[nextRallyIndex];
          video.currentTime = Math.max(0, nextRallyStart - buffer);
        }
      }
    } else {
      // We're outside a rally - find the next rally to skip to
      const nextRallyIndex = rallies.findIndex(([start]) => start > currentTime);
      
      if (nextRallyIndex !== -1) {
        const [nextRallyStart] = rallies[nextRallyIndex];
        video.currentTime = Math.max(0, nextRallyStart - buffer);
      } else if (currentTime < Math.max(0, rallies[0][0] - buffer)) {
        video.currentTime = Math.max(0, rallies[0][0] - buffer);
      }
    }
  }, [currentTime, timelineFilters.showOnlyRallies, timelineFilters.rallyBuffer, result?.rallies, videoRef]);

  return {
    selectedRallyIndex,
    setSelectedRallyIndex,
  };
}
