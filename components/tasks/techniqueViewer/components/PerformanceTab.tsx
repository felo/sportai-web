"use client";

/**
 * PerformanceTab
 *
 * Displays technique performance cards for each detected swing.
 * Shows metrics like knee bend (Footwork), hip rotation, shoulder rotation,
 * wrist velocity (Power), and acceleration (Agility) in a radar chart.
 */

import { useMemo, useState, useEffect, useCallback, ReactNode } from "react";
import { Box, Flex, Text, Card, Separator, Tooltip, HoverCard } from "@radix-ui/themes";
import { PersonIcon, MixerHorizontalIcon, UpdateIcon } from "@radix-ui/react-icons";
import { ResponsiveRadar } from "@nivo/radar";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { SwingDetectionResultV3, SwingFrameDataV3 } from "@/components/videoPoseViewerV2/hooks/useSwingDetectionV3";

// ============================================================================
// Types
// ============================================================================

interface PerformanceTabProps {
  /** Protocol events containing swing data */
  protocolEvents: ProtocolEvent[];
  /** Video element for frame capture */
  videoElement: HTMLVideoElement | null;
  /** Video FPS for time calculations */
  videoFPS: number;
  /** Callback to seek to a specific time */
  onSeekTo?: (time: number) => void;
  /** Swing detection result with frame-level data */
  swingResult?: SwingDetectionResultV3 | null;
}

interface SwingMetrics {
  footwork: number;      // From knee bend (0-100)
  hip: number;           // From peak hip velocity (0-100), 100 = 10 km/h
  rotation: number;      // From x-factor separation (0-100), 100 = 150 degrees
  power: number;         // From peak wrist velocity (0-100)
  agility: number;       // From peak acceleration (0-100)
}

interface SwingPerformanceData {
  id: string;
  index: number;
  metrics: SwingMetrics;
  saiScore: number;
  peakVelocityKmh: number;
  peakShoulderVelocityKmh: number;
  peakHipVelocityKmh: number;
  peakXFactor: number;
  rotationRange: number;
  swingType: string;
  contactTime: number;
  contactFrame: number;
  startFrame: number;
  endFrame: number;
  rawMetrics: {
    kneeBend: number | null;
    peakHipVelocity: number | null;
    peakShoulderVelocity: number | null;
    peakXFactor: number | null;
    peakWristVelocity: number | null;
    peakAcceleration: number | null;
  };
}

// ============================================================================
// Constants
// ============================================================================

const ATTRIBUTE_CONFIG: Record<keyof SwingMetrics, { label: string; abbrev: string; description: string }> = {
  footwork: {
    label: "Footwork",
    abbrev: "FTW",
    description: "Knee bend depth during the swing. Good footwork shows proper athletic stance and lower body engagement.",
  },
  hip: {
    label: "Hip",
    abbrev: "HIP",
    description: "Peak hip rotation velocity. Measures how fast the hips rotate through the swing. 100 = 10 km/h.",
  },
  rotation: {
    label: "Rotation",
    abbrev: "ROT",
    description: "Peak shoulder rotation velocity. Measures how fast the shoulders rotate through the swing. 100 = 10 km/h.",
  },
  power: {
    label: "Power",
    abbrev: "PWR",
    description: "Peak wrist velocity at contact. Higher speed indicates more powerful shots. 100 = 50 km/h.",
  },
  agility: {
    label: "Agility",
    abbrev: "AGI",
    description: "Peak acceleration during the swing. Higher acceleration shows explosive movement capability. 100 = 200 km/h/s.",
  },
};

