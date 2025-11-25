"use client";

import { Box } from "@radix-ui/themes";
import { MarkdownWithSwings } from "@/components/markdown";
import { StreamingIndicator } from "../../feedback/StreamingIndicator";
import { FeedbackButtons } from "../../feedback/FeedbackButtons";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { IncompleteMessageRecovery } from "./IncompleteMessageRecovery";

interface AssistantMessageProps {
  messageId: string;
  content: string;
  isStreaming?: boolean;
  isIncomplete?: boolean;
  thinkingMessage: string;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onTTSUsage: (characters: number, cost: number, quality: string) => void;
  onFeedback: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Assistant message component with markdown rendering and streaming support
 */
export function AssistantMessage({
  messageId,
  content,
  isStreaming,
  isIncomplete,
  thinkingMessage,
  onAskForHelp,
  onTTSUsage,
  onFeedback,
  onRetry,
  isRetrying,
}: AssistantMessageProps) {
  // Show recovery UI if message is incomplete and not currently streaming
  const showRecovery = isIncomplete && !isStreaming && onRetry;
  
  return (
    <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
      {content ? (
        <>
          <MarkdownWithSwings 
            messageId={messageId} 
            onAskForHelp={onAskForHelp}
            onTTSUsage={onTTSUsage}
            feedbackButtons={!isStreaming && !isIncomplete ? (
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
          {showRecovery && (
            <IncompleteMessageRecovery
              hasPartialContent={content.trim().length > 0}
              onRetry={onRetry}
              isRetrying={isRetrying}
            />
          )}
        </>
      ) : isIncomplete && onRetry ? (
        <IncompleteMessageRecovery
          hasPartialContent={false}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : (
        <ThinkingIndicator message={thinkingMessage} />
      )}
    </Box>
  );
}

