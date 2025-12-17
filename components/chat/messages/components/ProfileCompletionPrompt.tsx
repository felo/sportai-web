"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Button, Spinner } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { MarkdownWithSwings } from "@/components/markdown";
import buttonStyles from "@/styles/buttons.module.css";

interface ProfileCompletionPromptProps {
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

const PROMPT_MESSAGE = `I noticed your profile isn't complete yet. **Add your name** so I can personalize your coaching experience!`;

/**
 * Prompt message encouraging users to complete their profile
 * Shows when user is signed in but has no name set (common with Apple Sign In)
 * Uses the same styling as TechniqueStudioPrompt for consistency
 */
export function ProfileCompletionPrompt({
  onTTSUsage,
}: ProfileCompletionPromptProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    router.push("/profile");
  };

  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      <MarkdownWithSwings 
        messageId="profile-completion-prompt"
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
            <PersonIcon width={18} height={18} />
          )}
          {isLoading ? "Opening..." : "Complete Profile"}
        </Button>
      </Flex>
    </Box>
  );
}

