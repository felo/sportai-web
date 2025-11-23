"use client";

import { useRef, useEffect, useState } from "react";
import { TextArea, Button, Tooltip, Box, Flex, Callout, Text, Select } from "@radix-ui/themes";
import { ArrowUpIcon, PlusIcon, StopIcon } from "@radix-ui/react-icons";
import { VideoPreview } from "./VideoPreview";
import type { ProgressStage } from "@/types/chat";
import { getThinkingMode, setThinkingMode, getMediaResolution, setMediaResolution, getDomainExpertise, setDomainExpertise, type ThinkingMode, type MediaResolution, type DomainExpertise } from "@/utils/storage";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ChatInputProps {
  prompt: string;
  videoFile: File | null;
  videoPreview: string | null;
  error: string | null;
  loading: boolean;
  progressStage?: ProgressStage;
  thinkingMode?: ThinkingMode;
  mediaResolution?: MediaResolution;
  domainExpertise?: DomainExpertise;
  onPromptChange: (value: string) => void;
  onVideoRemove: () => void;
  onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop?: () => void;
  onPickleballCoachClick: () => void;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onMediaResolutionChange?: (resolution: MediaResolution) => void;
  onDomainExpertiseChange?: (expertise: DomainExpertise) => void;
  disableTooltips?: boolean;
  hideDisclaimer?: boolean; // Hide the "contact us" disclaimer
}

