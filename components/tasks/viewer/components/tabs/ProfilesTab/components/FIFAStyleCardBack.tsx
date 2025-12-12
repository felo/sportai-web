"use client";

import { useMemo } from "react";
import { Box, Flex, Text, HoverCard } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import type { PlayerProfile, PlayerProfileAttributes } from "@/types/player-profile";
import { getRatingTier } from "../utils/calculateRating";
import { ATTRIBUTE_CONFIG } from "../constants";
import { SportAIRatingBadge } from "./SportAIRatingBadge";
import { getFIFACardPortrait, CSS_ENHANCEMENT_STYLES } from "@/utils/portrait-enhance";

interface FIFAStyleCardBackProps {
  profile: PlayerProfile;
  portrait?: string;
  rating: number;
}

// FIFA-style 3-letter abbreviations for attributes
const ATTRIBUTE_ABBREV: Record<keyof PlayerProfileAttributes, string> = {
  power: "PWR",
  agility: "AGI",
  consistency: "CON",
  attack: "ATK",
  defense: "DEF",
  coverage: "COV",
  variety: "VAR",
};

// Full attribute names for tooltips
const ATTRIBUTE_FULL_NAME: Record<keyof PlayerProfileAttributes, string> = {
  power: "Power",
  agility: "Agility",
  consistency: "Consistency",
  attack: "Attack",
  defense: "Defense",
  coverage: "Coverage",
  variety: "Variety",
};

/**
 * Attribute row with hover card tooltip matching the radar chart tooltip design
 */
function AttributeRow({ 
  attrKey, 
  value, 
  accentColor 
}: { 
  attrKey: keyof PlayerProfileAttributes; 
  value: number; 
  accentColor: string;
}) {
  const config = ATTRIBUTE_CONFIG[attrKey];
  
  return (
    <HoverCard.Root openDelay={100} closeDelay={100}>
      <HoverCard.Trigger>
        <Flex align="center" gap="2" style={{ cursor: "help" }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: accentColor,
              width: 36,
              textAlign: "right",
            }}
          >
            {Math.round(value)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--gray-11)",
              letterSpacing: 0.5,
            }}
          >
            {ATTRIBUTE_ABBREV[attrKey]}
          </Text>
        </Flex>
      </HoverCard.Trigger>
      <HoverCard.Content 
        side="top" 
        sideOffset={8}
        style={{
          background: "var(--gray-2)",
          padding: "12px 16px",
          borderRadius: 12,
          border: `2px solid ${accentColor}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          width: 280,
        }}
      >
        <Flex align="center" gap="2">
          {config?.icon && <config.icon width={14} height={14} style={{ color: accentColor }} />}
          <Text size="2" weight="bold" style={{ color: accentColor }}>
            {ATTRIBUTE_FULL_NAME[attrKey]}
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
          Score: {Math.round(value)}
        </Text>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

/**
 * FIFA Ultimate Team style card back with prominent portrait and stats
 */
export function FIFAStyleCardBack({ profile, portrait, rating }: FIFAStyleCardBackProps) {
  const tier = getRatingTier(rating);
  const attrs = profile.attributes;
  
  // Enhanced portrait URL (uses Cloudinary for S3 images, passthrough for data URLs)
  const enhancedPortrait = useMemo(() => 
    getFIFACardPortrait(portrait, 400), 
    [portrait]
  );
  
  // Check if we need CSS enhancement (for data URLs that can't use Cloudinary)
  const needsCssEnhancement = portrait?.startsWith("data:");
  
  // Split attributes into two columns
  const leftAttrs: (keyof PlayerProfileAttributes)[] = ["power", "agility", "consistency", "attack"];
  const rightAttrs: (keyof PlayerProfileAttributes)[] = ["defense", "coverage", "variety"];

  return (
    <Box
      style={{
        width: "100%",
        height: "100%",
        background: "var(--gray-2)",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        border: `2px solid ${tier.gradient[0]}`,
      }}
    >
      {/* Decorative diagonal stripe - solid with subtle accent */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "60%",
          height: "100%",
          background: `linear-gradient(135deg, var(--gray-2) 0%, var(--gray-3) 50%, var(--gray-4) 100%)`,
          clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />
      {/* Accent corner glow */}
      <Box
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "50%",
          height: "40%",
          background: `radial-gradient(ellipse at bottom right, ${tier.gradient[0]}20, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <Flex direction="column" style={{ height: "100%", position: "relative", zIndex: 1 }}>
        {/* Top section: Rating badge + Portrait */}
        <Box style={{ position: "relative", flex: 1, minHeight: 0 }}>
          {/* SportAI Rating Badge - top left */}
          <Box style={{ position: "absolute", top: 20, left: 20, zIndex: 2 }}>
            <SportAIRatingBadge rating={rating} size="large" />
          </Box>

          {/* Portrait - square with faded edges */}
          <Flex
            align="center"
            justify="center"
            style={{ 
              height: "100%",
              padding: "16px 24px",
            }}
          >
            <Box
              style={{
                position: "relative",
                width: 200,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {enhancedPortrait ? (
                <Box
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                >
                  <img
                    src={enhancedPortrait}
                    alt={profile.playerName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top",
                      maskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                      // Apply CSS enhancement for data URLs
                      ...(needsCssEnhancement ? CSS_ENHANCEMENT_STYLES : {}),
                      maskComposite: "intersect",
                      WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                      WebkitMaskComposite: "source-in",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 16,
                    background: "var(--gray-4)",
                    border: `2px solid ${tier.gradient[0]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PersonIcon width={64} height={64} style={{ color: tier.gradient[0] }} />
                </Box>
              )}
            </Box>
          </Flex>
        </Box>

        {/* Divider line */}
        <Box
          style={{
            height: 2,
            background: `linear-gradient(90deg, var(--gray-5), ${tier.gradient[0]}, var(--gray-5))`,
            margin: "0 24px",
          }}
        />

        {/* Player Name */}
        <Box style={{ padding: "16px 24px 12px", textAlign: "center" }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--gray-12)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {profile.playerName}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: tier.gradient[0],
              display: "block",
              marginTop: 4,
            }}
          >
            {profile.playstyle}
          </Text>
        </Box>

        {/* Divider line */}
        <Box
          style={{
            height: 1,
            background: `linear-gradient(90deg, var(--gray-5), ${tier.gradient[0]}, var(--gray-5))`,
            margin: "0 24px",
          }}
        />

        {/* Attributes Grid */}
        <Flex gap="4" style={{ padding: "16px 32px 24px" }}>
          {/* Left column */}
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            {leftAttrs.map((key) => (
              <AttributeRow
                key={key}
                attrKey={key}
                value={attrs[key]}
                accentColor={tier.gradient[0]}
              />
            ))}
          </Flex>

          {/* Vertical divider */}
          <Box
            style={{
              width: 1,
              background: `linear-gradient(180deg, var(--gray-5), ${tier.gradient[0]}, var(--gray-5))`,
            }}
          />

          {/* Right column */}
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            {rightAttrs.map((key) => (
              <AttributeRow
                key={key}
                attrKey={key}
                value={attrs[key]}
                accentColor={tier.gradient[0]}
              />
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}

