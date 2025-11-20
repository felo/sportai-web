"use client";

import { useRef, useEffect, useState } from "react";
import { TextArea, Button, Tooltip, Box, Flex, Callout, Text, Select } from "@radix-ui/themes";
import { ArrowUpIcon, PlusIcon, StopIcon } from "@radix-ui/react-icons";
import { VideoPreview } from "./VideoPreview";
import type { ProgressStage } from "@/types/chat";
import { getThinkingMode, setThinkingMode, getMediaResolution, setMediaResolution, type ThinkingMode, type MediaResolution } from "@/utils/storage";

interface ChatInputProps {
  prompt: string;
  videoFile: File | null;
  videoPreview: string | null;
  error: string | null;
  loading: boolean;
  progressStage?: ProgressStage;
  onPromptChange: (value: string) => void;
  onVideoRemove: () => void;
  onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop?: () => void;
  onPickleballCoachClick: () => void;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onMediaResolutionChange?: (resolution: MediaResolution) => void;
  disableTooltips?: boolean;
}

export function ChatInput({
  prompt,
  videoFile,
  videoPreview,
  error,
  loading,
  progressStage = "idle",
  onPromptChange,
  onVideoRemove,
  onVideoChange,
  onSubmit,
  onStop,
  onPickleballCoachClick,
  onThinkingModeChange,
  onMediaResolutionChange,
  disableTooltips = false,
}: ChatInputProps) {
  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log("[ChatInput] Loading state:", { loading, hasOnStop: !!onStop, progressStage });
    }
  }, [loading, onStop, progressStage]);
  // Base height for textarea (in pixels) - adjust this to test different heights
  const BASE_TEXTAREA_HEIGHT = 0;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [thinkingMode, setThinkingModeState] = useState<ThinkingMode>("fast");
  const [mediaResolution, setMediaResolutionState] = useState<MediaResolution>("medium");
  const [thinkingModeOpen, setThinkingModeOpen] = useState(false);
  const [mediaResolutionOpen, setMediaResolutionOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setThinkingModeState(getThinkingMode());
    setMediaResolutionState(getMediaResolution());
  }, []);

  useEffect(() => {
    // Set initial height to base height
    if (textareaRef.current) {
      // Ensure it starts at exactly base height
      textareaRef.current.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
    }
  }, []);

  useEffect(() => {
    // Skip resize on initial mount if empty
    if (!prompt.trim()) {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
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
          
          // Base height includes padding
          // Only resize if content actually exceeds this base height
          if (scrollHeight > BASE_TEXTAREA_HEIGHT) {
            textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
          } else {
            // Keep at base height
            textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
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
        
        // If empty, keep at base height
        if (!newValue.trim()) {
          textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
          return;
        }
        
        // Temporarily set to auto to measure scrollHeight
        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        
        // Base height includes padding
        // Only resize if content actually exceeds this base height
        if (scrollHeight > BASE_TEXTAREA_HEIGHT) {
          textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
        } else {
          // Keep at base height
          textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
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
        
        // Base height includes padding
        // Only resize if content actually exceeds this base height
        if (scrollHeight > BASE_TEXTAREA_HEIGHT) {
          textarea.style.height = `${Math.min(scrollHeight, 300)}px`;
        } else {
          // Keep at base height
          textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
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
              disableTooltips={disableTooltips}
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
              gap="2"
              style={{
                padding: "var(--space-2) var(--space-3)",
              }}
            >
              {/* Plus button */}
              <Tooltip content="Upload video or image" open={disableTooltips ? false : undefined}>
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
                    flexShrink: 0,
                    marginRight: "var(--space-3)",
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

              {/* Thinking mode selector */}
              <Tooltip 
                content="Thinking mode: Fast for quick responses, Deep for more thorough analysis"
                open={disableTooltips ? false : (!thinkingModeOpen ? undefined : false)}
              >
                <Box style={{ marginRight: "var(--space-3)" }}>
                  <Select.Root
                    value={thinkingMode}
                    open={thinkingModeOpen}
                    onOpenChange={setThinkingModeOpen}
                    onValueChange={(value) => {
                      const mode = value as ThinkingMode;
                      setThinkingModeState(mode);
                      setThinkingMode(mode);
                      onThinkingModeChange?.(mode);
                    }}
                  >
                    <Select.Trigger
                      className="select-no-border"
                      style={{
                        height: "28px",
                        fontSize: "11px",
                        padding: "0 var(--space-2)",
                        minWidth: "70px",
                        border: "none",
                        borderWidth: 0,
                        outline: "none",
                        backgroundColor: "transparent",
                        boxShadow: "none",
                      }}
                    />
                    <Select.Content>
                      <Select.Item value="fast">Fast</Select.Item>
                      <Select.Item value="deep">Deep</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
              </Tooltip>

              {/* Media resolution selector */}
              <Tooltip 
                content="Media resolution: Controls the quality and token usage for video/image analysis"
                open={disableTooltips ? false : (!mediaResolutionOpen ? undefined : false)}
              >
                <Box>
                  <Select.Root
                    value={mediaResolution}
                    open={mediaResolutionOpen}
                    onOpenChange={setMediaResolutionOpen}
                    onValueChange={(value) => {
                      const resolution = value as MediaResolution;
                      setMediaResolutionState(resolution);
                      setMediaResolution(resolution);
                      onMediaResolutionChange?.(resolution);
                    }}
                  >
                    <Select.Trigger
                      className="select-no-border"
                      style={{
                        height: "28px",
                        fontSize: "11px",
                        padding: "0 var(--space-2)",
                        minWidth: "70px",
                        border: "none",
                        borderWidth: 0,
                        outline: "none",
                        backgroundColor: "transparent",
                        boxShadow: "none",
                      }}
                    />
                    <Select.Content>
                      <Select.Item value="low">Low</Select.Item>
                      <Select.Item value="medium">Medium</Select.Item>
                      <Select.Item value="high">High</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
              </Tooltip>

              {/* Spacer to push submit button to the right */}
              <Box style={{ flex: 1 }} />

              {/* Submit/Stop button */}
              {loading ? (
                onStop ? (
                  <Tooltip content="Stop generating" open={disableTooltips ? false : undefined}>
                    <button
                      type="button"
                      onClick={onStop}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--red-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                        border: "none",
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.backgroundColor = "var(--red-4)";
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.backgroundColor = "var(--red-3)";
                      }}
                    >
                      <StopIcon width="16" height="16" color="var(--red-11)" />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Sending..." open={disableTooltips ? false : undefined}>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--gray-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "not-allowed",
                        border: "none",
                        opacity: 0.5,
                      }}
                    >
                      <ArrowUpIcon width="16" height="16" color="var(--gray-9)" />
                    </button>
                  </Tooltip>
                )
              ) : (
                <Tooltip content="Send message" open={disableTooltips ? false : undefined}>
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--gray-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: !prompt.trim() ? "not-allowed" : "pointer",
                      transition: "background-color 0.2s",
                      border: "none",
                      opacity: !prompt.trim() ? 0.5 : 1,
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (prompt.trim()) {
                        e.currentTarget.style.backgroundColor = "var(--gray-4)";
                      }
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.backgroundColor = "var(--gray-3)";
                    }}
                  >
                    <ArrowUpIcon width="16" height="16" color={!prompt.trim() ? "var(--gray-9)" : "var(--gray-11)"} />
                  </button>
                </Tooltip>
              )}
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

