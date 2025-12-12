"use client";

import { Box, Flex, Tooltip, Spinner, Button } from "@radix-ui/themes";
import {
  RocketIcon,
  Crosshair2Icon,
  ArrowDownIcon,
  CameraIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import type { TrophyDetectionResult } from "../hooks/useTrophyDetection";
import type { ContactPointDetectionResult } from "../hooks/useContactPointDetection";
import type { LandingDetectionResult } from "../hooks/useLandingDetection";
import type { SwingDetectionResult } from "../hooks/useSwingDetection";
import type { SwingDetectionResultV2 } from "../hooks/useSwingDetectionV2";

export interface KeyFrameTimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  // Protocol mode
  selectedProtocol: "serve" | "swings" | "swings-v2";
  // Results
  trophyResult: TrophyDetectionResult | null;
  contactResult: ContactPointDetectionResult | null;
  landingResult: LandingDetectionResult | null;
  swingResult: SwingDetectionResult | null;
  swingV2Result: SwingDetectionResultV2 | null;
  // Loading states
  isTrophyAnalyzing: boolean;
  isContactAnalyzing: boolean;
  isLandingAnalyzing: boolean;
  isSwingAnalyzing: boolean;
  isSwingV2Analyzing: boolean;
  // Handlers
  onDetectTrophy: () => void;
  onDetectContact: () => void;
  onDetectLanding: () => void;
  onDetectSwings: () => void;
  onDetectSwingsV2: () => void;
  onImageInsight: () => void;
  // Image insight state
  isImageInsightLoading: boolean;
  hasPose: boolean;
}

/**
 * Timeline component showing key frame markers (trophy, contact, landing, swings)
 * with playhead position indicator.
 */
