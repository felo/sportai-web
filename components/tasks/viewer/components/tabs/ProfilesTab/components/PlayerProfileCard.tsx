"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Box, Flex, Text, Heading, Card, Separator } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { ResponsiveRadar } from "@nivo/radar";
import type { PlayerProfile } from "@/types/player-profile";
import type { ProfileColor } from "../types";
import { CHART_THEME, ATTRIBUTE_CONFIG } from "../constants";
import { toRadarData } from "../utils";
import { ScrollableBox } from "./ScrollableBox";
import { SportAIRatingBadge } from "./SportAIRatingBadge";
import { FlipCard } from "@/components/ui/animations";
import { FIFAStyleCardBack } from "./FIFAStyleCardBack";
import { calculateSportAIRating } from "../utils/calculateRating";
import { getPlayerCardPortrait, CSS_ENHANCEMENT_STYLES } from "@/utils/portrait-enhance";

interface PlayerProfileCardProps {
  profile: PlayerProfile;
  portrait?: string;
  color: ProfileColor;
  delay: number;
}

/**
 * Individual player profile card with mini radar (front) and FIFA-style card (back)
 */
export function PlayerProfileCard({
  profile,
  portrait,
  color,
  delay,
}: PlayerProfileCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const radarData = toRadarData([profile]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Calculate SportAI Rating
  const sportAIRating = useMemo(() => {
    return calculateSportAIRating(profile.attributes);
  }, [profile.attributes]);

  // Enhanced portrait URL (uses Cloudinary for S3 images)
  const enhancedPortrait = useMemo(() => 
    getPlayerCardPortrait(portrait, 128), 
    [portrait]
  );
  
  // Check if we need CSS enhancement (for data URLs that can't use Cloudinary)
  const needsCssEnhancement = portrait?.startsWith("data:");

  // Front card content (radar chart view)
  const frontCard = (
    <Card
      style={{
        border: `1px solid var(--gray-6)`,
        width: "100%",
        height: "100%",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <Flex direction="column" gap="3" p="4" style={{ height: "100%" }}>
        {/* Header with portrait and playstyle */}
        <Flex align="center" gap="3">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${color.primary}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: enhancedPortrait ? "transparent" : color.primary,
            }}
          >
            {enhancedPortrait ? (
              <Image
                src={enhancedPortrait}
                alt={profile.playerName}
                fill
                sizes="64px"
                style={{
                  objectFit: "cover",
                  objectPosition: "top",
                  ...(needsCssEnhancement ? CSS_ENHANCEMENT_STYLES : {}),
                }}
              />
            ) : (
              <PersonIcon width={28} height={28} style={{ color: "white" }} />
            )}
          </Box>
          <Box style={{ flex: 1 }}>
            <Heading size="4" style={{ lineHeight: 1.2 }}>
              {profile.playerName}
            </Heading>
            <Text
              size="2"
              weight="bold"
              style={{
                color: color.primary,
                display: "block",
                marginTop: 2,
              }}
            >
              {profile.playstyle}
            </Text>
          </Box>
          {/* SportAI Rating Badge */}
          <SportAIRatingBadge rating={sportAIRating} />
        </Flex>

        {/* Mini Radar Chart */}
        <Box style={{ height: 220, margin: "0 -8px" }}>
          <ResponsiveRadar
            data={radarData}
            keys={[profile.playerName]}
            indexBy="attribute"
            maxValue={100}
            margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor={color.primary}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={16}
            enableDots={true}
            dotSize={8}
            dotColor={color.primary}
            dotBorderWidth={2}
            dotBorderColor="white"
            colors={[color.primary]}
            fillOpacity={0.25}
            blendMode="normal"
            motionConfig="gentle"
            theme={CHART_THEME}
            isInteractive={true}
            sliceTooltip={({ index, data }) => {
              // Extract the attribute key from the label (e.g., "💥 Power" → "power")
              const indexStr = String(index);
              const attrKey = Object.keys(ATTRIBUTE_CONFIG).find((key) =>
                indexStr.includes(ATTRIBUTE_CONFIG[key].label)
              );
              const config = attrKey ? ATTRIBUTE_CONFIG[attrKey] : null;
              const IconComponent = config?.icon;
              return (
                <Box
                  style={{
                    background: "var(--gray-2)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `2px solid ${color.primary}`,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    width: 280,
                  }}
                >
                  <Flex align="center" gap="2">
                    {IconComponent && <IconComponent width={14} height={14} style={{ color: color.primary }} />}
                    <Text size="2" weight="bold" style={{ color: color.primary }}>
                      {config?.label || index}
                    </Text>
                  </Flex>
                  {config && (
                    <Text
                      size="1"
                      color="gray"
                      style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}
                    >
                      {config.description}
                    </Text>
                  )}
                  <Text size="2" weight="medium" style={{ display: "block", marginTop: 6 }}>
                    Score: {data[0].value}
                  </Text>
                </Box>
              );
            }}
          />
        </Box>

        {/* Summary - scrollable */}
        <ScrollableBox maxHeight={100} color={color.primary}>
          <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
            {profile.summary}
          </Text>
        </ScrollableBox>

        <Separator size="4" style={{ opacity: 0.3, flexShrink: 0 }} />

        {/* Strengths & Areas to Improve - scrollable */}
        <ScrollableBox flex={1} color={color.primary}>
          <Flex gap="4">
            <Box style={{ flex: 1 }}>
              <Text size="1" weight="bold" style={{ color: "#10B981", marginBottom: 4, display: "block" }}>
                Strengths
              </Text>
              {profile.strengths.map((s, i) => (
                <Text key={i} size="1" color="gray" style={{ display: "block", marginTop: 2 }}>
                  • {s}
                </Text>
              ))}
            </Box>
            {profile.areasToImprove.length > 0 && (
              <Box style={{ flex: 1 }}>
                <Text size="1" weight="bold" style={{ color: "#F59E0B", marginBottom: 4, display: "block" }}>
                  Focus Areas
                </Text>
                {profile.areasToImprove.map((s, i) => (
                  <Text key={i} size="1" color="gray" style={{ display: "block", marginTop: 2 }}>
                    • {s}
                  </Text>
                ))}
              </Box>
            )}
          </Flex>
        </ScrollableBox>
      </Flex>
    </Card>
  );

  // Back card content (FIFA-style view)
  const backCard = (
    <Card
      style={{
        border: `1px solid var(--gray-6)`,
        width: "100%",
        height: "100%",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
        padding: 0,
      }}
    >
      <FIFAStyleCardBack
        profile={profile}
        portrait={portrait}
        rating={sportAIRating}
      />
    </Card>
  );

  return (
    <Box
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        flexShrink: 0,
      }}
    >
      <FlipCard
        front={frontCard}
        back={backCard}
        width={340}
        height={604}
      />
    </Box>
  );
}
