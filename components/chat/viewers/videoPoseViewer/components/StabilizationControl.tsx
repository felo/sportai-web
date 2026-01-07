"use client";

import { Box, Flex, Text, Switch, Slider } from "@radix-ui/themes";
import * as Popover from "@radix-ui/react-popover";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

interface StabilizationControlProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  strength: number;
  onStrengthChange: (strength: number) => void;
}

export function StabilizationControl({
  enabled,
  onEnabledChange,
  strength,
  onStrengthChange,
}: StabilizationControlProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          className={buttonStyles.actionButtonSquare}
          size="2"
          style={{
            opacity: enabled ? 1 : 0.6,
          }}
        >
          <MixerHorizontalIcon width="16" height="16" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          style={{
            backgroundColor: "var(--gray-2)",
            border: "1px solid var(--gray-6)",
            borderRadius: "var(--radius-3)",
            padding: "var(--space-3)",
            minWidth: "220px",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        >
          <Flex direction="column" gap="3">
            <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
              Joint Stabilization
            </Text>
            
            <Text size="1" color="gray">
              Reduces noise/shakiness by locking stationary joints in place.
            </Text>

            <Flex align="center" justify="between">
              <Text size="2" style={{ color: "var(--gray-11)" }}>
                Enable
              </Text>
              <Switch
                checked={enabled}
                onCheckedChange={onEnabledChange}
                size="1"
              />
            </Flex>

            {enabled && (
              <Flex direction="column" gap="2">
                <Flex align="center" justify="between">
                  <Text size="2" style={{ color: "var(--gray-11)" }}>
                    Strength
                  </Text>
                  <Text size="1" color="gray">
                    {Math.round(strength * 100)}%
                  </Text>
                </Flex>
                <Slider
                  value={[strength]}
                  onValueChange={(values) => onStrengthChange(values[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  size="1"
                />
                <Flex justify="between">
                  <Text size="1" color="gray">Subtle</Text>
                  <Text size="1" color="gray">Strong</Text>
                </Flex>
              </Flex>
            )}
          </Flex>
          <Popover.Arrow
            style={{
              fill: "var(--gray-6)",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}