export function KeyFrameTimeline({
  videoRef,
  selectedProtocol,
  trophyResult,
  contactResult,
  landingResult,
  swingResult,
  swingV2Result,
  isTrophyAnalyzing,
  isContactAnalyzing,
  isLandingAnalyzing,
  isSwingAnalyzing,
  isSwingV2Analyzing,
  onDetectTrophy,
  onDetectContact,
  onDetectLanding,
  onDetectSwings,
  onDetectSwingsV2,
  onImageInsight,
  isImageInsightLoading,
  hasPose,
}: KeyFrameTimelineProps) {
  const video = videoRef.current;
  if (!video) return null;

  const duration = video.duration || 1;
  const currentTime = video.currentTime || 0;
  const currentTimePercent = (currentTime / duration) * 100;

  // Threshold for "active" state (within 0.1 seconds of key frame)
  const activeThreshold = 0.1;
  const isTrophyActive =
    trophyResult && Math.abs(currentTime - trophyResult.trophyTimestamp) < activeThreshold;
  const isContactActive =
    contactResult && Math.abs(currentTime - contactResult.contactTimestamp) < activeThreshold;
  const isLandingActive =
    landingResult && Math.abs(currentTime - landingResult.landingTimestamp) < activeThreshold;
  
  // Check if current time is near any swing
  const activeSwingIndex = swingResult?.swings.findIndex(
    swing => Math.abs(currentTime - swing.timestamp) < activeThreshold
  ) ?? -1;

  // Green glow styles for active markers
  const activeGlowStyle = {
    border: "2px solid #7ADB8F",
    boxShadow:
      "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)",
  };

  // For serve protocol: use trophy, contact, landing
  // For swings protocol: use swings + contact
  if (selectedProtocol === "serve") {
    // Get raw positions (as percentages 0-100)
    const rawPositions = {
      trophy: trophyResult ? (trophyResult.trophyTimestamp / duration) * 100 : 0,
      contact: contactResult ? (contactResult.contactTimestamp / duration) * 100 : 50,
      landing: landingResult ? (landingResult.landingTimestamp / duration) * 100 : 100,
    };

    // Sort markers by position for overlap calculation
    const markers = [
      { key: "trophy", pos: rawPositions.trophy, detected: !!trophyResult },
      { key: "contact", pos: rawPositions.contact, detected: !!contactResult },
      { key: "landing", pos: rawPositions.landing, detected: !!landingResult },
    ].sort((a, b) => a.pos - b.pos);

    // Adjust positions to prevent overlaps
    const minDistancePercent = 12;
    const adjustedPositions: Record<string, number> = {};

    markers.forEach((marker, i) => {
      if (i === 0) {
        adjustedPositions[marker.key] = marker.pos;
      } else {
        const prevKey = markers[i - 1].key;
        const prevPos = adjustedPositions[prevKey];
        const minPos = prevPos + minDistancePercent;
        adjustedPositions[marker.key] = Math.max(marker.pos, minPos);
      }
    });

    // Clamp positions to valid range
    Object.keys(adjustedPositions).forEach((key) => {
      adjustedPositions[key] = Math.min(Math.max(adjustedPositions[key], 0), 100);
    });

    return (
    <Flex gap="2" align="center">
      {/* Timeline with key frame markers */}
      <Box
        style={{
          flex: 1,
          position: "relative",
          height: "36px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Timeline track */}
        <Box
          style={{
            position: "absolute",
            left: "24px",
            right: "24px",
            height: "2px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "1px",
          }}
        />

        {/* Airborne indicator line */}
        {landingResult && (
          <Box
            style={{
              position: "absolute",
              top: "12px",
              left: `calc(24px + (100% - 48px) * ${landingResult.takeoffTimestamp / duration})`,
              width: `calc((100% - 48px) * ${(landingResult.landingTimestamp - landingResult.takeoffTimestamp) / duration})`,
              height: "3px",
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: "1.5px",
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.4)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Current position playhead */}
        <Box
          style={{
            position: "absolute",
            left: `calc(19px + (100% - 48px) * ${currentTimePercent / 100})`,
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#7ADB8F",
            boxShadow: "0 0 8px rgba(122, 219, 143, 0.8)",
            zIndex: 1,
            transition: "left 0.05s linear",
            pointerEvents: "none",
          }}
        />

        {/* Trophy marker */}
        <Tooltip
          content={
            trophyResult
              ? `Trophy at ${trophyResult.trophyTimestamp.toFixed(2)}s`
              : "Detect trophy position"
          }
        >
          <Box
            onClick={onDetectTrophy}
            style={{
              position: "absolute",
              left: `calc(10px + (100% - 48px) * ${adjustedPositions.trophy / 100})`,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: trophyResult ? "white" : "rgba(255, 255, 255, 0.2)",
              border: isTrophyActive ? activeGlowStyle.border : "2px solid white",
              boxShadow: isTrophyActive ? activeGlowStyle.boxShadow : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              zIndex: 2,
            }}
          >
            {isTrophyAnalyzing ? (
              <Spinner size="1" />
            ) : (
              <RocketIcon
                width="14"
                height="14"
                style={{ color: trophyResult ? "black" : "white" }}
              />
            )}
          </Box>
        </Tooltip>

        {/* Contact marker */}
        <Tooltip
          content={
            contactResult
              ? `Contact at ${contactResult.contactTimestamp.toFixed(2)}s`
              : "Detect contact point"
          }
        >
          <Box
            onClick={onDetectContact}
            style={{
              position: "absolute",
              left: `calc(10px + (100% - 48px) * ${adjustedPositions.contact / 100})`,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: contactResult ? "white" : "rgba(255, 255, 255, 0.2)",
              border: isContactActive ? activeGlowStyle.border : "2px solid white",
              boxShadow: isContactActive ? activeGlowStyle.boxShadow : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              zIndex: 2,
            }}
          >
            {isContactAnalyzing ? (
              <Spinner size="1" />
            ) : (
              <Crosshair2Icon
                width="14"
                height="14"
                style={{ color: contactResult ? "black" : "white" }}
              />
            )}
          </Box>
        </Tooltip>

        {/* Landing marker */}
        <Tooltip
          content={
            landingResult
              ? `Landing at ${landingResult.landingTimestamp.toFixed(2)}s`
              : "Detect landing position"
          }
        >
          <Box
            onClick={onDetectLanding}
            style={{
              position: "absolute",
              left: `calc(10px + (100% - 48px) * ${adjustedPositions.landing / 100})`,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: landingResult ? "white" : "rgba(255, 255, 255, 0.2)",
              border: isLandingActive ? activeGlowStyle.border : "2px solid white",
              boxShadow: isLandingActive ? activeGlowStyle.boxShadow : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              zIndex: 2,
            }}
          >
            {isLandingAnalyzing ? (
              <Spinner size="1" />
            ) : (
              <ArrowDownIcon
                width="14"
                height="14"
                style={{ color: landingResult ? "black" : "white" }}
              />
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Frame Insight Button */}
      <Tooltip content="Frame Insight – Analyze this frame with AI">
        <Button
          onClick={onImageInsight}
          disabled={isImageInsightLoading || !hasPose}
          className={buttonStyles.actionButtonSquare}
          size="2"
          style={{
            opacity: hasPose ? 1 : 0.5,
          }}
        >
          {isImageInsightLoading ? (
            <Spinner size="1" />
          ) : (
            <CameraIcon width="16" height="16" />
          )}
        </Button>
      </Tooltip>
    </Flex>
    );
  }

  // Swings protocol (V1 or V2): show swing markers + contact point
  // Build unified swing list from either V1 or V2 result
  const swingMarkers: Array<{ timestamp: number; label: string; color: string }> = [];
  
  if (selectedProtocol === "swings" && swingResult) {
    swingResult.swings.forEach((swing, i) => {
      swingMarkers.push({
        timestamp: swing.timestamp,
        label: `Swing ${i + 1} at ${swing.timestamp.toFixed(2)}s (${swing.velocityKmh >= 20 ? `${swing.velocityKmh.toFixed(0)} km/h` : "N/A"})`,
        color: "#FFD93D", // Yellow for V1
      });
    });
  } else if (selectedProtocol === "swings-v2" && swingV2Result) {
    swingV2Result.swings.forEach((swing, i) => {
      swingMarkers.push({
        timestamp: swing.timestamp,
        label: `Swing ${i + 1} at ${swing.timestamp.toFixed(2)}s (${swing.prominence.toFixed(1)}x prominence)`,
        color: "#FF8C00", // Orange for V2
      });
    });
  }
  
  const contactPos = contactResult ? (contactResult.contactTimestamp / duration) * 100 : -1;

  // Build all markers for positioning
  const allMarkers: { key: string; pos: number; detected: boolean }[] = [];
  
  // Add swings
  swingMarkers.forEach((swing, i) => {
    allMarkers.push({
      key: `swing-${i}`,
      pos: (swing.timestamp / duration) * 100,
      detected: true,
    });
  });
  
  // Add contact if detected
  if (contactResult) {
    allMarkers.push({
      key: "contact",
      pos: contactPos,
      detected: true,
    });
  }

  // Sort by position
  allMarkers.sort((a, b) => a.pos - b.pos);

  // Adjust positions to prevent overlaps
  const minDistancePercent = 8; // Smaller distance for more markers
  const adjustedPositions: Record<string, number> = {};

  allMarkers.forEach((marker, i) => {
    if (i === 0) {
      adjustedPositions[marker.key] = marker.pos;
    } else {
      const prevKey = allMarkers[i - 1].key;
      const prevPos = adjustedPositions[prevKey];
      const minPos = prevPos + minDistancePercent;
      adjustedPositions[marker.key] = Math.max(marker.pos, minPos);
    }
  });

  // Clamp positions to valid range
  Object.keys(adjustedPositions).forEach((key) => {
    adjustedPositions[key] = Math.min(Math.max(adjustedPositions[key], 0), 100);
  });
  
  // Check if analyzing
  const isAnalyzing = selectedProtocol === "swings" ? isSwingAnalyzing : isSwingV2Analyzing;

  return (
    <Flex gap="2" align="center">
      {/* Timeline with swing markers */}
      <Box
        style={{
          flex: 1,
          position: "relative",
          height: "36px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Timeline track */}
        <Box
          style={{
            position: "absolute",
            left: "24px",
            right: "24px",
            height: "2px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "1px",
          }}
        />

        {/* Current position playhead */}
        <Box
          style={{
            position: "absolute",
            left: `calc(19px + (100% - 48px) * ${currentTimePercent / 100})`,
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#7ADB8F",
            boxShadow: "0 0 8px rgba(122, 219, 143, 0.8)",
            zIndex: 1,
            transition: "left 0.05s linear",
            pointerEvents: "none",
          }}
        />

        {/* Swing markers */}
        {swingMarkers.map((swing, i) => {
          const isSwingActive = activeSwingIndex === i;
          const pos = adjustedPositions[`swing-${i}`] ?? (swing.timestamp / duration) * 100;
          
          return (
            <Tooltip
              key={`swing-${i}`}
              content={swing.label}
            >
              <Box
                onClick={() => {
                  if (video) video.currentTime = swing.timestamp;
                }}
                style={{
                  position: "absolute",
                  left: `calc(10px + (100% - 48px) * ${pos / 100})`,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: swing.color,
                  border: isSwingActive ? activeGlowStyle.border : `2px solid ${swing.color}`,
                  boxShadow: isSwingActive ? activeGlowStyle.boxShadow : `0 0 8px ${swing.color}80`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  zIndex: 2,
                }}
              >
                <LightningBoltIcon
                  width="12"
                  height="12"
                  style={{ color: "black" }}
                />
              </Box>
            </Tooltip>
          );
        })}

        {/* Contact marker (if detected) */}
        {contactResult && (
          <Tooltip
            content={`Contact at ${contactResult.contactTimestamp.toFixed(2)}s`}
          >
            <Box
              onClick={onDetectContact}
              style={{
                position: "absolute",
                left: `calc(10px + (100% - 48px) * ${(adjustedPositions.contact ?? contactPos) / 100})`,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "white",
                border: isContactActive ? activeGlowStyle.border : "2px solid white",
                boxShadow: isContactActive ? activeGlowStyle.boxShadow : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                zIndex: 2,
              }}
            >
              {isContactAnalyzing ? (
                <Spinner size="1" />
              ) : (
                <Crosshair2Icon
                  width="14"
                  height="14"
                  style={{ color: "black" }}
                />
              )}
            </Box>
          </Tooltip>
        )}

        {/* Show loading state when no swings yet */}
        {isAnalyzing && swingMarkers.length === 0 && (
          <Box
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Spinner size="1" />
          </Box>
        )}
      </Box>

      {/* Frame Insight Button */}
      <Tooltip content="Frame Insight – Analyze this frame with AI">
        <Button
          onClick={onImageInsight}
          disabled={isImageInsightLoading || !hasPose}
          className={buttonStyles.actionButtonSquare}
          size="2"
          style={{
            opacity: hasPose ? 1 : 0.5,
          }}
        >
          {isImageInsightLoading ? (
            <Spinner size="1" />
          ) : (
            <CameraIcon width="16" height="16" />
          )}
        </Button>
      </Tooltip>
    </Flex>
  );
}

