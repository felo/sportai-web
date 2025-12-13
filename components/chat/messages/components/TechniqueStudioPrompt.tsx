"use client";

import { useState } from "react";
import { Box, Button, Flex, Spinner } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import { MarkdownWithSwings } from "@/components/markdown";
import buttonStyles from "@/styles/buttons.module.css";

interface TechniqueStudioPromptProps {
  videoUrl: string;
  taskId?: string;
  onOpenStudio: () => void;
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

const PROMPT_MESSAGE = `Want to study your video in more detail? Open the **Technique Studio** to analyze body angles, track joint movements, and step through each frame.`;

/**
 * Prompt message encouraging users to explore their video in the Technique Studio
 * Shows after the quick analysis is complete
 * Uses the same markdown rendering as other assistant messages for consistent styling
 */
export function TechniqueStudioPrompt({
  onOpenStudio,
  onTTSUsage,
}: TechniqueStudioPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onOpenStudio();
  };

  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      <MarkdownWithSwings 
        messageId="technique-studio-prompt"
        onTTSUsage={onTTSUsage}
      >
        {PROMPT_MESSAGE}
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
          {isLoading ? "Opening..." : "Technique Studio"}
        </Button>
      </Flex>
    </Box>
  );
}

