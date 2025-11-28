"use client";

import { RefObject } from "react";
import { Box, Flex, Heading, Badge, Text, Tooltip, Card } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";
import { CONFIG } from "../constants";
import { StatisticsResult, ActiveEventTooltip } from "../types";
import { formatSwingType, formatDuration, getPlayerIndex } from "../utils";

interface RallyTimelineProps {
  result: StatisticsResult;
  selectedRallyIndex: number;
  currentTime: number;
  activeEventTooltip: ActiveEventTooltip | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  rallyTimelineRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function RallyTimeline({
  result,
  selectedRallyIndex,
  currentTime,
  activeEventTooltip,
  videoRef,
  rallyTimelineRef,
  onClose,
}: RallyTimelineProps) {
  const [rallyStart, rallyEnd] = result.rallies[selectedRallyIndex];
  const rallyDuration = rallyEnd - rallyStart;

  const rallyBounces = result.ball_bounces.filter(
    b => b.timestamp >= rallyStart && b.timestamp <= rallyEnd
  );

  const rallySwings = result.players
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

  return (
    <Box style={{ animation: "slideDown 0.5s ease-out", overflow: "hidden" }}>
      <Card style={{ border: "1px solid var(--mint-9)", marginBottom: "var(--space-3)" }}>
        <Flex direction="column" gap="2" p="3">
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <Heading size="4" weight="medium">
                Rally {selectedRallyIndex + 1}
              </Heading>
              <Badge color="mint">{formatDuration(rallyDuration)}</Badge>
              <Text size="2" color="gray">
                {rallySwings.length} swings • {rallyBounces.length} bounces
              </Text>
            </Flex>
            <Flex align="center" gap="3">
              <Flex gap="3">
                <Flex align="center" gap="1">
                  <Box style={{ width: 4, height: 12, backgroundColor: "var(--blue-9)", borderRadius: 2 }} />
                  <Text size="1" color="gray">Swing</Text>
                </Flex>
                <Flex align="center" gap="1">
                  <Box style={{ width: 10, height: 10, backgroundColor: "var(--orange-9)", borderRadius: "50%" }} />
                  <Text size="1" color="gray">Floor</Text>
                </Flex>
                <Flex align="center" gap="1">
                  <Box style={{ width: 10, height: 10, backgroundColor: "var(--purple-9)", borderRadius: "50%" }} />
                  <Text size="1" color="gray">Swing</Text>
                </Flex>
              </Flex>
              <IconButton
                icon={<Cross2Icon />}
                variant="ghost"
                size="1"
                onClick={onClose}
                ariaLabel="Close rally details"
              />
            </Flex>
          </Flex>

          <Box
            ref={rallyTimelineRef as React.RefObject<HTMLDivElement>}
            onClick={handleTimelineClick}
            style={{
              height: "44px",
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-3)",
              position: "relative",
              overflow: "visible",
              marginTop: "16px",
              cursor: "pointer",
            }}
          >
            {/* Swings */}
            {rallySwings.map((swing, idx) => {
              const relativeTime = swing.ball_hit.timestamp - rallyStart;
              const position = (relativeTime / rallyDuration) * 100;
              const playerIndex = getPlayerIndex(result.players, swing.player_id);
              const isNearPlayhead = Math.abs(currentTime - swing.ball_hit.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;

              return (
                <Tooltip
                  key={`swing-${idx}`}
                  content={`P${playerIndex} ${formatSwingType(swing.swing_type)} @ ${formatDuration(swing.ball_hit.timestamp)}`}
                >
                  <Box
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      seekTo(swing.ball_hit.timestamp);
                    }}
                    onMouseEnter={(e) => {
                      const inner = e.currentTarget.querySelector("[data-swing-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scaleX(1.5)";
                        inner.style.boxShadow = "0 0 12px rgba(59, 130, 246, 0.8)";
                      }
                    }}
                    onMouseLeave={(e) => {
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
                      zIndex: 5,
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
                        transform: "scaleX(1)",
                      }}
                    />
                  </Box>
                </Tooltip>
              );
            })}

            {/* Bounces */}
            {rallyBounces.map((bounce, idx) => {
              const relativeTime = bounce.timestamp - rallyStart;
              const position = (relativeTime / rallyDuration) * 100;
              const isNearPlayhead = Math.abs(currentTime - bounce.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;
              const glowColor = bounce.type === "floor" ? "rgba(245, 158, 11, 0.8)" : "rgba(168, 85, 247, 0.8)";

              return (
                <Tooltip key={`bounce-${idx}`} content={`${bounce.type} bounce @ ${formatDuration(bounce.timestamp)}`}>
                  <Box
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      seekTo(bounce.timestamp);
                    }}
                    onMouseEnter={(e) => {
                      const inner = e.currentTarget.querySelector("[data-bounce-inner]") as HTMLElement;
                      if (inner) {
                        inner.style.transform = "scale(1.5)";
                        inner.style.boxShadow = `0 0 16px ${glowColor}`;
                      }
                    }}
                    onMouseLeave={(e) => {
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
                      zIndex: 10,
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
                        backgroundColor: bounce.type === "floor" ? "var(--orange-9)" : "var(--purple-9)",
                        border: "2px solid white",
                        boxShadow: isNearPlayhead ? `0 0 16px ${glowColor}` : "none",
                        transition: "all 0.15s ease",
                        transform: "scale(1)",
                      }}
                    />
                  </Box>
                </Tooltip>
              );
            })}

            {/* Playhead */}
            {currentTime >= rallyStart && currentTime <= rallyEnd && (
              <>
                <Box
                  style={{
                    position: "absolute",
                    left: `${((currentTime - rallyStart) / rallyDuration) * 100}%`,
                    top: 0,
                    width: "2px",
                    height: "100%",
                    backgroundColor: "var(--red-9)",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                />
                <Box
                  style={{
                    position: "absolute",
                    left: `${((currentTime - rallyStart) / rallyDuration) * 100}%`,
                    top: "-20px",
                    transform: "translateX(-50%)",
                    backgroundColor: "var(--red-9)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                    zIndex: 21,
                    pointerEvents: "none",
                  }}
                >
                  {formatDuration(currentTime)}
                </Box>
              </>
            )}

            {/* Active event tooltip */}
            {activeEventTooltip && rallyTimelineRef.current && (() => {
              const rect = rallyTimelineRef.current!.getBoundingClientRect();
              const leftPos = rect.left + (rect.width * activeEventTooltip.position) / 100;
              const topPos = rect.top - 50;

              return (
                <Box
                  style={{
                    position: "fixed",
                    left: `${leftPos}px`,
                    top: `${topPos}px`,
                    transform: "translateX(-50%)",
                    backgroundColor: "var(--blue-9)",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-2)",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    zIndex: 9999,
                    pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    animation: "fadeIn 0.2s ease-out",
                  }}
                >
                  {activeEventTooltip.text}
                </Box>
              );
            })()}
          </Box>
        </Flex>
      </Card>
    </Box>
  );
}

