"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Text, Button } from "@radix-ui/themes";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import type { VideoPreAnalysis } from "@/types/chat";
import { estimateProAnalysisTime } from "@/utils/video-utils";
import { getCameraAngleLabel } from "../../input/VideoEligibilityIndicator";
import { useTypewriter } from "@/hooks/useTypewriter";
import { SwingSelectionCard } from "./SwingSelectionCard";
import { TacticalOptionsCard } from "./TacticalOptionsCard";
import buttonStyles from "@/styles/buttons.module.css";

// ============================================================================
// Main Component
// ============================================================================

interface AnalysisOptionsMessageProps {
  preAnalysis: VideoPreAnalysis;
  onSelectProPlusQuick: () => void;
  onSelectQuickOnly: () => void;
  /** Handler for swing analysis (pickleball uses Shark API) */
  onSwingAnalyze?: (swingType: string, swingLabel: string, dominantHand: "left" | "right") => void;
  isLoading?: boolean;
  selectedOption?: "pro_plus_quick" | "quick_only" | null;
  isLoadedFromServer?: boolean; // If true, skip typewriter animation
}

/**
 * Interactive message component for choosing analysis type
 * Shows swing selection for technique videos, Free/PRO for tactical videos
 */
export function AnalysisOptionsMessage({
  preAnalysis,
  onSelectProPlusQuick,
  onSelectQuickOnly,
  onSwingAnalyze,
  isLoading = false,
  selectedOption = null,
  isLoadedFromServer = false,
}: AnalysisOptionsMessageProps) {
  // If loaded from server, skip animation. If new message, show typewriter.
  const shouldAnimate = !isLoadedFromServer;
  const [showBoxes, setShowBoxes] = useState(!shouldAnimate);
  const [showButtons, setShowButtons] = useState(!shouldAnimate);

  const isRacketSport = preAnalysis.sport && ["tennis", "pickleball", "padel"].includes(preAnalysis.sport);
  const sportName = isRacketSport
    ? preAnalysis.sport!.charAt(0).toUpperCase() + preAnalysis.sport!.slice(1)
    : null;

  // Get camera angle label
  const cameraAngle = preAnalysis.cameraAngle;
  const cameraLabel = cameraAngle && cameraAngle !== "other"
    ? getCameraAngleLabel(cameraAngle)
    : null;

  // Get estimated processing time based on video duration
  const estimatedTime = estimateProAnalysisTime(preAnalysis.durationSeconds ?? null);

  // Determine analysis type
  const analysisType = preAnalysis.isProEligible ? "Tactical" : "Technique";
  const isTechniqueAnalysis = preAnalysis.isTechniqueLiteEligible && !preAnalysis.isProEligible;

  // Build intro message - different for technique vs tactical
  const introMessage = useMemo(() => {
    // For technique analysis, ask about the swing
    if (isTechniqueAnalysis && sportName) {
      let msg = `I see you have a ${sportName.toLowerCase()} video`;
      if (cameraLabel) {
        msg += ` with a ${cameraLabel.toLowerCase()} angle`;
      }
      msg += `. What swing did you first hit in the video?`;
      return msg;
    }
    // For tactical analysis or other sports
    if (sportName) {
      let msg = `I see you have a ${sportName.toLowerCase()} video`;
      if (cameraLabel) {
        msg += ` with a ${cameraLabel.toLowerCase()} angle`;
      }
      msg += `. This qualifies for a PRO ${analysisType} Analysis!`;
      return msg;
    }
    // For other sports, use simpler message
    return `I see you have a video that qualifies for a PRO ${analysisType} Analysis!`;
  }, [sportName, cameraLabel, analysisType, isTechniqueAnalysis]);

  const introText = useTypewriter(introMessage, 18, shouldAnimate);

  // Trigger animations after intro finishes
  useEffect(() => {
    if (!shouldAnimate) return; // Already showing everything instantly

    const introDelay = introMessage.length * 18 + 300;
    const boxesTimer = setTimeout(() => setShowBoxes(true), introDelay);
    const buttonsTimer = setTimeout(() => setShowButtons(true), introDelay + 600);

    return () => {
      clearTimeout(boxesTimer);
      clearTimeout(buttonsTimer);
    };
  }, [introMessage, shouldAnimate]);

  const isEligible = preAnalysis.isProEligible || preAnalysis.isTechniqueLiteEligible;

  return (
    <Box>
      {isEligible ? (
        <>
          {/* Intro message with typewriter effect */}
          {introText && (
            <p className="text-base leading-relaxed mb-4" style={{ color: "var(--gray-12)" }}>
              {introText}
            </p>
          )}

          {/* TECHNIQUE ANALYSIS: Swing selection UI */}
          {isTechniqueAnalysis ? (
            <SwingSelectionCard
              sport={["tennis", "pickleball", "padel"].includes(preAnalysis.sport) ? (preAnalysis.sport as "tennis" | "pickleball" | "padel") : "other"}
              isLoading={isLoading}
              showCard={showBoxes}
              showButton={showButtons}
              onAnalyze={(swingType, swingLabel, dominantHand) => {
                // Use Shark API handler if provided, otherwise fall back to PRO analysis
                if (onSwingAnalyze) {
                  onSwingAnalyze(swingType, swingLabel, dominantHand);
                } else {
                  onSelectProPlusQuick();
                }
              }}
            />
          ) : (
            /* TACTICAL ANALYSIS: Free/PRO selection */
            <TacticalOptionsCard
              estimatedTime={estimatedTime}
              isLoading={isLoading}
              selectedOption={selectedOption}
              showCards={showBoxes}
              showButtons={showButtons}
              onSelectProPlusQuick={onSelectProPlusQuick}
              onSelectQuickOnly={onSelectQuickOnly}
            />
          )}
        </>
      ) : (
        <>
          {/* Not eligible message */}
          <Box
            mb="4"
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            {preAnalysis.proEligibilityReason && (
              <Text size="2" color="gray">
                💡 {preAnalysis.proEligibilityReason}
              </Text>
            )}
          </Box>

          <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
            I can still provide quick technique and tactical feedback!
          </Text>

          <Button
            size="3"
            className={buttonStyles.actionButtonSquare}
            onClick={onSelectQuickOnly}
            disabled={isLoading || selectedOption !== null}
          >
            <LightningBoltIcon width={18} height={18} />
            Start Free Analysis
          </Button>
        </>
      )}
    </Box>
  );
}
