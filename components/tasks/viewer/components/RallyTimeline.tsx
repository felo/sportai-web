"use client";

import { RefObject, useState, useRef, useCallback } from "react";
import { Box, Flex, Heading, Badge, Text, Switch, Tooltip } from "@radix-ui/themes";
import { SpeakerLoudIcon } from "@radix-ui/react-icons";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CONFIG, FEATURE_FLAGS, OVERLAY_COLORS } from "../constants";
import { StatisticsResult, BallBounce, Swing } from "../types";
import { formatSwingType, formatDuration, getPlayerIndex } from "../utils";
import { AudioWaveform } from "./AudioWaveform";
import { DraggablePlayhead } from "./DraggablePlayhead";

// Custom tooltip that matches the video overlay swing cards
interface SwingTooltipProps {
  swing: Swing & { player_id: number };
  playerName: string;
  position: number; // percentage
  visible: boolean;
}

function SwingTooltip({ swing, playerName, position, visible }: SwingTooltipProps) {
  if (!visible) return null;
  
  const speed = Math.round(swing.ball_speed || 0);
  const swingType = formatSwingType(swing.swing_type);
  const { velocity } = OVERLAY_COLORS;
  
  return (
    <Box
      style={{
        position: "absolute",
        left: `${position}%`,
        bottom: "calc(100% + 12px)",
        transform: "translateX(-50%)",
        zIndex: 1000,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Tooltip content */}
      <Box
        style={{
          backgroundColor: velocity.backgroundColor,
          border: `2px solid ${velocity.borderColor}`,
          borderRadius: velocity.borderRadius,
          padding: "8px 12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        {/* Player name and swing type */}
        <Text
          size="1"
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            display: "block",
            marginBottom: "2px",
          }}
        >
          {playerName} · {swingType}
        </Text>
        
        {/* Speed */}
        {speed > 0 && (
          <Flex align="baseline" gap="1">
            <Text
              size="4"
              weight="bold"
              style={{ color: velocity.textColor }}
            >
              {speed}
            </Text>
            <Text
              size="2"
              style={{ color: velocity.unitColor }}
            >
              km/h
            </Text>
          </Flex>
        )}
      </Box>
      
      {/* Arrow pointing down */}
      <Box
        style={{
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `8px solid ${velocity.borderColor}`,
        }}
      />
    </Box>
  );
}

// Custom tooltip for bounces
interface BounceTooltipProps {
  bounce: BallBounce;
  position: number;
  visible: boolean;
}

function BounceTooltip({ bounce, position, visible }: BounceTooltipProps) {
  if (!visible) return null;
  
  const { velocity } = OVERLAY_COLORS;
  const bounceLabel = bounce.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <Box
      style={{
        position: "absolute",
        left: `${position}%`,
        bottom: "calc(100% + 12px)",
        transform: "translateX(-50%)",
        zIndex: 1000,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <Box
        style={{
          backgroundColor: velocity.backgroundColor,
          border: `2px solid ${velocity.borderColor}`,
          borderRadius: velocity.borderRadius,
          padding: "6px 10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        <Text size="2" style={{ color: velocity.textColor }}>
          {bounceLabel}
        </Text>
        <Text size="1" style={{ color: "rgba(255,255,255,0.6)", marginLeft: "6px" }}>
          {formatDuration(bounce.timestamp)}
        </Text>
      </Box>
      
      <Box
        style={{
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${velocity.borderColor}`,
        }}
      />
    </Box>
  );
}

interface RallyTimelineProps {
  result: StatisticsResult;
  selectedRallyIndex: number;
  currentTime: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  rallyTimelineRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  enhancedBallBounces?: BallBounce[];
  playerDisplayNames?: Record<number, string>;
}

export function RallyTimeline({
  result,
  selectedRallyIndex,
  currentTime,
  videoRef,
  rallyTimelineRef,
  onClose,
  enhancedBallBounces,
  playerDisplayNames = {},
}: RallyTimelineProps) {
  const isMobile = useIsMobile();
  const [showAudioWaveform, setShowAudioWaveform] = useState(false);
  const [hoveredSwingIdx, setHoveredSwingIdx] = useState<number | null>(null);
  const [hoveredBounceIdx, setHoveredBounceIdx] = useState<number | null>(null);
  
  const rallies = result.rallies || [];
  const players = result.players || [];
  const [rallyStart, rallyEnd] = rallies[selectedRallyIndex] || [0, 0];
  const rallyDuration = rallyEnd - rallyStart;

  // Use enhanced bounces if provided, otherwise fall back to result.ball_bounces
  const allBounces = enhancedBallBounces || result.ball_bounces || [];
  const rallyBounces = allBounces.filter(
    b => b.timestamp >= rallyStart && b.timestamp <= rallyEnd
  );

  const rallySwings = players
    .filter(p => p.swing_count >= 10)
    .flatMap(player =>
      player.swings
        .filter(s => s.ball_hit.timestamp >= rallyStart && s.ball_hit.timestamp <= rallyEnd)
        .map(s => ({ ...s, player_id: player.player_id }))
    )
    .sort((a, b) => a.ball_hit.timestamp - b.ball_hit.timestamp);

  const seekTo = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = rallyStart + percentage * rallyDuration;
    seekTo(targetTime);
  };

  // Timeline ref for drag operations
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Convert percentage to time (for drag operations)
  const positionToTime = useCallback((percentage: number): number => {
    return rallyStart + percentage * rallyDuration;
  }, [rallyStart, rallyDuration]);

  // Playhead position as percentage
  const playheadPosition = ((currentTime - rallyStart) / rallyDuration) * 100;
  const isPlayheadVisible = currentTime >= rallyStart && currentTime <= rallyEnd;
  
  // Elapsed time within the rally
  const elapsedInRally = Math.max(0, Math.min(currentTime - rallyStart, rallyDuration));

  return (
    <Box style={{ animation: "slideDown 0.5s ease-out", overflow: "visible" }}>
      <Box style={{ marginBottom: "4px", padding: "6px 0", overflow: "visible" }}>
        <Flex direction="column" gap="0" p="0" style={{ overflow: "visible" }}>
          <Flex justify="between" align="center">
            <Flex align="center" gap="1">
              <Heading size="1" weight="medium">
                Rally {selectedRallyIndex + 1}
              </Heading>
              <Badge color="mint" size="1">{formatDuration(rallyDuration)}</Badge>
            </Flex>
            <Flex align="center" gap="2">
              {/* Compact legend */}
              <Flex align="center" gap="2">
                <Flex align="center" gap="1">
                  <Box style={{ width: 3, height: 10, backgroundColor: "var(--blue-9)", borderRadius: 2 }} />
                  <Text size="1" color="gray">Swing</Text>
                </Flex>
                {/* Bounce legend - hidden on mobile */}
                {!isMobile && (
                  <Flex align="center" gap="1">
                    <Box style={{ width: 8, height: 8, backgroundColor: "var(--yellow-9)", borderRadius: "50%" }} />
                    <Text size="1" color="gray">Bounce</Text>
                  </Flex>
                )}
              </Flex>
              {FEATURE_FLAGS.AUDIO_ANALYSIS_ENABLED && (
                <Tooltip content="Show audio waveform (play video to analyze)">
                  <Flex align="center" gap="1" style={{ cursor: "pointer" }} onClick={() => setShowAudioWaveform(!showAudioWaveform)}>
                    <SpeakerLoudIcon style={{ width: 14, height: 14, color: showAudioWaveform ? "var(--pink-9)" : "var(--gray-9)" }} />
                    <Switch size="1" checked={showAudioWaveform} onCheckedChange={setShowAudioWaveform} />
                  </Flex>
                </Tooltip>
              )}
            </Flex>
          </Flex>

          {/* Wrapper for timeline with overflow visible for playhead */}
          <Box
            style={{
              position: "relative",
              marginTop: "4px",
              overflow: "visible",
            }}
          >
            <Box
              ref={timelineContainerRef}
              onClick={handleTimelineClick}
              style={{
                height: "32px",
                backgroundColor: "var(--gray-3)",
                borderRadius: "4px",
                position: "relative",
                overflow: "visible",
                cursor: "pointer",
              }}
            >
            {/* Audio Waveform (behind other elements) */}
            {FEATURE_FLAGS.AUDIO_ANALYSIS_ENABLED && showAudioWaveform && (
              <AudioWaveform
                videoRef={videoRef}
                startTime={rallyStart}
                endTime={rallyEnd}
                height={32}
              />
            )}

            {/* Swings */}
            {rallySwings.map((swing, idx) => {
              const relativeTime = swing.ball_hit.timestamp - rallyStart;
              const position = (relativeTime / rallyDuration) * 100;
              const playerIndex = getPlayerIndex(players, swing.player_id);
              const playerName = playerDisplayNames[swing.player_id] || `P${playerIndex}`;
              const isNearPlayhead = Math.abs(currentTime - swing.ball_hit.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;
              const isHovered = hoveredSwingIdx === idx;

              return (
                <Box key={`swing-${idx}`}>
                  {/* Custom Tooltip */}
                  <SwingTooltip
                    swing={swing}
                    playerName={playerName}
                    position={position}
                    visible={isHovered}
                  />
                  
                  {/* Swing marker */}
                  <Box
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      seekTo(swing.ball_hit.timestamp);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredSwingIdx(idx);
                      setHoveredBounceIdx(null);
                      const inner = e.currentTarget.querySelector("[data-swing-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scaleX(1.5)";
                        inner.style.boxShadow = "0 0 12px rgba(59, 130, 246, 0.8)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      setHoveredSwingIdx(null);
                      const inner = e.currentTarget.querySelector("[data-swing-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scaleX(1)";
                        inner.style.boxShadow = isNearPlayhead ? "0 0 12px rgba(59, 130, 246, 0.8)" : "none";
                      }
                    }}
                    style={{
                      position: "absolute",
                      left: `${position}%`,
                      top: 0,
                      width: "16px",
                      height: "100%",
                      transform: "translateX(-50%)",
                      cursor: "pointer",
                      zIndex: isHovered ? 100 : 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      data-swing-inner=""
                      style={{
                        width: "4px",
                        height: "70%",
                        backgroundColor: "var(--blue-9)",
                        borderRadius: "2px",
                        boxShadow: isNearPlayhead ? "0 0 12px rgba(59, 130, 246, 0.8)" : "none",
                        transition: "all 0.15s ease",
                        transform: isNearPlayhead ? "scaleX(1.5)" : "scaleX(1)",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}

            {/* Bounces - hidden on mobile */}
            {!isMobile && rallyBounces.map((bounce, idx) => {
              const relativeTime = bounce.timestamp - rallyStart;
              const position = (relativeTime / rallyDuration) * 100;
              const isNearPlayhead = Math.abs(currentTime - bounce.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;
              const isHovered = hoveredBounceIdx === idx;
              
              // All bounces are yellow
              const bounceColor = "var(--yellow-9)";
              const glowColor = "rgba(234, 179, 8, 0.8)";

              return (
                <Box key={`bounce-${idx}`}>
                  {/* Custom Tooltip */}
                  <BounceTooltip
                    bounce={bounce}
                    position={position}
                    visible={isHovered}
                  />
                  
                  {/* Bounce marker */}
                  <Box
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      seekTo(bounce.timestamp);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredBounceIdx(idx);
                      setHoveredSwingIdx(null);
                      const inner = e.currentTarget.querySelector("[data-bounce-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scale(1.5)";
                        inner.style.boxShadow = `0 0 16px ${glowColor}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      setHoveredBounceIdx(null);
                      const inner = e.currentTarget.querySelector("[data-bounce-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scale(1)";
                        inner.style.boxShadow = isNearPlayhead ? `0 0 16px ${glowColor}` : "none";
                      }
                    }}
                    style={{
                      position: "absolute",
                      left: `${position}%`,
                      top: 0,
                      width: "24px",
                      height: "100%",
                      transform: "translateX(-50%)",
                      cursor: "pointer",
                      zIndex: isHovered ? 100 : 5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      data-bounce-inner=""
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        backgroundColor: bounceColor,
                        border: "2px solid white",
                        boxShadow: isNearPlayhead ? `0 0 16px ${glowColor}` : "none",
                        transition: "all 0.15s ease",
                        transform: isNearPlayhead ? "scale(1.5)" : "scale(1)",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}

            {/* Playhead - draggable */}
            {isPlayheadVisible && (
              <DraggablePlayhead
                currentTime={currentTime}
                position={playheadPosition}
                onSeek={seekTo}
                positionToTime={positionToTime}
                timelineRef={timelineContainerRef}
                displayTime={elapsedInRally}
              />
            )}

            </Box>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

