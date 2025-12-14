"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text, Card, Separator } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { ResponsiveRadar } from "@nivo/radar";
import type { SwingPerformanceData, SwingMetrics } from "../types";
import { ATTRIBUTE_CONFIG, CHART_THEME, LEFT_ATTRIBUTES, RIGHT_ATTRIBUTES } from "../constants";
import { getRatingTier, toRadarData } from "../utils";
import { requestThumbnailCapture, getCachedThumbnail } from "@/components/shared/hooks";
import { SAIRatingBadge } from "./SAIRatingBadge";
import { AttributeRow } from "./AttributeRow";
import { FlipCard } from "@/components/ui/animations";

interface PerformanceCardProps {
  data: SwingPerformanceData;
  videoElement: HTMLVideoElement | null;
  onSeekTo?: (time: number) => void;
  delay: number;
}

/**
 * A performance card showing swing analysis with radar chart (front)
 * and FIFA-style stats view (back).
 */
export function PerformanceCard({ data, videoElement, onSeekTo, delay }: PerformanceCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const tier = getRatingTier(data.saiScore);
  const radarData = toRadarData(data.metrics);

  // Delayed visibility for staggered animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Capture thumbnail at contact time
  useEffect(() => {
    if (!videoElement) return;

    // Check cache first
    const cached = getCachedThumbnail(videoElement.src, data.contactTime);
    if (cached) {
      setThumbnailUrl(cached);
      return;
    }

    // Request capture
    requestThumbnailCapture(videoElement, data.contactTime).then((url) => {
      if (url) setThumbnailUrl(url);
    });
  }, [videoElement, data.contactTime]);

  // Front Card - Radar Chart View
  const frontCard = (
    <Card
      style={{
        border: "1px solid var(--gray-6)",
        width: "100%",
        height: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
        cursor: onSeekTo ? "pointer" : "default",
      }}
      onClick={() => onSeekTo?.(data.contactTime)}
    >
      <Flex direction="column" gap="3" p="4" style={{ height: "100%" }}>
        {/* Header with portrait and SAI */}
        <Flex align="center" gap="3">
          <ThumbnailCircle
            thumbnailUrl={thumbnailUrl}
            index={data.index}
            borderColor={tier.gradient[0]}
          />
          <Box style={{ flex: 1 }}>
            <Text size="4" weight="bold" style={{ lineHeight: 1.2 }}>
              Technique Analysis
            </Text>
          </Box>
          <SAIRatingBadge rating={data.saiScore} />
        </Flex>

        {/* Radar Chart */}
        <Box style={{ height: 220, margin: "0 -8px" }}>
          <ResponsiveRadar
            data={radarData}
            keys={["value"]}
            indexBy="attribute"
            maxValue={100}
            margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor={tier.gradient[0]}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={16}
            enableDots={true}
            dotSize={8}
            dotColor={tier.gradient[0]}
            dotBorderWidth={2}
            dotBorderColor="white"
            colors={[tier.gradient[0]]}
            fillOpacity={0.25}
            blendMode="normal"
            motionConfig="gentle"
            theme={CHART_THEME}
            isInteractive={true}
            sliceTooltip={({ index, data: tooltipData }) => (
              <RadarTooltip
                index={String(index)}
                value={tooltipData[0].value as number}
                accentColor={tier.gradient[0]}
              />
            )}
          />
        </Box>

        {/* Summary text */}
        <Box style={{ maxHeight: 80, overflow: "auto", flex: 1 }}>
          <Text size="2" color="gray" style={{ lineHeight: 1.5, fontStyle: "italic" }}>
            {data.peakVelocityKmh >= 20
              ? `Peak wrist: ${Math.round(data.peakVelocityKmh)} km/h. Shoulder: ${Math.round(data.peakShoulderVelocityKmh)} km/h. Hip: ${Math.round(data.peakHipVelocityKmh)} km/h. X-factor: ${Math.round(Math.abs(data.peakXFactor))}°.`
              : "Swing analysis metrics captured."}
          </Text>
        </Box>

        <Separator size="4" style={{ opacity: 0.3, flexShrink: 0 }} />

        {/* Strengths & Focus Areas */}
        <Flex gap="4">
          <Box style={{ flex: 1 }}>
            <Text size="1" weight="bold" style={{ color: "#10B981", marginBottom: 4, display: "block" }}>
              Strengths
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: 2, fontStyle: "italic" }}>
              • Analysis pending
            </Text>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="1" weight="bold" style={{ color: "#F59E0B", marginBottom: 4, display: "block" }}>
              Focus Areas
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: 2, fontStyle: "italic" }}>
              • Analysis pending
            </Text>
          </Box>
        </Flex>
      </Flex>
    </Card>
  );

  // Back Card - FIFA-style stats view
  const backCard = (
    <Card
      style={{
        border: "1px solid var(--gray-6)",
        width: "100%",
        height: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
        padding: 0,
      }}
    >
      <Box
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(145deg, ${tier.gradient[0]}22, ${tier.gradient[1]}44)`,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Decorative diagonal stripe */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "60%",
            height: "100%",
            background: `linear-gradient(135deg, transparent 0%, ${tier.gradient[0]}15 50%, ${tier.gradient[1]}25 100%)`,
            clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)",
          }}
        />

        <Flex direction="column" style={{ height: "100%", position: "relative", zIndex: 1 }}>
          {/* Top section: Rating badge + Portrait */}
          <Box style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <Box style={{ position: "absolute", top: 20, left: 20, zIndex: 2 }}>
              <SAIRatingBadge rating={data.saiScore} size="large" />
            </Box>

            <Flex align="center" justify="center" style={{ height: "100%", padding: "16px 24px" }}>
              <LargePortrait
                thumbnailUrl={thumbnailUrl}
                index={data.index}
                accentColor={tier.gradient[0]}
              />
            </Flex>
          </Box>

          {/* Divider line */}
          <Box
            style={{
              height: 2,
              background: `linear-gradient(90deg, transparent, ${tier.gradient[0]}, transparent)`,
              margin: "0 24px",
            }}
          />

          {/* Title */}
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
              Technique Analysis
            </Text>
          </Box>

          {/* Divider line */}
          <Box
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${tier.gradient[0]}66, transparent)`,
              margin: "0 24px",
            }}
          />

          {/* Attributes Grid */}
          <Flex gap="4" style={{ padding: "16px 32px 24px" }}>
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              {LEFT_ATTRIBUTES.map((key) => (
                <AttributeRow
                  key={key}
                  attrKey={key}
                  value={data.metrics[key]}
                  accentColor={tier.gradient[0]}
                />
              ))}
            </Flex>
            <Box
              style={{
                width: 1,
                background: `linear-gradient(180deg, transparent, ${tier.gradient[0]}44, transparent)`,
              }}
            />
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              {RIGHT_ATTRIBUTES.map((key) => (
                <AttributeRow
                  key={key}
                  attrKey={key}
                  value={data.metrics[key]}
                  accentColor={tier.gradient[0]}
                />
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Box>
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
      <FlipCard front={frontCard} back={backCard} width={340} height={604} />
    </Box>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface ThumbnailCircleProps {
  thumbnailUrl: string | null;
  index: number;
  borderColor: string;
}

function ThumbnailCircle({ thumbnailUrl, index, borderColor }: ThumbnailCircleProps) {
  return (
    <Box
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        overflow: "hidden",
        border: `3px solid ${borderColor}`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: thumbnailUrl ? "transparent" : borderColor,
      }}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Swing ${index}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <PersonIcon width={28} height={28} style={{ color: "white" }} />
      )}
    </Box>
  );
}