const CHART_THEME = {
  background: "transparent",
  text: {
    fill: "var(--gray-11)",
    fontSize: 11,
    fontFamily: "inherit",
  },
  grid: {
    line: {
      stroke: "var(--gray-6)",
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      color: "var(--gray-12)",
      borderRadius: "8px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      padding: "10px 14px",
      border: "1px solid var(--gray-6)",
    },
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate SAI score from metrics (weighted average)
 */
function calculateSAIScore(metrics: SwingMetrics): number {
  const values = Object.values(metrics);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  
  // 70% average, 30% minimum (rewards balance)
  const balanced = (average * 0.7) + (min * 0.3);
  
  // Scale to 40-99 range (FIFA-style)
  return Math.round(40 + (balanced * 0.59));
}

/**
 * Get tier info based on SAI rating
 */
function getRatingTier(rating: number): {
  label: string;
  gradient: [string, string];
  glow: string;
} {
  if (rating >= 90) return {
    label: "Elite",
    gradient: ["#FFD700", "#FFA500"],
    glow: "rgba(255, 215, 0, 0.4)",
  };
  if (rating >= 80) return {
    label: "Pro",
    gradient: ["#C0C0C0", "#E8E8E8"],
    glow: "rgba(192, 192, 192, 0.4)",
  };
  if (rating >= 70) return {
    label: "Advanced",
    gradient: ["#CD7F32", "#B8860B"],
    glow: "rgba(205, 127, 50, 0.4)",
  };
  if (rating >= 60) return {
    label: "Intermediate",
    gradient: ["#4A90A4", "#2E5A6B"],
    glow: "rgba(74, 144, 164, 0.4)",
  };
  return {
    label: "Developing",
    gradient: ["#6B7280", "#4B5563"],
    glow: "rgba(107, 114, 128, 0.4)",
  };
}

/**
 * Normalize a value to 0-100 scale
 */
function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Convert radar data for nivo (rounded to integers)
 */
function toRadarData(metrics: SwingMetrics): Array<{ attribute: string; value: number }> {
  return Object.entries(metrics).map(([key, value]) => ({
    attribute: ATTRIBUTE_CONFIG[key as keyof SwingMetrics].label,
    value: Math.round(value),
  }));
}

/**
 * Find peak value in frame data for a swing
 */
function findPeakInSwing(
  frameData: SwingFrameDataV3[],
  startFrame: number,
  endFrame: number,
  getValue: (fd: SwingFrameDataV3) => number | null
): number {
  let peak = 0;
  for (const fd of frameData) {
    if (fd.frame >= startFrame && fd.frame <= endFrame) {
      const value = getValue(fd);
      if (value !== null && Math.abs(value) > Math.abs(peak)) {
        peak = value;
      }
    }
  }
  return peak;
}

// ============================================================================
// Thumbnail Cache
// ============================================================================

const thumbnailCache = new Map<string, string>();
const pendingCallbacks = new Map<string, Array<(url: string) => void>>();
let captureQueue: Array<{ key: string; time: number }> = [];
let isProcessingQueue = false;
let currentVideoElement: HTMLVideoElement | null = null;

function getCacheKey(videoSrc: string, time: number): string {
  const srcKey = videoSrc.split("/").pop() || videoSrc.slice(-50);
  return `perf:${srcKey}:${time.toFixed(3)}`;
}

function requestThumbnailCapture(
  videoElement: HTMLVideoElement,
  time: number
): Promise<string | null> {
  const key = getCacheKey(videoElement.src, time);

  if (thumbnailCache.has(key)) {
    return Promise.resolve(thumbnailCache.get(key)!);
  }

  return new Promise((resolve) => {
    if (!pendingCallbacks.has(key)) {
      pendingCallbacks.set(key, []);
    }
    pendingCallbacks.get(key)!.push(resolve);

    if (!captureQueue.some((r) => r.key === key)) {
      captureQueue.push({ key, time });
      currentVideoElement = videoElement;
      processQueue();
    }
  });
}

async function processQueue() {
  if (isProcessingQueue || captureQueue.length === 0 || !currentVideoElement) {
    return;
  }

  isProcessingQueue = true;
  const videoElement = currentVideoElement;

  // Wait for video to be ready
  if (videoElement.readyState < 2) {
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (videoElement.readyState >= 2) {
          videoElement.removeEventListener("canplay", checkReady);
          resolve();
        }
      };
      videoElement.addEventListener("canplay", checkReady);
      setTimeout(resolve, 2000);
    });
  }

  const originalTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;
  if (wasPlaying) videoElement.pause();

  while (captureQueue.length > 0) {
    const request = captureQueue.shift()!;

    if (thumbnailCache.has(request.key)) {
      notifyCallbacks(request.key, thumbnailCache.get(request.key)!);
      continue;
    }

    try {
      videoElement.currentTime = request.time;
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          videoElement.removeEventListener("seeked", handleSeeked);
          resolve();
        };
        videoElement.addEventListener("seeked", handleSeeked);
        setTimeout(resolve, 200);
      });

      await new Promise((r) => setTimeout(r, 50));

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx && videoElement.videoWidth > 0) {
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        canvas.width = 300;
        canvas.height = Math.round(300 / aspectRatio);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        thumbnailCache.set(request.key, dataUrl);
        notifyCallbacks(request.key, dataUrl);
      } else {
        notifyCallbacks(request.key, null as unknown as string);
      }
    } catch {
      notifyCallbacks(request.key, null as unknown as string);
    }
  }

  videoElement.currentTime = originalTime;
  if (wasPlaying) videoElement.play();

  isProcessingQueue = false;
  if (captureQueue.length > 0) {
    setTimeout(processQueue, 10);
  }
}

