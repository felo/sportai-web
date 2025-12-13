"use client";

import { Box } from "@radix-ui/themes";
import { chatLogger } from "@/lib/logger";
import { useFloatingVideoContextOptional } from "@/components/chat/viewers/FloatingVideoContext";
import { MarkdownWithSwings } from "@/components/markdown";
import { StreamingIndicator } from "../../feedback/StreamingIndicator";
import { FeedbackButtons } from "../../feedback/FeedbackButtons";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { IncompleteMessageRecovery } from "./IncompleteMessageRecovery";
import { useEffect, useRef } from "react";

interface AssistantMessageProps {
  messageId: string;
  chatId?: string;
  content: string;
  videoUrl?: string;
  isStreaming?: boolean;
  isIncomplete?: boolean;
  isGreeting?: boolean; // Hide feedback buttons for greeting/premade responses
  thinkingMessage: string;
  showProgressBar?: boolean;
  uploadProgress?: number; // Actual upload progress (0-100) when uploading
  onAskForHelp?: (termName: string, swing?: any) => void;
  onTTSUsage: (characters: number, cost: number, quality: string) => void;
  onFeedbackSubmitted?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Assistant message component with markdown rendering and streaming support
 */
export function AssistantMessage({
  messageId,
  chatId,
  content,
  videoUrl,
  isStreaming,
  isIncomplete,
  isGreeting,
  thinkingMessage,
  showProgressBar = false,
  uploadProgress,
  onAskForHelp,
  onTTSUsage,
  onFeedbackSubmitted,
  onRetry,
  isRetrying,
}: AssistantMessageProps) {
  const floatingCtx = useFloatingVideoContextOptional();
  const floatingCtxRef = useRef(floatingCtx);
  useEffect(() => {
    floatingCtxRef.current = floatingCtx;
  }, [floatingCtx]);
  
  // Register any assistant-rendered videos via MarkdownWithSwings callbacks
  // Note: MarkdownWithSwings already wires timestamp clicks; we add video registration here
  const handleRegisterVideo = (id: string, videoRef: React.RefObject<HTMLElement>, videoSrc: string) => {
    const ctx = floatingCtx;
    if (!ctx) return;
    ctx.registerVideo(
      id,
      videoRef,
      videoSrc,
      () => (
        <video
          key={id}
          src={videoSrc}
          controls
          autoPlay
          playsInline
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
          }}
        />
      )
    );
  };

  // Register directly from message videoUrl (DB source of truth), one-per-message
  useEffect(() => {
    const ctx = floatingCtxRef.current;
    if (!ctx || !messageId) return;
    if (!videoUrl) return;

    const regId = `assistant-msg-${messageId}`;
    if (ctx.registeredVideos?.has(regId)) return;

    ctx.registerVideo(
      regId,
      { current: null },
      videoUrl,
      () => (
        <video
          key={regId}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
          }}
        />
      )
    );

    return () => {
      ctx.unregisterVideo(regId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, videoUrl]);

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
            feedbackButtons={!isStreaming && !isIncomplete && !isGreeting ? (
              <FeedbackButtons 
                messageId={messageId}
                chatId={chatId}
                messageContent={content}
                onFeedback={() => onFeedbackSubmitted?.()}
              />
            ) : undefined}
          >
            {content}
          </MarkdownWithSwings>
          {isStreaming && (
            <>
              {chatLogger.debug("[AssistantMessage] Rendering StreamingIndicator for message:", messageId)}
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
        <ThinkingIndicator message={thinkingMessage} showProgressBar={showProgressBar} uploadProgress={uploadProgress} />
      )}
    </Box>
  );
}

