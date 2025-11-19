"use client";

import { useRef, useEffect, useState } from "react";
import { TextArea, Button, Tooltip, Box, Flex, Callout, Text } from "@radix-ui/themes";
import { ArrowUpIcon, PlusIcon } from "@radix-ui/react-icons";
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
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Set initial height to two lines (80px total including padding)
    if (textareaRef.current) {
      // Ensure it starts at exactly 80px
      textareaRef.current.style.height = "80px";
    }
  }, []);

  useEffect(() => {
    // Skip resize on initial mount if empty
    if (!prompt.trim()) {
      if (textareaRef.current) {
        textareaRef.current.style.height = "80px";
      }
      return;
    }

    // Resize when prompt changes (e.g., from Pickleball Coach button)
    // Use double requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          // Temporarily set to auto to measure scrollHeight
          textarea.style.height = "auto";
          const scrollHeight = textarea.scrollHeight;
          
          // Base height is 80px (includes padding)
          // Only resize if content actually exceeds this base height
          if (scrollHeight > 80) {
            textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
          } else {
            // Keep at two lines
            textarea.style.height = "80px";
          }
        }
      });
    });
  }, [prompt]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onPromptChange(newValue);
    
    // Use requestAnimationFrame to ensure DOM is updated before measuring
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        
        // If empty, keep at two lines
        if (!newValue.trim()) {
          textarea.style.height = "80px";
          return;
        }
        
        // Temporarily set to auto to measure scrollHeight
        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        
        // Base height is 80px (includes padding)
        // Only resize if content actually exceeds this base height
        if (scrollHeight > 80) {
          textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
        } else {
          // Keep at two lines
          textarea.style.height = "80px";
        }
      }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste and resize after paste content is inserted
    // Use timeout to ensure resize happens after paste is fully processed
    setTimeout(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        
        // Temporarily set to auto to measure scrollHeight
        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        
        // Base height is 80px (includes padding)
        // Only resize if content actually exceeds this base height
        if (scrollHeight > 80) {
          textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
        } else {
          // Keep at two lines
          textarea.style.height = "80px";
        }
      }
    }, 0);
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
        backgroundColor: "var(--color-background)",
        paddingBottom: "var(--space-4)",
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      {error && (
        <Callout.Root color="red" mb="3">
          <Callout.Text size="2">{error}</Callout.Text>
        </Callout.Root>
      )}

      <form onSubmit={onSubmit}>
        <Flex direction="column" gap="4">
          {videoFile && videoPreview && (
            <VideoPreview
              videoFile={videoFile}
              videoPreview={videoPreview}
              onRemove={onVideoRemove}
            />
          )}

          <Box
            style={{
              width: "100%",
              border: isFocused ? "1px solid var(--mint-6)" : "1px solid var(--gray-6)",
              borderRadius: "var(--radius-3)",
              backgroundColor: "var(--color-background)",
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
              filter: isFocused 
                ? "drop-shadow(0 2px 1px rgba(116, 188, 156, 0.3)) drop-shadow(0 2px 2px rgba(116, 188, 156, 0.4)) drop-shadow(0 8px 12px rgba(116, 188, 156, 0.2))" 
                : "none",
              transition: "border-color 0.2s ease, filter 0.2s ease",
            }}
          >
            <TextArea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask anything sports related…"
              aria-label="Chat input"
              resize="none"
              size="3"
              style={{
                maxHeight: "300px",
                padding: "var(--space-3)",
                paddingBottom: "var(--space-2)",
                overflowY: "auto",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: 0,
                outline: "none",
                boxShadow: "none",
              }}
            />
            
            {/* Buttons row */}
            <Flex
              align="center"
              justify="between"
              style={{
                padding: "var(--space-2) var(--space-3)",
              }}
            >
              {/* Plus button */}
              <Tooltip content="Upload video or image">
                <label
                  htmlFor="video"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "var(--gray-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    border: "none",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-4)";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                  }}
                >
                  <input
                    id="video"
                    type="file"
                    accept="video/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={onVideoChange}
                    style={{ display: "none" }}
                  />
                  <PlusIcon width="16" height="16" color="var(--gray-11)" />
                </label>
              </Tooltip>

              {/* Submit button */}
              <Tooltip content="Send message">
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: loading || !prompt.trim() ? "var(--gray-3)" : "var(--gray-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s",
                    border: "none",
                    opacity: loading || !prompt.trim() ? 0.5 : 1,
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    if (!loading && prompt.trim()) {
                      e.currentTarget.style.backgroundColor = "var(--gray-4)";
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                  }}
                >
                  <ArrowUpIcon width="16" height="16" color={loading || !prompt.trim() ? "var(--gray-9)" : "var(--gray-11)"} />
                </button>
              </Tooltip>
            </Flex>
          </Box>

          {/* Disclaimer text */}
          <Text size="1" color="gray" style={{ textAlign: "center", marginTop: "var(--space-1)", marginBottom: 0 }}>
            This is a demo of the SportAI API, and may contain errors. For enterprise-level precision, performance, and dedicated support, please contact us.
          </Text>
        </Flex>
      </form>
    </Box>
  );
}

