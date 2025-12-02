"use client";

import Image from "next/image";
import { Text } from "@radix-ui/themes";
import { MessageBubble } from "./MessageBubble";
import { ScrollSpacer } from "./ScrollSpacer";
import { URLs } from "@/lib/config";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Message, ProgressStage } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  progressStage: ProgressStage;
  uploadProgress: number;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  onRetryMessage?: (messageId: string) => void;
  retryingMessageId?: string | null;
  // Analysis options handlers for PRO eligibility
  onSelectProPlusQuick?: (messageId: string) => void;
  onSelectQuickOnly?: (messageId: string) => void;
}

export function MessageList({
  messages,
  loading,
  progressStage,
  uploadProgress,
  messagesEndRef,
  scrollContainerRef,
  onAskForHelp,
  onUpdateMessage,
  onRetryMessage,
  retryingMessageId,
  onSelectProPlusQuick,
  onSelectQuickOnly,
}: MessageListProps) {
  const isMobile = useIsMobile();
  
  console.log("[MessageList] Render:", {
    messagesCount: messages.length,
    loading,
    messageIds: messages.map(m => m.id),
  });
  
  return (
    <div 
      className="flex-1 space-y-6" 
      style={{ 
        paddingTop: isMobile ? "calc(57px + env(safe-area-inset-top) + 1rem)" : "1.5rem", // Account for header + safe area
        paddingLeft: isMobile ? "1rem" : "1rem",
        paddingBottom: "1rem",
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
          onSelectProPlusQuick={onSelectProPlusQuick}
          onSelectQuickOnly={onSelectQuickOnly}
          // Pass progress info to the last message (the assistant message being generated)
          progressStage={index === messages.length - 1 ? progressStage : "idle"}
          uploadProgress={index === messages.length - 1 ? uploadProgress : 0}
        />
      ))}

      {/* Ref for scrollToBottom functionality */}
      <div ref={messagesEndRef} aria-hidden="true" />
      
      {/* Dynamic spacer: allows last message to scroll to top but prevents over-scrolling (like ChatGPT) */}
      <ScrollSpacer scrollContainerRef={scrollContainerRef} />
    </div>
  );
}

