"use client";

import { VideoIcon } from "@radix-ui/react-icons";
import { StudioPromptCard } from "./StudioPromptCard";

interface MatchReportPromptProps {
  videoUrl: string;
  taskId?: string;
  onOpenReport: () => void;
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

const PROMPT_MESSAGE = `Let's take a look at the Match Report? Dive into game stats, player performance, and tactical insights.`;

/**
 * Prompt message encouraging users to explore match statistics and reports
 * Shows after the analysis is complete
 * Uses the same markdown rendering as other assistant messages for consistent styling
 */
export function MatchReportPrompt({
  onOpenReport,
  onTTSUsage,
}: MatchReportPromptProps) {
  return (
    <StudioPromptCard
      message={PROMPT_MESSAGE}
      buttonLabel="Match Report"
      buttonLoadingLabel="Opening..."
      icon={<VideoIcon width={18} height={18} />}
      messageId="match-report-prompt"
      onAction={onOpenReport}
      onTTSUsage={onTTSUsage}
    />
  );
}









