"use client";

import { useRef, useEffect, useContext } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { CHART_THEME } from "../../../../constants";
import { CountingContext } from "../CountingContext";
import { useCountingAnimation } from "../hooks";
import type { SwingTypeData } from "../types";

interface SwingTypesChartProps {
  data: SwingTypeData[];
  totalSwings: number;
}

/**
 * Animated pie chart showing swing type distribution.
 */
export function SwingTypesChart({ data, totalSwings }: SwingTypesChartProps) {
  const animationProgress = useCountingAnimation({ duration: 1800 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredBounce = useRef(false);
  const startCounting = useContext(CountingContext);

  // Piano bounce effect on chart slices
  useEffect(() => {
    if (startCounting && !hasTriggeredBounce.current && data.length > 0) {
      hasTriggeredBounce.current = true;
      
      setTimeout(() => {
        if (!containerRef.current) return;
        const paths = containerRef.current.querySelectorAll(
          'path[fill]:not([fill="none"])'
        );
        const pathsArray = Array.from(paths) as HTMLElement[];
        pathsArray.forEach((path, index) => {
          setTimeout(() => {
            path.style.filter = "drop-shadow(0 0 20px var(--purple-a9))";
            path.style.transform = "scale(1.12)";
            path.style.transition = "all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)";
            setTimeout(() => {
              path.style.filter = "none";
              path.style.transform = "scale(1)";
              path.style.transition = "all 0.25s ease-out";
            }, 150);
          }, index * 120);
        });
      }, 100);
    }
  }, [data.length, startCounting]);

  if (data.length === 0) return null;

  const animatedData = data.map((item) => ({
    ...item,
    displayValue: Math.round(item.value * animationProgress),
  }));

  const displaySwings = Math.round(totalSwings * animationProgress);

  return (
    <Flex direction="column" align="center" gap="2" style={{ overflow: "visible" }}>
      <Box
        ref={containerRef}
        style={{
          height: 220,
          width: "100%",
          position: "relative",
          overflow: "visible",
        }}
      >
        <ResponsivePie
          data={animatedData}
          theme={CHART_THEME}
          margin={{ top: 25, right: 80, bottom: 25, left: 80 }}
          innerRadius={0.55}
          padAngle={2}
          cornerRadius={6}
          activeOuterRadiusOffset={10}
          colors={{ datum: "data.color" }}
          borderWidth={2}
          borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
          enableArcLinkLabels={true}
          arcLinkLabel="label"
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="var(--gray-11)"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={15}
          arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          arcLabel={(d) => `${(d.data as (typeof animatedData)[0]).displayValue}%`}
          animate={true}
          motionConfig={{
            mass: 1,
            tension: 140,
            friction: 20,
            clamp: false,
            precision: 0.01,
            velocity: 0,
          }}
          transitionMode="startAngle"
          valueFormat={(value) => `${value}%`}
          tooltip={({ datum }) => (
            <Box
              style={{
                background: "var(--gray-2)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-3)",
                border: `2px solid ${datum.color}`,
                boxShadow: "0 4px 20px var(--black-a6)",
              }}
            >
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "var(--radius-2)",
                    backgroundColor: datum.color,
                  }}
                />
                <Text size="2" weight="bold">
                  {datum.label}: {datum.value}%
                </Text>
              </Flex>
            </Box>
          )}
        />
        {/* Center text */}
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Text
            size="6"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1,
            }}
          >
            {displaySwings}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>
            shots
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}

