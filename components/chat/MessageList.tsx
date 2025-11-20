"use client";

import Image from "next/image";
import { Text } from "@radix-ui/themes";
import { MessageBubble } from "./MessageBubble";
import { ProgressIndicator } from "./ProgressIndicator";
import { URLs } from "@/lib/config";
import type { Message, ProgressStage } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  videoFile: File | null;
  progressStage: ProgressStage;
  uploadProgress: number;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({
  messages,
  loading,
  videoFile,
  progressStage,
  uploadProgress,
  messagesEndRef,
}: MessageListProps) {
  console.log("[MessageList] Render:", {
    messagesCount: messages.length,
    loading,
    messageIds: messages.map(m => m.id),
  });
  
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 space-y-6" role="log" aria-label="Chat messages">
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
        <MessageBubble key={message.id} message={message} allMessages={messages} messageIndex={index} />
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

