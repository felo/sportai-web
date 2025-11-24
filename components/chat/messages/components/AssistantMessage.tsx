"use client";

import { Box } from "@radix-ui/themes";
import { MarkdownWithSwings } from "@/components/markdown";
import { StreamingIndicator } from "../../feedback/StreamingIndicator";
import { FeedbackButtons } from "../../feedback/FeedbackButtons";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface AssistantMessageProps {
  messageId: string;
  content: string;
  isStreaming?: boolean;
  thinkingMessage: string;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onTTSUsage: (characters: number, cost: number, quality: string) => void;
  onFeedback: () => void;
}

/**
 * Assistant message component with markdown rendering and streaming support
 */
export function AssistantMessage({
  messageId,
  content,
  isStreaming,
  thinkingMessage,
  onAskForHelp,
  onTTSUsage,
  onFeedback,
}: AssistantMessageProps) {
  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      {content ? (
        <>
          <MarkdownWithSwings 
            messageId={messageId} 
            onAskForHelp={onAskForHelp}
            onTTSUsage={onTTSUsage}
            feedbackButtons={!isStreaming ? (
              <FeedbackButtons 
                messageId={messageId}
                onFeedback={onFeedback}
              />
            ) : undefined}
          >
            {content}
          </MarkdownWithSwings>
          {isStreaming && (
            <>
              {console.log("[AssistantMessage] Rendering StreamingIndicator for message:", messageId)}
              <StreamingIndicator />
            </>
          )}
        </>
      ) : (
        <ThinkingIndicator message={thinkingMessage} />
      )}
    </Box>
  );
}