interface LargePortraitProps {
  thumbnailUrl: string | null;
  index: number;
  accentColor: string;
}

function LargePortrait({ thumbnailUrl, index, accentColor }: LargePortraitProps) {
  return (
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
      {thumbnailUrl ? (
        <Box style={{ width: "100%", height: "100%", position: "relative" }}>
          <img
            src={thumbnailUrl}
            alt={`Swing ${index}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              maskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
              maskComposite: "intersect",
              WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
              WebkitMaskComposite: "source-in" as const,
            }}
          />
        </Box>
      ) : (
        <Box
          style={{
            width: 120,
            height: 120,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}44)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PersonIcon width={64} height={64} style={{ color: accentColor }} />
        </Box>
      )}
    </Box>
  );
}

interface RadarTooltipProps {
  index: string;
  value: number;
  accentColor: string;
}

function RadarTooltip({ index, value, accentColor }: RadarTooltipProps) {
  const attrKey = Object.keys(ATTRIBUTE_CONFIG).find((key) =>
    index.includes(ATTRIBUTE_CONFIG[key as keyof SwingMetrics].label)
  ) as keyof SwingMetrics | undefined;
  const config = attrKey ? ATTRIBUTE_CONFIG[attrKey] : null;

  return (
    <Box
      style={{
        background: "var(--gray-2)",
        padding: "12px 16px",
        borderRadius: 12,
        border: `2px solid ${accentColor}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        width: 280,
      }}
    >
      <Text size="2" weight="bold" style={{ color: accentColor }}>
        {config?.label || index}
      </Text>
      {config && (
        <Text size="1" color="gray" style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}>
          {config.description}
        </Text>
      )}
      <Text size="2" weight="medium" style={{ display: "block", marginTop: 6 }}>
        Score: {value}
      </Text>
    </Box>
  );
}
