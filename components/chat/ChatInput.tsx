"use client";

import { useRef, useEffect } from "react";
import { TextArea, Button, Tooltip, Box, Flex, Callout } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import { VideoPreview } from "./VideoPreview";

interface ChatInputProps {
  prompt: string;
  videoFile: File | null;
  videoPreview: string | null;
  error: string | null;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onVideoRemove: () => void;
  onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPickleballCoachClick: () => void;
}

export function ChatInput({
  prompt,
  videoFile,
  videoPreview,
  error,
  loading,
  onPromptChange,
  onVideoRemove,
  onVideoChange,
  onSubmit,
  onPickleballCoachClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Resize textarea when prompt changes (e.g., from Pickleball Coach button)
    // Use multiple approaches to ensure it works with Radix Themes
    const resizeTextarea = () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        // Reset height to auto to get accurate scrollHeight
        textarea.style.height = "auto";
        // Calculate new height based on content
        const newHeight = Math.max(52, Math.min(textarea.scrollHeight, 200));
        textarea.style.height = `${newHeight}px`;
      }
    };

    // Try immediately
    resizeTextarea();
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(resizeTextarea);
    
    // Also use a small timeout as fallback
    const timeoutId = setTimeout(resizeTextarea, 0);
    const timeoutId2 = setTimeout(resizeTextarea, 10);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [prompt]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
    // Auto-resize textarea - use ref to ensure we get the correct element
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste and resize after paste content is inserted
    // Use multiple timeouts to ensure resize happens after paste is fully processed
    setTimeout(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, 0);
    // Also resize after a slightly longer delay to catch any async updates
    setTimeout(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <Box
      className="sticky bottom-0 z-20"
      style={{
        borderTop: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-background)",
        padding: "var(--space-4)",
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      {error && (
        <Callout.Root color="red" mb="3">
          <Callout.Text size="2">{error}</Callout.Text>
        </Callout.Root>
      )}

      <form onSubmit={onSubmit}>
        <Flex direction="column" gap="3">
          {videoFile && videoPreview && (
            <VideoPreview
              videoFile={videoFile}
              videoPreview={videoPreview}
              onRemove={onVideoRemove}
            />
          )}

          <Flex gap="2" align="center">
            <Box position="relative" style={{ flex: 1 }}>
              <TextArea
                ref={textareaRef}
                value={prompt}
                onChange={handleTextareaChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything sports related"
                aria-label="Chat input"
                rows={1}
                resize="none"
                style={{
                  minHeight: "52px",
                  maxHeight: "200px",
                  paddingRight: "100px",
                  overflowY: "auto",
                }}
              />
              <Box
                position="absolute"
                style={{
                  right: "var(--space-2)",
                  bottom: "var(--space-2)",
                }}
              >
                <Tooltip content="Use Pickleball Coach prompt">
                  <Button
                    type="button"
                    onClick={onPickleballCoachClick}
                    size="1"
                    color="green"
                    variant="solid"
                  >
                    🎾 Coach
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            <Tooltip content="Upload video or image">
              <label
                htmlFor="video"
                style={{
                  border: "2px dashed var(--gray-6)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-3)",
                  minHeight: "52px",
                  minWidth: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
                  e.currentTarget.style.borderColor = "var(--gray-8)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
                  e.currentTarget.style.borderColor = "var(--gray-6)";
                }}
              >
                <input
                  id="video"
                  type="file"
                  accept="video/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={onVideoChange}
                  style={{ display: "none" }}
                />
                <VideoIcon width="24" height="24" color="var(--gray-9)" />
              </label>
            </Tooltip>
          </Flex>
        </Flex>
      </form>
    </Box>
  );
}

