"use client";

import { useState } from "react";
import { Box, Flex, Text, Button, Card, Select } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import {
  COMMON_SWINGS,
  TENNIS_SWINGS,
  PADEL_SWINGS,
  PICKLEBALL_SWINGS,
  getSwingLabel,
} from "@/components/shared/swingTypes";
import { MINT_COLOR } from "../../input/VideoEligibilityIndicator";
import buttonStyles from "@/styles/buttons.module.css";

interface SwingSelectionCardProps {
  sport: "tennis" | "pickleball" | "padel" | "other";
  isLoading?: boolean;
  showCard?: boolean;
  showButton?: boolean;
  onAnalyze: (swingType: string, swingLabel: string, dominantHand: "left" | "right") => void;
}

// Swing types that support in-depth Shark API analysis
const IN_DEPTH_SWING_TYPES = ["forehand_drive", "backhand_drive"];

/**
 * Check if a swing type supports in-depth analysis via Shark API
 */
function hasInDepthAnalysis(swingValue: string): boolean {
  return IN_DEPTH_SWING_TYPES.includes(swingValue);
}

/**
 * Card component for selecting swing type and dominant hand
 * Used in technique video analysis flow
 */
export function SwingSelectionCard({
  sport,
  isLoading = false,
  showCard = true,
  showButton = true,
  onAnalyze,
}: SwingSelectionCardProps) {
  const [selectedSwing, setSelectedSwing] = useState<string | null>(null);
  const [dominantHand, setDominantHand] = useState<"left" | "right" | null>(null);

  const canSubmit = selectedSwing && dominantHand;

  const handleSubmit = () => {
    if (canSubmit) {
      // Pass swing selection to parent for analysis
      const label = getSwingLabel(selectedSwing, sport) || selectedSwing;
      onAnalyze(selectedSwing, label, dominantHand);
    }
  };

  return (
    <>
      {/* Swing selection card */}
      <Card
        style={{
          border: `1px solid ${MINT_COLOR}`,
          opacity: showCard ? 1 : 0,
          transform: showCard ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease-out",
          marginBottom: "var(--space-4)",
        }}
      >
        <Flex direction="column" gap="4" p="4">
          {/* Swing type dropdown */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
              Swing Type
            </Text>
            <Select.Root
              value={selectedSwing || undefined}
              onValueChange={setSelectedSwing}
            >
              <Select.Trigger
                placeholder="Select the swing you hit..."
                style={{ width: "100%" }}
              />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Common Shots</Select.Label>
                  {COMMON_SWINGS.map((swing) => (
                    <Select.Item
                      key={swing.value}
                      value={swing.value}
                    >
                      {swing.label}{hasInDepthAnalysis(swing.value) && " (in-depth analysis)"}
                    </Select.Item>
                  ))}
                </Select.Group>
                {sport === "tennis" && TENNIS_SWINGS.length > 0 && (
                  <Select.Group>
                    <Select.Label>Tennis Specific</Select.Label>
                    {TENNIS_SWINGS.map((swing) => (
                      <Select.Item
                        key={swing.value}
                        value={swing.value}
                      >
                        {swing.label}{hasInDepthAnalysis(swing.value) && " (in-depth analysis)"}
                      </Select.Item>
                    ))}
                  </Select.Group>
                )}
                {sport === "padel" && PADEL_SWINGS.length > 0 && (
                  <Select.Group>
                    <Select.Label>Padel Specific</Select.Label>
                    {PADEL_SWINGS.map((swing) => (
                      <Select.Item
                        key={swing.value}
                        value={swing.value}
                      >
                        {swing.label}{hasInDepthAnalysis(swing.value) && " (in-depth analysis)"}
                      </Select.Item>
                    ))}
                  </Select.Group>
                )}
                {sport === "pickleball" && PICKLEBALL_SWINGS.length > 0 && (
                  <Select.Group>
                    <Select.Label>Pickleball Specific</Select.Label>
                    {PICKLEBALL_SWINGS.map((swing) => (
                      <Select.Item
                        key={swing.value}
                        value={swing.value}
                      >
                        {swing.label}{hasInDepthAnalysis(swing.value) && " (in-depth analysis)"}
                      </Select.Item>
                    ))}
                  </Select.Group>
                )}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Dominant hand selector */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
              Dominant Hand
            </Text>
            <Flex gap="2">
              <Button
                type="button"
                size="2"
                variant={dominantHand === "left" ? "solid" : "outline"}
                style={{
                  flex: 1,
                  backgroundColor: dominantHand === "left" ? MINT_COLOR : "transparent",
                  color: dominantHand === "left" ? "#1C1C1C" : "var(--gray-11)",
                  borderColor: dominantHand === "left" ? MINT_COLOR : "var(--gray-6)",
                }}
                onClick={() => setDominantHand("left")}
              >
                Left-Handed
              </Button>
              <Button
                type="button"
                size="2"
                variant={dominantHand === "right" ? "solid" : "outline"}
                style={{
                  flex: 1,
                  backgroundColor: dominantHand === "right" ? MINT_COLOR : "transparent",
                  color: dominantHand === "right" ? "#1C1C1C" : "var(--gray-11)",
                  borderColor: dominantHand === "right" ? MINT_COLOR : "var(--gray-6)",
                }}
                onClick={() => setDominantHand("right")}
              >
                Right-Handed
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Analyze button */}
      <Box
        style={{
          opacity: showButton ? 1 : 0,
          transform: showButton ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease-out",
        }}
      >
        <Button
          size="3"
          className={`${buttonStyles.actionButtonSquare} ${canSubmit ? buttonStyles.actionButtonPulse : ""}`}
          disabled={!canSubmit || isLoading}
          style={{ width: "100%" }}
          onClick={handleSubmit}
        >
          <RocketIcon width={18} height={18} />
          Analyse Swing
        </Button>
      </Box>
    </>
  );
}