export function ChatInput({
  prompt,
  videoFile,
  videoPreview,
  error,
  loading,
  progressStage = "idle",
  thinkingMode: thinkingModeProp,
  mediaResolution: mediaResolutionProp,
  domainExpertise: domainExpertiseProp,
  onPromptChange,
  onVideoRemove,
  onVideoChange,
  onSubmit,
  onStop,
  onPickleballCoachClick,
  onThinkingModeChange,
  onMediaResolutionChange,
  onDomainExpertiseChange,
  disableTooltips = false,
  hideDisclaimer = false,
}: ChatInputProps) {
  const isMobile = useIsMobile();
  
  // Debug logging
  useEffect(() => {
    if (loading) {
      console.log("[ChatInput] Loading state:", { loading, hasOnStop: !!onStop, progressStage });
    }
  }, [loading, onStop, progressStage]);
  // Base height for textarea (in pixels) - adjust this to test different heights
  const BASE_TEXTAREA_HEIGHT = isMobile ? 40 : 0;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [thinkingMode, setThinkingModeState] = useState<ThinkingMode>(() => thinkingModeProp || getThinkingMode());
  const [mediaResolution, setMediaResolutionState] = useState<MediaResolution>(() => mediaResolutionProp || getMediaResolution());
  const [domainExpertise, setDomainExpertiseState] = useState<DomainExpertise>(() => domainExpertiseProp || getDomainExpertise());
  const [thinkingModeOpen, setThinkingModeOpen] = useState(false);
  const [mediaResolutionOpen, setMediaResolutionOpen] = useState(false);
  const [domainExpertiseOpen, setDomainExpertiseOpen] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup glow timeout on unmount
  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
    };
  }, []);

  // Update local state when props change (e.g., from starter prompts)
  useEffect(() => {
    if (thinkingModeProp) {
      setThinkingModeState(thinkingModeProp);
    }
  }, [thinkingModeProp]);

  useEffect(() => {
    if (mediaResolutionProp) {
      setMediaResolutionState(mediaResolutionProp);
    }
  }, [mediaResolutionProp]);

  useEffect(() => {
    if (domainExpertiseProp) {
      setDomainExpertiseState(domainExpertiseProp);
    }
  }, [domainExpertiseProp]);

  // Reset file input when video is cleared (e.g., after error or removal)
  useEffect(() => {
    if (!videoFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [videoFile]);

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

  // Detect sport names in text and auto-switch domain expertise
  const detectAndSwitchSport = (text: string) => {
    // Define sport keywords (case-insensitive, whole word matching)
    // Primary sports with dedicated modes
    const primarySportKeywords: Record<string, DomainExpertise> = {
      'tennis': 'tennis',
      'pickleball': 'pickleball',
      'padel': 'padel',
    };

    // Other sports that switch to "all-sports" mode
    // Excluded generic names that could cause false positives: running, swimming, cycling, boxing, racing, walking, etc.
    const otherSportKeywords = [
      'basketball',
      'volleyball',
      'baseball',
      'football',
      'soccer',
      'golf',
      'rugby',
      'cricket',
      'badminton',
      'squash',
      'hockey',
      'softball',
      'lacrosse',
      'handball',
      'waterpolo',
      'polo',
      'skiing',
      'snowboarding',
      'surfing',
      'skateboarding',
      'wrestling',
      'judo',
      'karate',
      'taekwondo',
      'fencing',
      'archery',
      'gymnastics',
      'crossfit',
    ];

    // Convert text to lowercase for matching
    const lowerText = text.toLowerCase();
    
    // First check primary sports (tennis, pickleball, padel)
    for (const [keyword, expertise] of Object.entries(primarySportKeywords)) {
      // Use word boundary regex to match whole words only
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText) && domainExpertise !== expertise) {
        // Switch to detected sport
        setDomainExpertiseState(expertise);
        setDomainExpertise(expertise);
        onDomainExpertiseChange?.(expertise);
        
        // Trigger glow effect
        setIsGlowing(true);
        
        // Clear existing timeout
        if (glowTimeoutRef.current) {
          clearTimeout(glowTimeoutRef.current);
        }
        
        // Remove glow after 2 seconds
        glowTimeoutRef.current = setTimeout(() => {
          setIsGlowing(false);
        }, 2000);
        
        // Only switch to the first detected sport
        return;
      }
    }
    
    // Then check other sports (switch to "all-sports")
    for (const keyword of otherSportKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText) && domainExpertise !== 'all-sports') {
        // Switch to all-sports
        setDomainExpertiseState('all-sports');
        setDomainExpertise('all-sports');
        onDomainExpertiseChange?.('all-sports');
        
        // Trigger glow effect
        setIsGlowing(true);
        
        // Clear existing timeout
        if (glowTimeoutRef.current) {
          clearTimeout(glowTimeoutRef.current);
        }
        
        // Remove glow after 2 seconds
        glowTimeoutRef.current = setTimeout(() => {
          setIsGlowing(false);
        }, 2000);
        
        // Only switch to the first detected sport
        return;
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onPromptChange(newValue);
    
    // Detect sport names and auto-switch
    detectAndSwitchSport(newValue);
    
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
        paddingBottom: isMobile ? "calc(var(--space-4) + env(safe-area-inset-bottom))" : "var(--space-4)", // Safe area support
        paddingLeft: isMobile ? "0" : "var(--space-4)",
        paddingRight: isMobile ? "0" : "var(--space-4)",
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      {error && (
        <Callout.Root color="red" mb="3" style={{ marginLeft: isMobile ? "var(--space-4)" : "0", marginRight: isMobile ? "var(--space-4)" : "0" }}>
          <Callout.Text size="2">{error}</Callout.Text>
        </Callout.Root>
      )}

      <form onSubmit={onSubmit}>
        <Flex direction="column" gap="4" style={{ marginLeft: isMobile ? "var(--space-4)" : "0", marginRight: isMobile ? "var(--space-4)" : "0" }}>
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
              placeholder={`Ask anything ${domainExpertise === 'all-sports' ? 'sports' : domainExpertise} related…`}
              aria-label="Chat input"
              resize="none"
              size="3"
              style={{
                maxHeight: "300px",
                paddingTop: isMobile ? "var(--space-2)" : "var(--space-3)",
                paddingLeft: isMobile ? "var(--space-2)" : "var(--space-3)",
                paddingRight: isMobile ? "var(--space-2)" : "var(--space-3)",
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
                    width: "36px",
                    height: "36px",
                    borderRadius: "9999px",
                    backgroundColor: "#7ADB8F",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease-out",
                    border: "2px solid white",
                    flexShrink: 0,
                    marginRight: "var(--space-3)",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
                    e.currentTarget.style.backgroundColor = "#95E5A6";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
                    e.currentTarget.style.backgroundColor = "#7ADB8F";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
                  }}
                >
                  <input
                    ref={fileInputRef}
                    id="video"
                    type="file"
                    accept="video/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={onVideoChange}
                    style={{ display: "none" }}
                  />
                  <PlusIcon width="18" height="18" color="#1C1C1C" />
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
                <Box style={{ marginRight: "var(--space-3)" }}>
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

              {/* Domain expertise selector */}
              <Tooltip 
                content="Domain expertise: Choose the sport for specialized analysis"
                open={disableTooltips ? false : (!domainExpertiseOpen ? undefined : false)}
              >
                <Box
                  style={{
                    borderRadius: "var(--radius-2)",
                    transition: "box-shadow 0.3s ease, filter 0.3s ease",
                    boxShadow: isGlowing 
                      ? "0 0 0 2px var(--mint-8), 0 0 16px var(--mint-6), 0 0 24px var(--mint-5)" 
                      : "none",
                    filter: isGlowing 
                      ? "brightness(1.2)" 
                      : "none",
                  }}
                >
                  <Select.Root
                    value={domainExpertise}
                    open={domainExpertiseOpen}
                    onOpenChange={setDomainExpertiseOpen}
                    onValueChange={(value) => {
                      const expertise = value as DomainExpertise;
                      setDomainExpertiseState(expertise);
                      setDomainExpertise(expertise);
                      onDomainExpertiseChange?.(expertise);
                      // Clear glow effect when manually changed
                      setIsGlowing(false);
                      if (glowTimeoutRef.current) {
                        clearTimeout(glowTimeoutRef.current);
                      }
                    }}
                  >
                    <Select.Trigger
                      className="select-no-border"
                      style={{
                        height: "28px",
                        fontSize: "11px",
                        padding: "0 var(--space-2)",
                        minWidth: "90px",
                        border: "none",
                        borderWidth: 0,
                        outline: "none",
                        backgroundColor: "transparent",
                        boxShadow: "none",
                      }}
                    />
                    <Select.Content>
                      <Select.Item value="all-sports">All Sports</Select.Item>
                      <Select.Item value="tennis">Tennis</Select.Item>
                      <Select.Item value="pickleball">Pickleball</Select.Item>
                      <Select.Item value="padel">Padel</Select.Item>
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
                        width: "36px",
                        height: "36px",
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
                      <StopIcon width="18" height="18" color="var(--red-11)" />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Sending..." open={disableTooltips ? false : undefined}>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: "36px",
                        height: "36px",
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
                      <ArrowUpIcon width="18" height="18" color="var(--gray-9)" />
                    </button>
                  </Tooltip>
                )
              ) : (
                <Tooltip content="Send message" open={disableTooltips ? false : undefined}>
                  <button
                    type="submit"
                    disabled={!prompt.trim() && !videoFile}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "9999px",
                      backgroundColor: (!prompt.trim() && !videoFile) ? "var(--gray-4)" : "#7ADB8F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: (!prompt.trim() && !videoFile) ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease-out",
                      border: (!prompt.trim() && !videoFile) ? "none" : "2px solid white",
                      opacity: (!prompt.trim() && !videoFile) ? 0.5 : 1,
                      boxShadow: (!prompt.trim() && !videoFile) ? "none" : "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (prompt.trim() || videoFile) {
                        e.currentTarget.style.backgroundColor = "#95E5A6";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
                      }
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (prompt.trim() || videoFile) {
                        e.currentTarget.style.backgroundColor = "#7ADB8F";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
                      }
                    }}
                  >
                    <ArrowUpIcon width="18" height="18" color={(!prompt.trim() && !videoFile) ? "var(--gray-9)" : "#1C1C1C"} />
                  </button>
                </Tooltip>
              )}
            </Flex>
          </Box>

          {/* Disclaimer text */}
          {!hideDisclaimer && (
            <Text size="1" color="gray" style={{ textAlign: "center", marginTop: "var(--space-1)", marginBottom: 0 }}>
              {isMobile ? (
                <>
                  This is a demo, for enterprise level precision, please{" "}
                  <a 
                    href="https://sportai.com/contact" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    contact us
                  </a>.
                </>
              ) : (
                <>
                  This is a demo of the{" "}
                  <a 
                    href="https://sportai.com/platform" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    SportAI API
                  </a>, and may contain errors. For enterprise-level precision, performance, and dedicated support, please{" "}
                  <a 
                    href="https://sportai.com/contact" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    contact us
                  </a>.
                </>
              )}
            </Text>
          )}
        </Flex>
      </form>
    </Box>
  );
}

