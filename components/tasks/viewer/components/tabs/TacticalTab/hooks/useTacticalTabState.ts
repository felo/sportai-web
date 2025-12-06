import { useState, useRef, useCallback, useEffect } from "react";
import type { TacticalSubTab, BallSequenceClickData } from "../types";
import { BALL_TABS } from "../constants";

interface UseTacticalTabStateReturn {
  // Sub-tab state
  activeSubTab: TacticalSubTab;
  setActiveSubTab: (tab: TacticalSubTab) => void;
  
  // Ball sequence state
  selectedBall: number;
  setSelectedBall: (ball: number) => void;
  
  // Swing type filters
  selectedSwingType: string | null;
  setSelectedSwingType: (type: string | null) => void;
  selectedBallSwingType: string | null;
  setSelectedBallSwingType: (type: string | null) => void;
  
  // Analysis tracking refs
  allShotsAnalyzedRef: React.MutableRefObject<boolean>;
  ballSequenceAnalyzedRef: React.MutableRefObject<boolean>;
  nicknamesGeneratedRef: React.MutableRefObject<boolean>;
  
  // Scroll handling
  ballSequenceSectionRef: React.RefObject<HTMLDivElement>;
  handleBallSequenceClick: (data: BallSequenceClickData) => void;
}

export function useTacticalTabState(): UseTacticalTabStateReturn {
  const [activeSubTab, setActiveSubTab] = useState<TacticalSubTab>("all-shots");
  const [selectedBall, setSelectedBall] = useState(1);
  const [selectedSwingType, setSelectedSwingType] = useState<string | null>(null);
  const [selectedBallSwingType, setSelectedBallSwingType] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState(false);
  
  // Track if we've already triggered analysis for each tab
  const allShotsAnalyzedRef = useRef(false);
  const ballSequenceAnalyzedRef = useRef(false);
  const nicknamesGeneratedRef = useRef(false);
  
  // Ref for scrolling to ball sequence section
  const ballSequenceSectionRef = useRef<HTMLDivElement>(null);

  // Reset ball swing type filter when ball tab changes
  useEffect(() => {
    setSelectedBallSwingType(null);
  }, [selectedBall]);

  // Scroll to ball sequence section when it becomes visible and scroll is pending
  useEffect(() => {
    if (pendingScroll && activeSubTab === "ball-sequence" && ballSequenceSectionRef.current) {
      ballSequenceSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      setPendingScroll(false);
    }
  }, [pendingScroll, activeSubTab]);

  // Handle ball sequence clicks from analysis text - navigate to the appropriate tab
  const handleBallSequenceClick = useCallback((ballSequence: BallSequenceClickData) => {
    setActiveSubTab("ball-sequence");
    
    const ballTab = BALL_TABS.find(tab => tab.ballType === ballSequence.ballType);
    if (ballTab) {
      setSelectedBall(ballTab.id);
    }
    
    setPendingScroll(true);
  }, []);

  return {
    activeSubTab,
    setActiveSubTab,
    selectedBall,
    setSelectedBall,
    selectedSwingType,
    setSelectedSwingType,
    selectedBallSwingType,
    setSelectedBallSwingType,
    allShotsAnalyzedRef,
    ballSequenceAnalyzedRef,
    nicknamesGeneratedRef,
    ballSequenceSectionRef,
    handleBallSequenceClick,
  };
}

