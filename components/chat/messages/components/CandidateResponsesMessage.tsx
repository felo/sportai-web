"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import type { CandidateOption } from "@/types/chat";

interface CandidateResponsesMessageProps {
  introText?: string;
  options: CandidateOption[];
  selectedIndex?: number;
  onSelect: (index: number, option: CandidateOption) => void;
  isLoadedFromServer?: boolean;
}

/**
 * Interactive message component showing 1-3 candidate responses
 * User clicks one to select it as their response
 * Parent container handles right-alignment (no avatar, justify: end)
 */
export function CandidateResponsesMessage({
  options,
  selectedIndex,
  onSelect,
  isLoadedFromServer = false,
}: CandidateResponsesMessageProps) {
  const [showCards, setShowCards] = useState(isLoadedFromServer || selectedIndex !== undefined);

  // Animate cards appearing
  useEffect(() => {
    if (!showCards && selectedIndex === undefined) {
      const timer = setTimeout(() => setShowCards(true), 100);
      return () => clearTimeout(timer);
    }
  }, [showCards, selectedIndex]);

  const handleSelect = (index: number) => {
    if (selectedIndex !== undefined) return; // Already selected
    onSelect(index, options[index]);
  };

  // Don't render if already selected
  if (selectedIndex !== undefined) {
    return null;
  }

  return (
    <Box>
      <Flex 
        direction="column"
        align="end"
        gap="2"
        style={{
          opacity: showCards ? 1 : 0,
          transform: showCards ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.4s ease-out",
        }}
      >
        {options.map((option, index) => (
          <Box
            key={option.id}
            onClick={() => handleSelect(index)}
            style={{
              cursor: "pointer",
              borderRadius: "24px 8px 24px 24px",
              padding: "var(--space-3) var(--space-4)",
              border: "2px solid white",
              backgroundColor: "#7ADB8F",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
              transition: "all 0.3s ease-out",
            }}
            className="candidate-option-card"
          >
            <Text 
              size="2"
              weight="medium"
              style={{ color: "#1C1C1C" }}
            >
              {option.text}
            </Text>
          </Box>
        ))}
      </Flex>

      <style jsx>{`
        :global(.candidate-option-card) {
          transition: all 0.3s ease-out;
        }
        :global(.candidate-option-card:hover) {
          transform: translateY(-2px);
          background-color: #95E5A6 !important;
          box-shadow: 
            0 0 20px rgba(122, 219, 143, 0.6),
            0 0 40px rgba(122, 219, 143, 0.4),
            0 4px 16px rgba(122, 219, 143, 0.5) !important;
        }
      `}</style>
    </Box>
  );
}
