"use client";

import { useState } from "react";
import { Box, Button, Flex, Spinner } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import { MarkdownWithSwings } from "@/components/markdown";
import buttonStyles from "@/styles/buttons.module.css";
import type { AnalysisType } from "@/components/tasks/sampleTasks";

interface StudioPromptProps {
  videoUrl: string;
  taskId?: string;
  analysisType?: AnalysisType;
  onOpenStudio: () => void;
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

const PROMPT_MESSAGES = {
  technique: `Want to study your video in more detail? Open the **Technique Studio** to analyze body angles, track joint movements, and step through each frame.`,
  match: `Want to study your video in more detail? Open the **Match Studio** to analyze rallies, review tactics, and see detailed player statistics.`,
} as const;

const BUTTON_LABELS = {
  technique: "Technique Studio",
  match: "Match Studio",
} as const;

/**
 * Prompt message encouraging users to explore their video in the appropriate Studio.
 * Shows after the quick analysis is complete.
 * Uses analysisType to determine whether to show Technique Studio or Match Studio.
 */
export function TechniqueStudioPrompt({
  analysisType = "technique",
  onOpenStudio,
  onTTSUsage,
}: StudioPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onOpenStudio();
  };

  const promptMessage = PROMPT_MESSAGES[analysisType];
  const buttonLabel = BUTTON_LABELS[analysisType];

  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      <MarkdownWithSwings 
        messageId="studio-prompt"
        onTTSUsage={onTTSUsage}
      >
        {promptMessage}
      </MarkdownWithSwings>
      
      <Flex mt="3">
        <Button
          size="3"
          className={`${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`}
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size="2" />
          ) : (
            <VideoIcon width={18} height={18} />
          )}
          {isLoading ? "Opening..." : buttonLabel}
        </Button>
      </Flex>
    </Box>
  );
}
