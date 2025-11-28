"use client";

import { RefObject } from "react";
import { Flex, Heading, Badge, Text, Card } from "@radix-ui/themes";
import { Highlight } from "../types";
import { formatDuration } from "../utils";

interface HighlightsCardProps {
  highlights: Highlight[];
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function HighlightsCard({ highlights, videoRef }: HighlightsCardProps) {
  if (highlights.length === 0) return null;

  const handleHighlightClick = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4" weight="medium">
          Highlights
        </Heading>
        <Flex direction="column" gap="2">
          {highlights.slice(0, 10).map((highlight, i) => (
            <Flex
              key={i}
              justify="between"
              align="center"
              p="2"
              onClick={() => handleHighlightClick(highlight.start.timestamp)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--gray-4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--gray-3)";
              }}
              style={{
                backgroundColor: "var(--gray-3)",
                borderRadius: "var(--radius-2)",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              <Flex align="center" gap="2">
                <Badge
                  color={highlight.type.includes("longest") ? "blue" : "orange"}
                  variant="soft"
                >
                  {highlight.type.replace(/_/g, " ")}
                </Badge>
                <Text size="2">{formatDuration(highlight.duration)}</Text>
              </Flex>
              <Text size="2" color="gray">
                @ {formatDuration(highlight.start.timestamp)}
              </Text>
            </Flex>
          ))}
        </Flex>
        {highlights.length > 10 && (
          <Text size="1" color="gray" align="center">
            +{highlights.length - 10} more highlights
          </Text>
        )}
      </Flex>
    </Card>
  );
}

