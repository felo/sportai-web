"use client";

import Image from "next/image";
import { Text } from "@radix-ui/themes";
import { MessageBubble } from "./MessageBubble";
import { ProgressIndicator } from "../feedback/ProgressIndicator";
import { URLs } from "@/lib/config";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Message, ProgressStage } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  videoFile: File | null;
  progressStage: ProgressStage;
  uploadProgress: number;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  onRetryMessage?: (messageId: string) => void;
  retryingMessageId?: string | null;
}

export function MessageList({
  messages,
  loading,
  videoFile,
  progressStage,
  uploadProgress,
  messagesEndRef,
  scrollContainerRef,
  onAskForHelp,
  onUpdateMessage,
  onRetryMessage,
  retryingMessageId,
}: MessageListProps) {
  const isMobile = useIsMobile();
  
  console.log("[MessageList] Render:", {
    messagesCount: messages.length,
    loading,
    messageIds: messages.map(m => m.id),
  });
  
  return (
    <div 
      className="flex-1 pb-24 space-y-6" 
      style={{ 
        paddingTop: isMobile ? "calc(57px + env(safe-area-inset-top) + 1rem)" : "1.5rem", // Account for header + safe area
        paddingLeft: isMobile ? "1rem" : "1rem",
      }}
      role="log" 
      aria-label="Chat messages"
    >
      {messages.length === 0 && (
        <div 
          className="flex flex-col items-center justify-start pt-12" 
          role="status"
          style={{
            width: "100%",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "min(600px, 80vw)",
              height: "auto",
              marginBottom: "var(--space-4)",
            }}
          >
            <Image
              src={URLs.logo}
              alt="SportAI"
              width={600}
              height={190}
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                objectPosition: "center top",
              }}
              priority
            />
          </div>
          <Text
            size="5"
            align="center"
            color="gray"
            style={{
              margin: 0,
            }}
          >
            AI-powered technique & tactical analysis
          </Text>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          allMessages={messages} 
          messageIndex={index}
          scrollContainerRef={scrollContainerRef}
          onAskForHelp={onAskForHelp}
          onUpdateMessage={onUpdateMessage}
          onRetryMessage={onRetryMessage}
          isRetrying={retryingMessageId === message.id}
        />
      ))}

      {loading && videoFile && (
        <ProgressIndicator
          progressStage={progressStage}
          uploadProgress={uploadProgress}
          hasVideo={!!videoFile}
        />
      )}

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
}

