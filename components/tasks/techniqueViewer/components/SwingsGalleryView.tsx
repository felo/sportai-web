"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { GridIcon } from "@radix-ui/react-icons";
import type { ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import type { ViewMode } from "../types";

interface SwingsGalleryViewProps {
  protocolEvents: ProtocolEvent[];
  swingCount: number;
  viewerRef: React.RefObject<ViewerActions | null>;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Gallery view showing all detected swings as cards.
 * Clicking a swing card navigates to that moment in the player.
 */
export function SwingsGalleryView({
  protocolEvents,
  swingCount,
  viewerRef,
  onViewModeChange,
}: SwingsGalleryViewProps) {
  const swingEvents = protocolEvents.filter(
    (e) => e.protocolId === "swing-detection-v3"
  );

  return (
    <Box
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px",
        backgroundColor: "var(--gray-1)",
      }}
    >
      {/* Gallery Header */}
      {swingCount > 0 && (
        <Flex align="center" justify="between" style={{ marginBottom: "20px" }}>
          <Flex align="center" gap="3">
            <Text size="4" weight="bold" style={{ color: "white" }}>
              Detected Swings
            </Text>
            <Box
              style={{
                backgroundColor: "var(--blue-9)",
                color: "white",
                padding: "2px 10px",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              {swingCount}
            </Box>
          </Flex>
          <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Click a swing to view in full player
          </Text>
        </Flex>
      )}

      {/* Swing Cards Grid */}
      <Flex wrap="wrap" gap="4" justify="start">
        {swingEvents.map((event, index) => {
          const metadata = event.metadata as Record<string, unknown>;
          const confidence = metadata?.confidence as number | undefined;
          const velocityKmh = metadata?.velocityKmh as number | undefined;
          const clipDuration = metadata?.clipDuration as number | undefined;

          return (
            <Box
              key={event.id}
              style={{
                width: "200px",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                backgroundColor: "rgba(30, 30, 30, 0.9)",
                border: "2px solid var(--blue-a5)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
              onClick={() => {
                viewerRef.current?.seekTo(event.startTime);
                onViewModeChange("player");
              }}
            >
              {/* Swing Preview */}
              <Box
                style={{
                  height: "100px",
                  backgroundColor: "var(--blue-a3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <Box
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, var(--blue-a4) 0%, transparent 50%)",
                  }}
                />
                <Flex direction="column" align="center" gap="1">
                  <Text
                    size="5"
                    weight="bold"
                    style={{ color: "var(--blue-9)" }}
                  >
                    Swing
                  </Text>
                  <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {event.startTime.toFixed(2)}s - {event.endTime.toFixed(2)}s
                  </Text>
                </Flex>
                {/* Swing number badge */}
                <Box
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    backgroundColor: "var(--blue-9)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  #{index + 1}
                </Box>
              </Box>

              {/* Swing Info */}
              <Box style={{ padding: "12px" }}>
                <Flex
                  justify="between"
                  align="center"
                  style={{ marginBottom: "8px" }}
                >
                  <Text size="2" weight="medium" style={{ color: "white" }}>
                    {event.label.split(" ").slice(0, 2).join(" ")}
                  </Text>
                  {confidence !== undefined && (
                    <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {(confidence * 100).toFixed(0)}%
                    </Text>
                  )}
                </Flex>
                <Flex gap="3">
                  {velocityKmh !== undefined && (
                    <Flex direction="column">
                      <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Speed
                      </Text>
                      <Text
                        size="2"
                        weight="medium"
                        style={{
                          color:
                            velocityKmh >= 20
                              ? "var(--blue-9)"
                              : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {velocityKmh >= 20 ? `${velocityKmh.toFixed(0)} km/h` : "N/A"}
                      </Text>
                    </Flex>
                  )}
                  {clipDuration !== undefined && (
                    <Flex direction="column">
                      <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Duration
                      </Text>
                      <Text size="2" weight="medium" style={{ color: "white" }}>
                        {clipDuration.toFixed(1)}s
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Box>
            </Box>
          );
        })}
      </Flex>

      {/* Empty State */}
      {swingCount === 0 && (
        <Flex align="center" justify="center" style={{ height: "300px" }}>
          <Flex direction="column" align="center" gap="3">
            <GridIcon
              width={48}
              height={48}
              style={{ color: "rgba(255,255,255,0.2)" }}
            />
            <Text size="2" style={{ color: "rgba(255,255,255,0.4)" }}>
              No swings detected yet
            </Text>
            <Text size="1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Enable Swing Detection V3 in settings and preprocess the video
            </Text>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
