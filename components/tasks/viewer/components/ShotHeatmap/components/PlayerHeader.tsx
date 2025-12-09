"use client";

import { Box, Flex, Text, Heading, Badge } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { NICKNAME_SHIMMER_KEYFRAMES } from "../constants";

interface PlayerHeaderProps {
  displayName: string;
  portrait?: string;
  nickname?: string;
  nicknameLoading?: boolean;
  totalShots: number;
  countLabel: string;
}

/**
 * Player header with portrait, name, nickname and shot count badge
 */
export function PlayerHeader({
  displayName,
  portrait,
  nickname,
  nicknameLoading,
  totalShots,
  countLabel,
}: PlayerHeaderProps) {
  // Get initials for fallback avatar
  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: NICKNAME_SHIMMER_KEYFRAMES }} />

      <Flex justify="between" align="start" gap="3">
        <Flex align="center" gap="3">
          {/* Player Portrait */}
          <Box
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--accent-9)",
              backgroundColor: portrait ? "transparent" : "var(--accent-9)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          >
            {portrait ? (
              <img
                src={portrait}
                alt={displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            ) : (
              <Text size="4" weight="bold" style={{ color: "white" }}>
                {initials}
              </Text>
            )}
          </Box>

          {/* Name & Nickname - Always two lines */}
          <Flex direction="column" gap="0" style={{ minWidth: 0, flex: 1 }}>
            <Box style={{ height: 22, display: "flex", alignItems: "center" }}>
              <Heading
                size="3"
                weight="medium"
                style={{
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayName}
              </Heading>
            </Box>
            <Box style={{ height: 20, display: "flex", alignItems: "center" }}>
              {nicknameLoading ? (
                <Box
                  style={{
                    height: 14,
                    width: 100,
                    borderRadius: "var(--radius-2)",
                    background:
                      "linear-gradient(90deg, var(--gray-4) 25%, var(--gray-3) 50%, var(--gray-4) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "nicknameShimmer 1.5s ease-in-out infinite",
                  }}
                />
              ) : nickname ? (
                <Text
                  size="2"
                  style={{
                    color: "rgba(255, 200, 50, 1)",
                    fontWeight: 500,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {nickname}
                </Text>
              ) : (
                <Text size="2" color="gray" style={{ opacity: 0.4, lineHeight: 1.2 }}>
                  —
                </Text>
              )}
            </Box>
          </Flex>
        </Flex>

        <Badge color="gray" variant="soft" style={{ flexShrink: 0 }}>
          {totalShots} {countLabel}
          {totalShots !== 1 ? "s" : ""}
        </Badge>
      </Flex>
    </>
  );
}


