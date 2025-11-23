"use client";

import React from "react";
import { Dialog, Flex, Text, Button, Heading, Box } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import styles from "@/styles/buttons.module.css";

export interface MetricConversion {
  original: string;
  value: number;
  unit: string;
  conversions: Array<{ value: string; unit: string; label: string }>;
}

interface MetricConversionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: MetricConversion | null;
}

export function MetricConversionModal({ open, onOpenChange, metric }: MetricConversionModalProps) {
  if (!metric) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content 
        style={{ maxWidth: 400 }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const target = e.currentTarget as HTMLElement;
          if (target && typeof target.focus === 'function') {
            target.focus({ preventScroll: true });
          }
        }}
        onCloseAutoFocus={(e) => {
          // Prevent default focus behavior that might cause scrolling when closing
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Prevent any scroll on outside click
          e.preventDefault();
          onOpenChange(false);
        }}
        onEscapeKeyDown={(e) => {
          // Prevent any scroll on escape
          e.preventDefault();
          onOpenChange(false);
        }}
      >
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Dialog.Title>
              <Heading size="4" style={{ margin: 0 }}>
                {metric.original}
              </Heading>
            </Dialog.Title>
            <Dialog.Close>
              <Button variant="ghost" color="gray" size="1" style={{ cursor: "pointer" }}>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>

          <Flex direction="column" gap="2">
            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Conversions
            </Text>
            
            {metric.conversions.map((conversion, index) => (
              <Box
                key={index}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--gray-2)",
                  borderRadius: "6px",
                  border: "1px solid var(--gray-4)",
                }}
              >
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">
                    {conversion.label}
                  </Text>
                  <Text size="2" weight="bold" style={{ fontFamily: "monospace" }}>
                    {conversion.value} {conversion.unit}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>

          <Flex justify="end" pt="1">
            <Dialog.Close>
              <Button className={styles.actionButtonSquare} style={{ cursor: "pointer" }}>
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// Conversion functions
export function convertMetric(value: number, unit: string): MetricConversion | null {
  const lowerUnit = unit.toLowerCase();
  
  // Speed conversions
  if (lowerUnit === 'mph') {
    return {
      original: `${value} mph`,
      value,
      unit: 'mph',
      conversions: [
        { value: (value * 1.60934).toFixed(1), unit: 'km/h', label: 'Kilometers per hour' },
        { value: (value * 0.44704).toFixed(1), unit: 'm/s', label: 'Meters per second' },
      ]
    };
  }
  
  if (lowerUnit === 'km/h' || lowerUnit === 'kph') {
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value * 0.621371).toFixed(1), unit: 'mph', label: 'Miles per hour' },
        { value: (value * 0.277778).toFixed(1), unit: 'm/s', label: 'Meters per second' },
      ]
    };
  }
  
  // Distance conversions
  if (lowerUnit === 'meters' || lowerUnit === 'meter' || lowerUnit === 'm') {
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value * 3.28084).toFixed(1), unit: 'feet', label: 'Feet' },
        { value: (value * 1.09361).toFixed(1), unit: 'yards', label: 'Yards' },
      ]
    };
  }
  
  if (lowerUnit === 'feet' || lowerUnit === 'foot' || lowerUnit === 'ft') {
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value * 0.3048).toFixed(1), unit: 'meters', label: 'Meters' },
        { value: (value * 30.48).toFixed(0), unit: 'cm', label: 'Centimeters' },
      ]
    };
  }
  
  if (lowerUnit === 'yards' || lowerUnit === 'yard' || lowerUnit === 'yd') {
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value * 0.9144).toFixed(1), unit: 'meters', label: 'Meters' },
        { value: (value * 3).toFixed(0), unit: 'feet', label: 'Feet' },
      ]
    };
  }
  
  // Time conversions
  if (lowerUnit === 'seconds' || lowerUnit === 'second' || lowerUnit === 'sec' || lowerUnit === 's') {
    if (value < 1) {
      return {
        original: `${value} ${unit}`,
        value,
        unit: lowerUnit,
        conversions: [
          { value: (value * 1000).toFixed(0), unit: 'ms', label: 'Milliseconds' },
        ]
      };
    }
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value * 1000).toFixed(0), unit: 'ms', label: 'Milliseconds' },
        { value: (value / 60).toFixed(2), unit: 'min', label: 'Minutes' },
      ]
    };
  }
  
  if (lowerUnit === 'milliseconds' || lowerUnit === 'millisecond' || lowerUnit === 'ms') {
    return {
      original: `${value} ${unit}`,
      value,
      unit: lowerUnit,
      conversions: [
        { value: (value / 1000).toFixed(3), unit: 's', label: 'Seconds' },
      ]
    };
  }
  
  // Angle conversions
  if (lowerUnit === '°' || lowerUnit === 'degrees' || lowerUnit === 'degree') {
    return {
      original: `${value}°`,
      value,
      unit: '°',
      conversions: [
        { value: (value * Math.PI / 180).toFixed(3), unit: 'rad', label: 'Radians' },
      ]
    };
  }
  
  // No conversion available for percentages, o'clock positions
  return null;
}

