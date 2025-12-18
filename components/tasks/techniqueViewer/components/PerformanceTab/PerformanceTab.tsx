"use client";

/**
 * PerformanceTab
 *
 * Displays technique performance cards for each detected swing.
 * Shows metrics like knee bend (Footwork), hip rotation, shoulder rotation,
 * wrist velocity (Power), and acceleration (Agility) in a radar chart.
 * 
 * Uses AI-powered analysis to generate strengths and focus areas for each swing.
 */

import { useMemo, useEffect, useRef } from "react";
import { Box, Flex, Text, Spinner } from "@radix-ui/themes";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useSwingProfiles } from "@/hooks/useSwingProfiles";
import type { SwingProfileData } from "@/types/swing-profile";
import type { PerformanceTabProps, SwingPerformanceData, SwingMetrics } from "./types";
import { NORMALIZATION_RANGES } from "./constants";
import {
  calculateSAIScore,
  normalizeValue,
  findPeakInSwing,
  calculateKneeBendScore,
  getMaxVelocity,
} from "./utils";
import { PerformanceCard } from "./components";

/**
 * Main PerformanceTab component.
 * Extracts swing performance data from protocol events and renders performance cards.
 * Uses AI to generate technique insights for each swing.
 */
export function PerformanceTab({
  protocolEvents,
  videoElement,
  videoFPS,
  onSeekTo,
  swingResult,
  sport = "padel",
}: PerformanceTabProps) {
  // AI-powered swing profile generation
  const { profiles, isGenerating, error, generate, getProfileBySwingId } = useSwingProfiles({
    sport,
  });
  const hasGeneratedRef = useRef(false);

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
      const peakShoulderVelocityKmh = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => getMaxVelocity(fd.leftShoulderVelocityKmh, fd.rightShoulderVelocityKmh)
      );

      const peakHipVelocityKmh = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => getMaxVelocity(fd.leftHipVelocityKmh, fd.rightHipVelocityKmh)
      );

      const peakXFactor = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => fd.xFactor
      );

      const peakAcceleration = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => fd.maxWristAcceleration
      );

      const kneeBendEstimate = findPeakInSwing(
        frameData,
        startFrame,
        endFrame,
        (fd) => calculateKneeBendScore(fd.maxKneeBend)
      );

      // Calculate normalized metrics (0-100)
      const metrics: SwingMetrics = {
        power: normalizeValue(peakVelocityKmh, NORMALIZATION_RANGES.power.min, NORMALIZATION_RANGES.power.max),
        agility: normalizeValue(Math.abs(peakAcceleration), NORMALIZATION_RANGES.agility.min, NORMALIZATION_RANGES.agility.max),
        footwork: normalizeValue(kneeBendEstimate, NORMALIZATION_RANGES.footwork.min, NORMALIZATION_RANGES.footwork.max),
        hip: normalizeValue(peakHipVelocityKmh, NORMALIZATION_RANGES.hip.min, NORMALIZATION_RANGES.hip.max),
        rotation: normalizeValue(peakShoulderVelocityKmh, NORMALIZATION_RANGES.rotation.min, NORMALIZATION_RANGES.rotation.max),
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

  // Build swing profile data for AI analysis
  const swingProfileData: SwingProfileData[] = useMemo(() => {
    return swingData.map((data) => ({
      swingId: data.id,
      swingIndex: data.index,
      swingType: data.swingType,
      metrics: {
        power: data.metrics.power,
        agility: data.metrics.agility,
        footwork: data.metrics.footwork,
        hip: data.metrics.hip,
        rotation: data.metrics.rotation,
      },
      rawMetrics: {
        peakWristVelocityKmh: data.peakVelocityKmh,
        peakShoulderVelocityKmh: data.peakShoulderVelocityKmh,
        peakHipVelocityKmh: data.peakHipVelocityKmh,
        peakXFactor: data.peakXFactor,
        peakAcceleration: data.rawMetrics.peakAcceleration ?? 0,
        kneeBend: data.rawMetrics.kneeBend,
      },
      saiScore: data.saiScore,
      contactTime: data.contactTime,
    }));
  }, [swingData]);

  // Auto-generate profiles when swing data is available
  useEffect(() => {
    if (
      swingProfileData.length > 0 &&
      !hasGeneratedRef.current &&
      !isGenerating &&
      profiles.length === 0
    ) {
      hasGeneratedRef.current = true;
      generate(swingProfileData);
    }
  }, [swingProfileData, isGenerating, profiles.length, generate]);

  // Empty state
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
        <Flex align="center" gap="3">
          <Text size="4" weight="bold" style={{ color: "white" }}>
            Performance Analysis
          </Text>
          {isGenerating && (
            <Flex align="center" gap="2">
              <Spinner size="1" />
              <Text size="2" color="gray">
                Analyzing technique...
              </Text>
            </Flex>
          )}
        </Flex>
        {error && (
          <Text size="2" color="red">
            Analysis unavailable
          </Text>
        )}
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
            profile={getProfileBySwingId(data.id)}
            isLoadingProfile={isGenerating}
          />
        ))}
      </Flex>
    </Box>
  );
}

export default PerformanceTab;
