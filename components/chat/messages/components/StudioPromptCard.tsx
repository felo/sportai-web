"use client";

import { useState } from "react";
import { Box, Button, Flex, Spinner } from "@radix-ui/themes";
import { MarkdownWithSwings } from "@/components/markdown";
import buttonStyles from "@/styles/buttons.module.css";

interface StudioPromptCardProps {
  /** The markdown message to display */
  message: string;
  /** The button label text */
  buttonLabel: string;
  /** The loading state button label */
  buttonLoadingLabel?: string;
  /** Icon to show in the button */
  icon: React.ReactNode;
  /** Unique ID for the markdown component */
  messageId: string;
  /** Callback when the button is clicked */
  onAction: () => void;
  /** Optional callback for TTS usage tracking */
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

/**
 * Shared prompt card component for studio-style CTAs
 * Used by TechniqueStudioPrompt, MatchReportPrompt, etc.
 * Renders a markdown message with a styled action button
 */
export function StudioPromptCard({
  message,
  buttonLabel,
  buttonLoadingLabel = "Opening...",
  icon,
  messageId,
  onAction,
  onTTSUsage,
}: StudioPromptCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onAction();
  };

  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      <MarkdownWithSwings messageId={messageId} onTTSUsage={onTTSUsage}>
        {message}
      </MarkdownWithSwings>

      <Flex mt="3">
        <Button
          size="3"
          className={`${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`}
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? <Spinner size="2" /> : icon}
          {isLoading ? buttonLoadingLabel : buttonLabel}
        </Button>
      </Flex>
    </Box>
  );
}
