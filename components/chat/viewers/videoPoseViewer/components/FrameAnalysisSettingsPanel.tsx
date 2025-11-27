"use client";

import { Flex, Text, Button, Badge, Spinner } from "@radix-ui/themes";
import { CameraIcon, FrameIcon, Cross2Icon, LightningBoltIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import {
  SettingsSection,
  SettingsSectionHeader,
  ToggleSwitch,
} from "@/components/ui";
import type { CourtAnalysisResult, CameraAngleResult } from "@/types/frame-analysis";

interface FrameAnalysisSettingsPanelProps {
  // Analysis state
  isAnalyzing: boolean;
  analyzingTypes: Set<"court" | "camera-angle">;
  
  // Results
  courtResult: CourtAnalysisResult | null;
  cameraAngleResult: CameraAngleResult | null;
  
  // Display toggles
  showCourtOverlay: boolean;
  setShowCourtOverlay: (value: boolean) => void;
  
  // Actions
  onAnalyzeCourt: () => void;
  onAnalyzeCameraAngle: () => void;
  onAnalyzeBoth: () => void;
  onClearResults: () => void;
  
  // Video ref for frame capture
  videoRef: React.RefObject<HTMLVideoElement>;
  
  // Error
  error: string | null;
  
  // Image Insight
  onImageInsight?: () => void;
  isImageInsightLoading?: boolean;
  imageInsightError?: string | null;
  developerMode?: boolean;
  hasPose?: boolean;
}

/**
 * FrameAnalysisSettingsPanel - Settings panel for Gemini-based frame analysis
 * 
 * Provides controls for:
 * - Court detection (boundaries, corners)
 * - Camera angle classification
 * - Overlay visibility toggle
 */
export function FrameAnalysisSettingsPanel({
  isAnalyzing,
  analyzingTypes,
  courtResult,
  cameraAngleResult,
  showCourtOverlay,
  setShowCourtOverlay,
  onAnalyzeCourt,
  onAnalyzeCameraAngle,
  onAnalyzeBoth,
  onClearResults,
  error,
  onImageInsight,
  isImageInsightLoading = false,
  imageInsightError,
  developerMode = false,
  hasPose = false,
}: FrameAnalysisSettingsPanelProps) {
  const hasAnyResult = courtResult || cameraAngleResult;
  
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Frame Analysis (AI)"
        description="Analyze current frame with Gemini"
      />

      <Flex direction="column" gap="3">
        {/* Analysis Buttons */}
        <Flex gap="2" wrap="wrap">
          <Button
            className={buttonStyles.actionButtonSmall}
            onClick={onAnalyzeCourt}
            disabled={isAnalyzing}
            size="1"
          >
            {analyzingTypes.has("court") ? (
              <Spinner size="1" />
            ) : (
              <FrameIcon width={12} height={12} />
            )}
            <Text size="1">Detect Court</Text>
          </Button>
          
          <Button
            className={buttonStyles.actionButtonSmall}
            onClick={onAnalyzeCameraAngle}
            disabled={isAnalyzing}
            size="1"
          >
            {analyzingTypes.has("camera-angle") ? (
              <Spinner size="1" />
            ) : (
              <CameraIcon width={12} height={12} />
            )}
            <Text size="1">Camera Angle</Text>
          </Button>
          
          <Button
            className={buttonStyles.actionButtonSmall}
            onClick={onAnalyzeBoth}
            disabled={isAnalyzing}
            size="1"
            variant="soft"
          >
            {isAnalyzing ? (
              <Spinner size="1" />
            ) : null}
            <Text size="1">Analyze Both</Text>
          </Button>
        </Flex>

        {/* Image Insight Button - Developer Mode Only */}
        {developerMode && onImageInsight && (
          <Flex direction="column" gap="2">
            <Button
              className={buttonStyles.actionButtonSmall}
              onClick={onImageInsight}
              disabled={isImageInsightLoading || isAnalyzing || !hasPose}
              size="1"
              variant="solid"
              color="purple"
              style={{ width: "100%" }}
            >
              {isImageInsightLoading ? (
                <Spinner size="1" />
              ) : (
                <LightningBoltIcon width={12} height={12} />
              )}
              <Text size="1">
                {isImageInsightLoading ? "Analyzing..." : "Image Insight ✨"}
              </Text>
            </Button>
            {!hasPose && (
              <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                Enable AI Overlay and ensure a player is visible.
              </Text>
            )}
            {imageInsightError && (
              <Text size="1" color="red">
                {imageInsightError}
              </Text>
            )}
          </Flex>
        )}

        {/* Error Display */}
        {error && (
          <Text size="1" color="red" style={{ marginTop: "-4px" }}>
            {error}
          </Text>
        )}

        {/* Results Display */}
        {hasAnyResult && (
          <Flex direction="column" gap="2">
            {/* Court Result */}
            {courtResult && (
              <Flex 
                direction="column" 
                gap="1" 
                style={{ 
                  padding: "8px", 
                  background: "var(--gray-a3)", 
                  borderRadius: "6px" 
                }}
              >
                <Flex align="center" justify="between">
                  <Text size="1" weight="medium">Court Detection</Text>
                  <Badge 
                    color={courtResult.found ? "green" : "gray"} 
                    size="1"
                  >
                    {courtResult.found ? "Found" : "Not Found"}
                  </Badge>
                </Flex>
                {courtResult.found && (
                  <>
                    <Text size="1" color="gray">
                      Type: {courtResult.courtType || "Unknown"}
                    </Text>
                    <Text size="1" color="gray">
                      Confidence: {((courtResult.confidence || 0) * 100).toFixed(0)}%
                    </Text>
                  </>
                )}
              </Flex>
            )}

            {/* Camera Angle Result */}
            {cameraAngleResult && (
              <Flex 
                direction="column" 
                gap="1" 
                style={{ 
                  padding: "8px", 
                  background: "var(--gray-a3)", 
                  borderRadius: "6px" 
                }}
              >
                <Flex align="center" justify="between">
                  <Text size="1" weight="medium">Camera Angle</Text>
                  <Badge color="blue" size="1">
                    {cameraAngleResult.angle}
                  </Badge>
                </Flex>
                <Text size="1" color="gray">
                  Confidence: {((cameraAngleResult.confidence || 0) * 100).toFixed(0)}%
                </Text>
                {cameraAngleResult.description && (
                  <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
                    {cameraAngleResult.description}
                  </Text>
                )}
              </Flex>
            )}

            {/* Show Court Overlay Toggle */}
            {courtResult?.found && courtResult.corners && (
              <ToggleSwitch
                checked={showCourtOverlay}
                onCheckedChange={setShowCourtOverlay}
                label="Show Court Overlay"
              />
            )}

            {/* Clear Results Button */}
            <Button
              className={buttonStyles.actionButtonSmall}
              onClick={onClearResults}
              size="1"
              variant="soft"
              color="gray"
            >
              <Cross2Icon width={12} height={12} />
              <Text size="1">Clear Results</Text>
            </Button>
          </Flex>
        )}

        {/* Tip when no results */}
        {!hasAnyResult && !isAnalyzing && (
          <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
            Pause the video, then click a button above to analyze the current frame.
          </Text>
        )}
      </Flex>
    </SettingsSection>
  );
}

