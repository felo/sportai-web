"use client";

import { chatLogger } from "@/lib/logger";
import { MessageBubble } from "./MessageBubble";
import { ScrollSpacer } from "./ScrollSpacer";
import { ConversationLimitBanner, FREE_TIER_MESSAGE_LIMIT } from "./components";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Message, ProgressStage, CandidateOption } from "@/types/chat";

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
  // Technique Studio handler
  onOpenTechniqueStudio?: (videoUrl: string, taskId?: string) => void;
  // Candidate responses handler
  onSelectCandidateResponse?: (messageId: string, index: number, option: CandidateOption) => void;
  // Track which messages were loaded from storage (not created in this session)
  loadedMessageIds?: Set<string>;
  // Start new chat handler for conversation limit
  onStartNewChat?: () => void;
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
  onOpenTechniqueStudio,
  onSelectCandidateResponse,
  loadedMessageIds,
  onStartNewChat,
}: MessageListProps) {
  const isMobile = useIsMobile();
  
  // Count user messages for conversation limit
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const hasReachedLimit = userMessageCount >= FREE_TIER_MESSAGE_LIMIT;
  
  chatLogger.debug("[MessageList] Render:", {
    messagesCount: messages.length,
    userMessageCount,
    hasReachedLimit,
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
          onOpenTechniqueStudio={onOpenTechniqueStudio}
          onSelectCandidateResponse={onSelectCandidateResponse}
          // Pass progress info to the last message (the assistant message being generated)
          progressStage={index === messages.length - 1 ? progressStage : "idle"}
          uploadProgress={index === messages.length - 1 ? uploadProgress : 0}
          isLoadedFromServer={loadedMessageIds?.has(message.id) ?? false}
        />
      ))}

      {/* Conversation limit banner */}
      <ConversationLimitBanner 
        show={hasReachedLimit} 
        onStartNewChat={onStartNewChat}
      />

      {/* Ref for scrollToBottom functionality */}
      <div ref={messagesEndRef} aria-hidden="true" />
      
      {/* Dynamic spacer: allows last message to scroll to top but prevents over-scrolling (like ChatGPT) */}
      <ScrollSpacer scrollContainerRef={scrollContainerRef} />
    </div>
  );
}