function notifyCallbacks(key: string, url: string) {
  const callbacks = pendingCallbacks.get(key);
  if (callbacks && callbacks.length > 0) {
    callbacks.forEach((cb) => cb(url));
    pendingCallbacks.delete(key);
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SAIRatingBadgeProps {
  rating: number;
  size?: "default" | "large";
}

function SAIRatingBadge({ rating, size = "default" }: SAIRatingBadgeProps) {
  const tier = getRatingTier(rating);
  const s = size === "large" 
    ? { container: 80, inset: 4, saiFont: 11, ratingFont: 32, shadow: "0 6px 24px" }
    : { container: 52, inset: 3, saiFont: 8, ratingFont: 18, shadow: "0 4px 16px" };

  return (
    <Tooltip content={`Technique Score: ${tier.label}`} side="top" align="start">
      <Box
        style={{
          position: "relative",
          width: s.container,
          height: s.container,
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            boxShadow: `${s.shadow} ${tier.glow}`,
          }}
        />
        <Box
          style={{
            position: "absolute",
            inset: s.inset,
            background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: s.saiFont,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: size === "large" ? 1 : 0.5,
              lineHeight: 1,
              marginBottom: size === "large" ? 2 : 1,
            }}
          >
            SAI
          </Text>
          <Text
            style={{
              fontSize: s.ratingFont,
              fontWeight: 800,
              color: "white",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              lineHeight: 1,
            }}
          >
            {rating}
          </Text>
        </Box>
      </Box>
    </Tooltip>
  );
}

interface AttributeRowProps {
  attrKey: keyof SwingMetrics;
  value: number;
  accentColor: string;
}

function AttributeRow({ attrKey, value, accentColor }: AttributeRowProps) {
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
            {config.abbrev}
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
        <Text size="2" weight="bold" style={{ color: accentColor }}>
          {config.label}
        </Text>
        <Text
          size="1"
          color="gray"
          style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}
        >
          {config.description}
        </Text>
        <Text size="2" weight="medium" style={{ display: "block", marginTop: 6 }}>
          Score: {Math.round(value)}
        </Text>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

// FlipCard component (adapted from ProfilesTab)
interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  width?: number;
  height?: number;
}

function FlipCard({ front, back, width = 340, height = 604 }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      style={{
        width,
        height,
        perspective: 1200,
        position: "relative",
      }}
    >
      <Box
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <Box
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            opacity: isFlipped ? 0 : 1,
            transition: "opacity 0.3s ease-in-out",
            transitionDelay: isFlipped ? "0s" : "0.3s",
          }}
        >
          {front}
        </Box>
        <Box
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: isFlipped ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            transitionDelay: isFlipped ? "0.3s" : "0s",
          }}
        >
          {back}
        </Box>
      </Box>
      <Tooltip content={isFlipped ? "View radar chart" : "View stats card"} side="top" align="end">
        <Box
          onClick={() => setIsFlipped(!isFlipped)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 48,
            height: 48,
            cursor: "pointer",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 0 48px 48px",
              borderColor: `transparent transparent ${isHovered ? "var(--gray-9)" : "var(--gray-8)"} transparent`,
              transition: "border-color 0.2s ease",
            }}
          />
          <Box
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gray-1)",
              transform: isFlipped ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}
          >
            <UpdateIcon width={14} height={14} />
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
}

