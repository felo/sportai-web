"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { Flex, Text, Card } from "@radix-ui/themes";
import { CountingContext } from "../CountingContext";

interface QuickStatCardProps {
  label: string;
  value: number;
  formatValue?: (value: number) => string;
  subtitle?: string;
}

/**
 * Compact stat card with animated counting.
 */
export function QuickStatCard({
  label,
  value,
  formatValue,
  subtitle,
}: QuickStatCardProps) {
  return (
    <Card style={{ border: "1px solid var(--gray-5)" }}>
      <Flex direction="column" gap="1" p="3" align="center">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text
          size="5"
          weight="bold"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <AnimatedNumber value={value} formatValue={formatValue} />
        </Text>
        {subtitle && (
          <Text size="1" color="gray" style={{ opacity: 0.7 }}>
            {subtitle}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

function AnimatedNumber({ 
  value, 
  formatValue 
}: { 
  value: number;
  formatValue?: (value: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const hasStartedRef = useRef(false);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1200;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(value * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, startCounting]);

  if (formatValue) {
    return <>{formatValue(display)}</>;
  }
  return <>{Math.round(display)}</>;
}


