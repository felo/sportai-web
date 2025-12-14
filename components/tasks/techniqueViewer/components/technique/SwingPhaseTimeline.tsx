"use client";

import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import { getPhaseColor, TECHNIQUE_COLORS } from "./techniqueUtils";

interface SwingPhaseTimelineProps {
  swingEvent: ProtocolEvent;
  relatedEvents: ProtocolEvent[];
  totalDuration: number;
}

interface PhaseMarker {
  id: string;
  label: string;
  icon: string;
  time: number;
  color: string;
  description: string;
}

/**
 * Visual timeline showing swing phases and key moments
 */
export function SwingPhaseTimeline({
  swingEvent,
  relatedEvents,
  totalDuration,
}: SwingPhaseTimelineProps) {
  const startTime = swingEvent.startTime;
  const endTime = swingEvent.endTime;
  const duration = endTime - startTime;
  
  // Build phase markers from related events
  const markers: PhaseMarker[] = [];
  
  // Loading/Preparation marker
  const loadingEvent = relatedEvents.find(e => e.protocolId === "loading-position");
  const prepEvent = relatedEvents.find(e => e.protocolId === "serve-preparation");
  if (loadingEvent) {
    markers.push({
      id: "loading",
      label: "Loading",
      icon: "🚀",
      time: loadingEvent.startTime,
      color: "#F59E0B",
      description: "Peak backswing position",
    });
  } else if (prepEvent) {
    markers.push({
      id: "prep",
      label: "Prep",
      icon: "🚀",
      time: prepEvent.startTime,
      color: "#F59E0B",
      description: "Serve preparation",
    });
  }
  
  // Contact point marker
  const contactEvent = relatedEvents.find(e => e.protocolId === "tennis-contact-point");
  if (contactEvent) {
    markers.push({
      id: "contact",
      label: "Contact",
      icon: "🎯",
      time: contactEvent.startTime,
      color: "#FFE66D",
      description: "Ball contact point",
    });
  }
  
  // Follow-through marker
  const followEvent = relatedEvents.find(e => e.protocolId === "serve-follow-through");
  if (followEvent) {
    markers.push({
      id: "follow",
      label: "Follow",
      icon: "✅",
      time: followEvent.startTime,
      color: "#95E1D3",
      description: "Follow-through position",
    });
  }
  
  // Calculate position as percentage within the swing duration
  const getPosition = (time: number) => {
    const relative = time - startTime;
    return Math.max(0, Math.min(100, (relative / duration) * 100));
  };

  return (
    <Box style={{ padding: "0 8px" }}>
      {/* Phase Labels */}
      <Flex justify="between" style={{ marginBottom: 4 }}>
        <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Start
        </Text>
        <Text size="1" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
          {duration.toFixed(2)}s
        </Text>
        <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
          End
        </Text>
      </Flex>
      
      {/* Timeline Track */}
      <Box
        style={{
          position: "relative",
          height: 40,
          backgroundColor: "var(--gray-a3)",
          borderRadius: 8,
          overflow: "visible",
        }}
      >
        {/* Gradient fill showing swing intensity */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 8,
            background: `linear-gradient(
              90deg,
              ${getPhaseColor("loading")}44 0%,
              ${getPhaseColor("backswing")}44 25%,
              ${getPhaseColor("forward")}88 50%,
              ${getPhaseColor("contact")}CC 60%,
              ${getPhaseColor("follow-through")}88 75%,
              ${getPhaseColor("recovery")}44 100%
            )`,
          }}
        />
        
        {/* Phase markers */}
        {markers.map((marker) => {
          const position = getPosition(marker.time);
          
          return (
            <Tooltip
              key={marker.id}
              content={
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">{marker.label}</Text>
                  <Text size="1" color="gray">{marker.description}</Text>
                  <Text size="1" style={{ fontFamily: "monospace" }}>
                    {marker.time.toFixed(2)}s
                  </Text>
                </Flex>
              }
            >
              <Box
                style={{
                  position: "absolute",
                  left: `${position}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: marker.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: `0 0 12px ${marker.color}88`,
                  border: "2px solid rgba(255,255,255,0.3)",
                  zIndex: 10,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.15)";
                  e.currentTarget.style.boxShadow = `0 0 20px ${marker.color}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%)";
                  e.currentTarget.style.boxShadow = `0 0 12px ${marker.color}88`;
                }}
              >
                <span style={{ fontSize: 12 }}>{marker.icon}</span>
              </Box>
            </Tooltip>
          );
        })}
        
        {/* Start marker */}
        <Box
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 4,
            height: 24,
            backgroundColor: "var(--gray-11)",
            borderRadius: 2,
          }}
        />
        
        {/* End marker */}
        <Box
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 4,
            height: 24,
            backgroundColor: "var(--gray-11)",
            borderRadius: 2,
          }}
        />
      </Box>
      
      {/* Marker legend */}
      {markers.length > 0 && (
        <Flex gap="3" justify="center" style={{ marginTop: 8 }}>
          {markers.map((marker) => (
            <Flex key={marker.id} align="center" gap="1">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: marker.color,
                }}
              />
              <Text size="1" color="gray">{marker.label}</Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}




