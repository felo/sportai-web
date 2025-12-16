"use client";
import { chatLogger } from "@/lib/logger";

import { useRef, useEffect, useState } from "react";
import { TextArea, Tooltip, Box, Flex, Callout, Text, Select } from "@radix-ui/themes";
import { ArrowUpIcon, PlusIcon, StopIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { VideoPreview } from "../viewers/VideoPreview";
import { VideoEligibilityIndicator } from "./VideoEligibilityIndicator";
import { AttachedVideoChip } from "./AttachedVideoChip";
import type { ProgressStage, VideoPreAnalysis } from "@/types/chat";
import { type ThinkingMode, type MediaResolution, type DomainExpertise, getDeveloperMode } from "@/utils/storage";
import { useIsMobile } from "@/hooks/useIsMobile";
import { extractVideoUrls } from "@/utils/video-utils";

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
  // Video sport auto-detection - triggers glow effect when sport is detected from video
  videoSportDetected?: DomainExpertise | null;
  // Video URL detection - callback when a video URL is detected in the input
  onVideoUrlDetected?: (url: string | null) => void;
  // Video pre-analysis for PRO eligibility
  videoPreAnalysis?: VideoPreAnalysis | null;
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
  videoSportDetected = null,
  onVideoUrlDetected,
  videoPreAnalysis = null,
}: ChatInputProps) {
  const isMobile = useIsMobile();
  
  // Video URL detection state
  const [detectedVideoUrls, setDetectedVideoUrls] = useState<string[]>([]);
  
  // Debug logging
  useEffect(() => {
    if (loading) {
      chatLogger.debug("[ChatInput] Loading state:", { loading, hasOnStop: !!onStop, progressStage });
    }
  }, [loading, onStop, progressStage]);
  // Base height for textarea (in pixels) - single line height with padding
  const BASE_TEXTAREA_HEIGHT = isMobile ? 40 : 0;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  // Use props from parent (which come from current chat), fallback to hardcoded defaults
  const [thinkingMode, setThinkingModeState] = useState<ThinkingMode>(() => thinkingModeProp || "fast");
  const [mediaResolution, setMediaResolutionState] = useState<MediaResolution>(() => mediaResolutionProp || "medium");
  const [domainExpertise, setDomainExpertiseState] = useState<DomainExpertise>(() => domainExpertiseProp || "all-sports");
  const [thinkingModeOpen, setThinkingModeOpen] = useState(false);
  const [mediaResolutionOpen, setMediaResolutionOpen] = useState(false);
  const [domainExpertiseOpen, setDomainExpertiseOpen] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [sendButtonBounce, setSendButtonBounce] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  
  // Refs for debounced detection (to avoid stale closures)
  const sportDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track previous analyzing state to detect when analysis completes
  const wasAnalyzingRef = useRef(false);
  
  // Prevent hydration mismatch with Radix UI Select components
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load developer mode on mount and listen for changes
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    return () => window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
      if (sportDetectionTimeoutRef.current) {
        clearTimeout(sportDetectionTimeoutRef.current);
      }
      if (urlDetectionTimeoutRef.current) {
        clearTimeout(urlDetectionTimeoutRef.current);
      }
    };
  }, []);

  // Trigger bounce animation on send button when analysis completes
  useEffect(() => {
    const isCurrentlyAnalyzing = videoPreAnalysis?.isAnalyzing ?? false;
    
    // Detect transition from analyzing to not analyzing
    if (wasAnalyzingRef.current && !isCurrentlyAnalyzing) {
      chatLogger.debug("[ChatInput] Analysis complete, triggering send button bounce");
      setSendButtonBounce(true);
      
      // Reset bounce after animation completes
      setTimeout(() => {
        setSendButtonBounce(false);
      }, 600); // Animation duration
    }
    
    wasAnalyzingRef.current = isCurrentlyAnalyzing;
  }, [videoPreAnalysis?.isAnalyzing]);

  // Trigger glow effect when sport is auto-detected from video
  // Note: videoSportDetected is only set when a valid sport (tennis/pickleball/padel) is detected
  useEffect(() => {
    if (videoSportDetected) {
      chatLogger.debug("[ChatInput] Video sport auto-detected:", videoSportDetected);
      
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
    }
  }, [videoSportDetected]);

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

  // Clear video URL detection when a file is uploaded
  useEffect(() => {
    if (videoFile) {
      setDetectedVideoUrls([]);
      onVideoUrlDetected?.(null);
    }
  }, [videoFile, onVideoUrlDetected]);

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
    
    // 1. Update prompt immediately - user sees typing instantly
    onPromptChange(newValue);
    
    // 2. Debounce sport detection (200ms) - avoid regex on every keystroke
    if (sportDetectionTimeoutRef.current) {
      clearTimeout(sportDetectionTimeoutRef.current);
    }
    sportDetectionTimeoutRef.current = setTimeout(() => {
      detectAndSwitchSport(newValue);
    }, 200);
    
    // 3. Debounce video URL detection (200ms) - avoid URL parsing on every keystroke
    if (urlDetectionTimeoutRef.current) {
      clearTimeout(urlDetectionTimeoutRef.current);
    }
    if (!videoFile) {
      urlDetectionTimeoutRef.current = setTimeout(() => {
        const videoUrls = extractVideoUrls(newValue);
        setDetectedVideoUrls(videoUrls);
        
        // Notify parent: only if exactly one video URL (ready for analysis)
        if (videoUrls.length === 1) {
          onVideoUrlDetected?.(videoUrls[0]);
        } else {
          onVideoUrlDetected?.(null);
        }
      }, 200);
    } else {
      // Clear URL detection when a file is uploaded (immediate, no debounce needed)
      setDetectedVideoUrls([]);
      onVideoUrlDetected?.(null);
    }
    
    // 4. Resize textarea - use requestAnimationFrame (this is cheap, no debounce needed)
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

  // Flush any pending debounced detection before submit
  // This ensures sport/URL detection runs immediately if user submits quickly
  const flushPendingDetection = () => {
    // Cancel pending timeouts
    if (sportDetectionTimeoutRef.current) {
      clearTimeout(sportDetectionTimeoutRef.current);
      sportDetectionTimeoutRef.current = null;
    }
    if (urlDetectionTimeoutRef.current) {
      clearTimeout(urlDetectionTimeoutRef.current);
      urlDetectionTimeoutRef.current = null;
    }
    
    // Run detection immediately with current prompt
    detectAndSwitchSport(prompt);
    
    if (!videoFile) {
      const videoUrls = extractVideoUrls(prompt);
      setDetectedVideoUrls(videoUrls);
      if (videoUrls.length === 1) {
        onVideoUrlDetected?.(videoUrls[0]);
      } else {
        onVideoUrlDetected?.(null);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    flushPendingDetection();
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      flushPendingDetection();
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

      <form onSubmit={handleFormSubmit}>
        <Flex direction="column" gap="4" style={{ marginLeft: isMobile ? "var(--space-4)" : "0", marginRight: isMobile ? "var(--space-4)" : "0" }}>
          {videoFile && videoPreview && (
            <VideoPreview
              videoFile={videoFile}
              videoPreview={videoPreview}
              onRemove={onVideoRemove}
              disableTooltips={disableTooltips}
            />
          )}

          {/* Video file eligibility indicator */}
          {videoFile && videoPreAnalysis && (
            <VideoEligibilityIndicator 
              preAnalysis={videoPreAnalysis} 
              fallbackText="Video uploaded" 
            />
          )}

          {/* Video URL chip and eligibility indicator */}
          {!videoFile && detectedVideoUrls.length === 1 && (
            <Flex direction="column" gap="2">
              {/* Attached video chip with hover to show full URL */}
              <AttachedVideoChip 
                videoUrl={detectedVideoUrls[0]}
                onRemove={() => {
                  // Remove the video URL from the prompt
                  const urlToRemove = detectedVideoUrls[0];
                  const newPrompt = prompt.replace(urlToRemove, '').trim();
                  onPromptChange(newPrompt);
                  setDetectedVideoUrls([]);
                  onVideoUrlDetected?.(null);
                }}
              />
              {/* Eligibility indicator below the chip */}
              <VideoEligibilityIndicator 
                preAnalysis={videoPreAnalysis} 
                fallbackText="Video URL detected" 
              />
            </Flex>
          )}

          {/* Multiple video URLs warning */}
          {!videoFile && detectedVideoUrls.length > 1 && (
            <Callout.Root color="orange" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {detectedVideoUrls.length} video URLs detected. Only one video can be analyzed at a time. Please remove extra URLs.
              </Callout.Text>
            </Callout.Root>
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
                minHeight: "60px",
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
                height: "auto",
              }}
            />
            
            {/* Buttons row */}
            <Flex
              align="center"
              gap="2"
              style={{
                padding: "var(--space-2) var(--space-3)",
                flexWrap: isMobile ? "wrap" : "nowrap",
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
                    marginRight: isMobile ? "0" : "var(--space-3)",
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

              {/* Dropdowns container - centered on mobile */}
              {/* Only render Select components after mount to prevent hydration mismatch */}
              {isMounted && (
                <Flex
                  align="center"
                  gap={isMobile ? "1" : "2"}
                  style={{
                    flex: isMobile ? "1" : "0",
                    justifyContent: isMobile ? "center" : "flex-start",
                  }}
                >
                  {/* Thinking mode selector - Developer Mode Only */}
                  {developerMode && (
                    <Tooltip 
                      content="Thinking mode: Fast for quick responses, Deep for more thorough analysis"
                      open={disableTooltips ? false : (!thinkingModeOpen ? undefined : false)}
                    >
                      <Box style={{ marginRight: isMobile ? "0" : "var(--space-3)" }}>
                        <Select.Root
                          value={thinkingMode}
                          open={thinkingModeOpen}
                          onOpenChange={setThinkingModeOpen}
                          onValueChange={(value) => {
                            const mode = value as ThinkingMode;
                            setThinkingModeState(mode);
                            onThinkingModeChange?.(mode);
                          }}
                        >
                          <Select.Trigger
                            className="select-no-border"
                            style={{
                              height: "28px",
                              fontSize: isMobile ? "10px" : "11px",
                              padding: "0 var(--space-2)",
                              minWidth: isMobile ? "60px" : "70px",
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
                  )}

                  {/* Media resolution selector - Developer Mode Only */}
                  {developerMode && (
                    <Tooltip 
                      content="Media resolution: Controls the quality and token usage for video/image analysis"
                      open={disableTooltips ? false : (!mediaResolutionOpen ? undefined : false)}
                    >
                      <Box style={{ marginRight: isMobile ? "0" : "var(--space-3)" }}>
                        <Select.Root
                          value={mediaResolution}
                          open={mediaResolutionOpen}
                          onOpenChange={setMediaResolutionOpen}
                          onValueChange={(value) => {
                            const resolution = value as MediaResolution;
                            setMediaResolutionState(resolution);
                            onMediaResolutionChange?.(resolution);
                          }}
                        >
                          <Select.Trigger
                            className="select-no-border"
                            style={{
                              height: "28px",
                              fontSize: isMobile ? "10px" : "11px",
                              padding: "0 var(--space-2)",
                              minWidth: isMobile ? "60px" : "70px",
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
                  )}

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
                            fontSize: isMobile ? "10px" : "11px",
                            padding: "0 var(--space-2)",
                            minWidth: isMobile ? "70px" : "90px",
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
                </Flex>
              )}

              {/* Spacer to push submit button to the right */}
              <Box style={{ flex: isMobile ? "0" : "1" }} />

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
                <Tooltip 
                  content={videoPreAnalysis?.isAnalyzing ? "Analyzing video..." : "Send message"} 
                  open={disableTooltips ? false : undefined}
                >
                  {(() => {
                    // Can submit if: has text OR has file OR has exactly one video URL (not multiple)
                    const hasValidVideoUrl = detectedVideoUrls.length === 1;
                    const canSubmit = prompt.trim() || videoFile || hasValidVideoUrl;
                    // Disable if multiple URLs detected OR if video is being analyzed for PRO eligibility
                    const isAnalyzing = videoPreAnalysis?.isAnalyzing ?? false;
                    const isDisabled = !canSubmit || detectedVideoUrls.length > 1 || isAnalyzing;
                    
                    return (
                      <button
                        type="submit"
                        disabled={isDisabled}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "9999px",
                          backgroundColor: isDisabled ? "var(--gray-4)" : "#7ADB8F",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease-out",
                          border: isDisabled ? "none" : "2px solid white",
                          opacity: isDisabled ? 0.5 : 1,
                          boxShadow: isDisabled ? "none" : "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          animation: sendButtonBounce ? "sendButtonBounce 0.6s cubic-bezier(0.36, 0, 0.66, -0.56)" : "none",
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                          if (!isDisabled) {
                            e.currentTarget.style.backgroundColor = "#95E5A6";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
                          }
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                          if (!isDisabled) {
                            e.currentTarget.style.backgroundColor = "#7ADB8F";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
                          }
                        }}
                      >
                        <ArrowUpIcon width="18" height="18" color={isDisabled ? "var(--gray-9)" : "#1C1C1C"} />
                      </button>
                    );
                  })()}
                </Tooltip>
              )}
            </Flex>
          </Box>

          {/* Disclaimer text */}
          {!hideDisclaimer && (
            <Text size="1" color="gray" style={{ textAlign: "center", marginTop: "var(--space-1)", marginBottom: 0 }}>
              {isMobile ? (
                <>
                  Enjoy the free BETA, for enterprise license {" "}
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
                  Enjoy the free BETA. For enterprise-level precision, performance, and dedicated support, please{" "}
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

