"use client";

import { Box, Button, Text } from "@radix-ui/themes";
import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  showWhen?: boolean; // Optional visibility control
  variant?: "ghost" | "soft" | "solid";
}

/**
 * A reusable collapsible section component with expand/collapse functionality.
 * Used for grouping related controls in a clean, space-efficient way.
 */
export function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
  showWhen = true,
  variant = "ghost",
}: CollapsibleSectionProps) {
  if (!showWhen) return null;

  return (
    <>
      <Box style={{ paddingTop: "var(--space-3)" }}>
        <Button
          variant={variant}
          onClick={onToggle}
          style={{
            width: "100%",
            justifyContent: "space-between",
            padding: "var(--space-3)",
          }}
        >
          <Text size="2" weight="medium">{title}</Text>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </Box>
      {isExpanded && children}
    </>
  );
}

