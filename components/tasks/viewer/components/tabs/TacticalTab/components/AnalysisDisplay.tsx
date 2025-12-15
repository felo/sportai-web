"use client";

import { ReactNode } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { MarkdownWithSwings } from "@/components/markdown";
import { CollapsibleSection } from "@/components/ui";
import { StreamingIndicator } from "@/components/chat";
import type { BallSequenceClickData } from "../types";

interface AnalysisDisplayProps {
  title: ReactNode;
  isAnalyzing: boolean;
  analysis: string | null;
  error: string | null;
  onBallSequenceClick?: (data: BallSequenceClickData) => void;
}

export function AnalysisDisplay({
  title,
  isAnalyzing,
  analysis,
  error,
  onBallSequenceClick,
}: AnalysisDisplayProps) {
  const hasResults = analysis || isAnalyzing || error;

  if (!hasResults) return null;

  return (
    <CollapsibleSection title={title} defaultOpen>
      {error ? (
        <Text size="2" color="red">{error}</Text>
      ) : analysis ? (
        <>
          <Box className="prose dark:prose-invert" style={{ maxWidth: "none", fontSize: "14px" }}>
            <MarkdownWithSwings onBallSequenceClick={onBallSequenceClick}>
              {analysis}
            </MarkdownWithSwings>
          </Box>
          {isAnalyzing && <StreamingIndicator />}
        </>
      ) : isAnalyzing ? (
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">Finding tactical patterns…</Text>
          <StreamingIndicator />
        </Flex>
      ) : null}
    </CollapsibleSection>
  );
}





