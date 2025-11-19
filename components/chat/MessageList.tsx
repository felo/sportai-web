import { MessageBubble } from "./MessageBubble";
import { ProgressIndicator } from "./ProgressIndicator";
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
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
          <p className="text-lg mb-2">Start analysing with SportAI</p>
          <p className="text-sm">Ask questions or upload a sports video for analysis</p>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {loading && videoFile && (
        <ProgressIndicator
          progressStage={progressStage}
          uploadProgress={uploadProgress}
          hasVideo={!!videoFile}
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