interface PerformanceCardProps {
  data: SwingPerformanceData;
  videoElement: HTMLVideoElement | null;
  onSeekTo?: (time: number) => void;
  delay: number;
}

function PerformanceCard({ data, videoElement, onSeekTo, delay }: PerformanceCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const tier = getRatingTier(data.saiScore);
  const radarData = toRadarData(data.metrics);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Capture thumbnail at contact time
  useEffect(() => {
    if (!videoElement) return;

    const cached = thumbnailCache.get(getCacheKey(videoElement.src, data.contactTime));
    if (cached) {
      setThumbnailUrl(cached);
      return;
    }

    requestThumbnailCapture(videoElement, data.contactTime).then((url) => {
      if (url) setThumbnailUrl(url);
    });
  }, [videoElement, data.contactTime]);

  const leftAttrs: (keyof SwingMetrics)[] = ["power", "agility", "footwork"];
  const rightAttrs: (keyof SwingMetrics)[] = ["hip", "rotation"];

  // Front Card - Radar Chart View
  const frontCard = (
    <Card
      style={{
        border: `1px solid var(--gray-6)`,
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
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${tier.gradient[0]}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: thumbnailUrl ? "transparent" : tier.gradient[0],
            }}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`Swing ${data.index}`}
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
            sliceTooltip={({ index, data: tooltipData }) => {
              const indexStr = String(index);
              const attrKey = Object.keys(ATTRIBUTE_CONFIG).find((key) =>
                indexStr.includes(ATTRIBUTE_CONFIG[key as keyof SwingMetrics].label)
              ) as keyof SwingMetrics | undefined;
              const config = attrKey ? ATTRIBUTE_CONFIG[attrKey] : null;
              return (
                <Box
                  style={{
                    background: "var(--gray-2)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `2px solid ${tier.gradient[0]}`,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    width: 280,
                  }}
                >
                  <Text size="2" weight="bold" style={{ color: tier.gradient[0] }}>
                    {config?.label || index}
                  </Text>
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
                    Score: {tooltipData[0].value}
                  </Text>
                </Box>
              );
            }}
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
        border: `1px solid var(--gray-6)`,
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

            <Flex
              align="center"
              justify="center"
              style={{ height: "100%", padding: "16px 24px" }}
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
                {thumbnailUrl ? (
                  <Box style={{ width: "100%", height: "100%", position: "relative" }}>
                    <img
                      src={thumbnailUrl}
                      alt={`Swing ${data.index}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        maskImage: "linear-gradient(to bottom, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
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
                      background: `linear-gradient(135deg, ${tier.gradient[0]}44, ${tier.gradient[1]}44)`,
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
              {leftAttrs.map((key) => (
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
              {rightAttrs.map((key) => (
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
      <FlipCard
        front={frontCard}
        back={backCard}
        width={340}
        height={604}
      />
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PerformanceTab({
  protocolEvents,
  videoElement,
  videoFPS,
  onSeekTo,
  swingResult,
}: PerformanceTabProps) {
  // Extract swing events and calculate performance data
  const swingData = useMemo(() => {
    const swingEvents = protocolEvents.filter(
      (e) => e.protocolId === "swing-detection-v3"
    );

    if (swingEvents.length === 0) return [];

    const frameData = swingResult?.frameData || [];

    const performanceData: SwingPerformanceData[] = swingEvents.map((event, index) => {
      const metadata = event.metadata as Record<string, unknown> | undefined;

      // Extract raw values from metadata
      const peakVelocityKmh = (metadata?.velocityKmh as number) || 0;
      const rotationRange = (metadata?.rotationRange as number) || 0;
      const swingType = (metadata?.swingType as string) || "unknown";
      const contactFrame = (metadata?.contactFrame as number) || event.startFrame;
      const startFrame = event.startFrame;
      const endFrame = event.endFrame;
      
      // Find peak values from frame data within this swing's boundaries
      // Peak shoulder velocity (smoothed, km/h)
      const peakShoulderVelocityKmh = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => Math.max(fd.leftShoulderVelocityKmh ?? 0, fd.rightShoulderVelocityKmh ?? 0) || null
      );
      
      // Peak hip velocity (smoothed, km/h)
      const peakHipVelocityKmh = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => Math.max(fd.leftHipVelocityKmh ?? 0, fd.rightHipVelocityKmh ?? 0) || null
      );
      
      // Peak X-Factor (absolute value, degrees)
      const peakXFactor = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => fd.xFactor
      );
      
      // Peak wrist acceleration
      const peakAcceleration = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => fd.maxWristAcceleration
      );
      
      // Get knee bend from loading position if available
      const kneeBendEstimate = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => {
          const maxBend = fd.maxKneeBend;
          // Knee bend is the angle - more bent = lower angle (closer to 90)
          // Convert to a "bend score" where more bend = higher score
          if (maxBend === null) return null;
          return 180 - maxBend; // e.g., 135° angle = 45 bend score
        }
      );

      // Calculate normalized metrics (0-100)
      const metrics: SwingMetrics = {
        power: normalizeValue(peakVelocityKmh, 0, 50),            // 0-50 km/h range (50 km/h = 100)
        agility: normalizeValue(Math.abs(peakAcceleration), 0, 200), // 0-200 km/h/s range (200 = 100)
        footwork: normalizeValue(kneeBendEstimate, 0, 90),        // 0-90 degree bend range
        hip: normalizeValue(peakHipVelocityKmh, 0, 10),           // 0-10 km/h = 0-100 score
        rotation: normalizeValue(peakShoulderVelocityKmh, 0, 10), // 0-10 km/h = 0-100 score (shoulder velocity)
      };

      // Calculate SAI score
      const saiScore = calculateSAIScore(metrics);

      // Calculate contact time
      const contactTime = contactFrame / (videoFPS || 30);

      return {
        id: event.id,
        index: index + 1,
        metrics,
        saiScore,
        peakVelocityKmh,
        peakShoulderVelocityKmh,
        peakHipVelocityKmh,
        peakXFactor,
        rotationRange,
        swingType: swingType.charAt(0).toUpperCase() + swingType.slice(1),
        contactTime,
        contactFrame,
        startFrame,
        endFrame,
        rawMetrics: {
          kneeBend: kneeBendEstimate,
          peakHipVelocity: peakHipVelocityKmh,
          peakShoulderVelocity: peakShoulderVelocityKmh,
          peakXFactor: peakXFactor,
          peakWristVelocity: peakVelocityKmh,
          peakAcceleration: peakAcceleration,
        },
      };
    });

    return performanceData;
  }, [protocolEvents, videoFPS, swingResult]);

  // No swings state
  if (swingData.length === 0) {
    return (
      <Box
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px",
          backgroundColor: "var(--gray-1)",
        }}
      >
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ height: "300px" }}
        >
          <MixerHorizontalIcon
            width={48}
            height={48}
            style={{ color: "rgba(255,255,255,0.2)" }}
          />
          <Text size="3" style={{ color: "rgba(255,255,255,0.4)" }}>
            No swing data available
          </Text>
          <Text size="2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Enable Swing Detection V3 and preprocess the video to see performance analysis
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px",
        backgroundColor: "var(--gray-1)",
      }}
    >
      {/* Header */}
      <Flex align="center" justify="between" style={{ marginBottom: "20px" }}>
        <Text size="4" weight="bold" style={{ color: "white" }}>
          Performance Analysis
        </Text>
      </Flex>

      {/* Cards Grid */}
      <Flex wrap="wrap" gap="4" justify="start">
        {swingData.map((data, idx) => (
          <PerformanceCard
            key={data.id}
            data={data}
            videoElement={videoElement}
            onSeekTo={onSeekTo}
            delay={200 + idx * 150}
          />
        ))}
      </Flex>
    </Box>
  );
}

export default PerformanceTab;
