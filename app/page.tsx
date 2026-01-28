"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Box, Flex, Text, Button } from "@radix-ui/themes";
import { 
  VideoIcon, 
  BarChartIcon, 
  CalendarIcon, 
  ChatBubbleIcon, 
  LightningBoltIcon, 
  ReaderIcon, 
  RocketIcon 
} from "@radix-ui/react-icons";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import { usePendingChat } from "@/components/PendingChatContext";
import { PageHeader } from "@/components/ui";
import { Sidebar } from "@/components/sidebar";
import { ChatInput } from "@/components/chat/input/ChatInput";
import { FileSizeLimitModal } from "@/components/chat/input/FileSizeLimitModal";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useVideoPreAnalysis } from "@/components/ai-chat/hooks";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { extractVideoUrls } from "@/utils/video-utils";
import buttonStyles from "@/styles/buttons.module.css";

const LOGO_URL = "https://res.cloudinary.com/djtxhrly7/image/upload/v1763680386/sai-logo-green_nuuyat.svg";

// Mocked starter prompts for the home page
const STARTER_PROMPT_BUTTONS = [
  { id: "video-feedback", label: "Get video feedback", icon: VideoIcon },
  { id: "analyze-match", label: "Analyze a match", icon: BarChartIcon },
  { id: "plan-session", label: "Plan a session", icon: CalendarIcon },
  { id: "discuss-strategy", label: "Discuss strategy", icon: ChatBubbleIcon },
  { id: "suggest-exercise", label: "Suggest an exercise", icon: LightningBoltIcon },
  { id: "learn-rules", label: "Learn the rules", icon: ReaderIcon },
  { id: "get-started", label: "Help me get started", icon: RocketIcon },
];

function HomeContent() {
  const router = useRouter();
  const { isCollapsed, isInitialLoad } = useSidebar();
  const { setPendingSubmission } = usePendingChat();
  const isMobile = useIsMobile();

  // Local state for the chat input
  const [prompt, setPrompt] = useState("");
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("fast");
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>("medium");
  const [domainExpertise, setDomainExpertise] = useState<DomainExpertise>("all-sports");

  // Video upload hook
  const {
    videoFile,
    videoPreview,
    error: videoError,
    setError: setVideoError,
    processVideoFile,
    clearVideo,
    showFileSizeLimitModal,
    setShowFileSizeLimitModal,
  } = useVideoUpload();

  // Video pre-analysis hook - handles sport detection, eligibility checking, and URL validation
  const {
    videoPreAnalysis,
    videoSportDetected,
    detectedVideoUrl,
    setDetectedVideoUrl,
    resetAnalysis,
    urlFileSizeTooLarge,
    setUrlFileSizeTooLarge,
  } = useVideoPreAnalysis({
    videoFile,
    domainExpertise,
    setDomainExpertise,
  });

  // Clear prompt when URL file size limit is hit
  useEffect(() => {
    if (urlFileSizeTooLarge) {
      setPrompt("");
      setShowFileSizeLimitModal(true);
      setUrlFileSizeTooLarge(false);
    }
  }, [urlFileSizeTooLarge, setShowFileSizeLimitModal, setUrlFileSizeTooLarge]);

  // Drag and drop hook
  const { isDragging, hasJustDropped, handlers: dragHandlers } = useDragAndDrop({
    onFileDrop: (file) => processVideoFile(file, 'drag_drop'),
    onError: (error) => setVideoError(error),
  });

  // Handle video file change from file picker
  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file, 'file_picker');
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [processVideoFile]);

  // Handle form submission - set pending and navigate to /chat
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's valid input
    const videoUrls = extractVideoUrls(prompt);
    const hasValidVideoUrl = videoUrls.length === 1;
    const effectiveVideoUrl = detectedVideoUrl || (hasValidVideoUrl ? videoUrls[0] : undefined);
    
    if (!prompt.trim() && !videoFile && !effectiveVideoUrl) {
      return; // Nothing to submit
    }

    // Set pending submission in context (includes pre-analysis to avoid re-analyzing)
    setPendingSubmission({
      prompt: prompt.trim(),
      videoFile: videoFile || undefined,
      videoPreview: videoPreview || undefined,
      detectedVideoUrl: effectiveVideoUrl || undefined,
      videoPreAnalysis: videoPreAnalysis || undefined,
      settings: {
        thinkingMode,
        mediaResolution,
        domainExpertise,
      },
    });

    // Navigate to chat page
    router.push("/chat");
  }, [prompt, videoFile, videoPreview, detectedVideoUrl, thinkingMode, mediaResolution, domainExpertise, setPendingSubmission, router]);

  // Handle new chat from header - just stay on home page (we're already there)
  const handleNewChat = useCallback(() => {
    // Clear any existing input
    setPrompt("");
    clearVideo();
    resetAnalysis();
  }, [clearVideo, resetAnalysis]);

  return (
    <main className="h-screen flex flex-col">
      <PageHeader onNewChat={handleNewChat} />
      <Sidebar />
      
      {/* Main content area with drag and drop */}
      <Box
        {...dragHandlers}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: isMobile ? 0 : isCollapsed ? "64px" : "280px",
          transition: isInitialLoad ? "none" : "margin-left 0.2s ease-in-out",
          paddingTop: isMobile ? "calc(46px + env(safe-area-inset-top))" : "57px",
          backgroundColor: "var(--gray-1)",
          position: "relative",
        }}
      >
        {/* Drag overlay */}
        {isDragging && (
          <Box
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "var(--mint-3)",
              border: "3px dashed var(--mint-9)",
              borderRadius: "var(--radius-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              margin: "var(--space-4)",
            }}
          >
            <Box style={{ textAlign: "center", color: "var(--mint-11)" }}>
              <Box style={{ fontSize: "48px", marginBottom: "var(--space-2)" }}>📹</Box>
              <Box style={{ fontSize: "18px", fontWeight: 500 }}>Drop your video here</Box>
            </Box>
          </Box>
        )}

        {/* Centered content area */}
        <Flex
          direction="column"
          align="center"
          justify="center"
          style={{
            flex: 1,
            padding: "var(--space-4)",
            maxWidth: "800px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Logo */}
          {!isMobile && (
            <Box style={{ marginBottom: "var(--space-4)" }}>
              <Image
                src={LOGO_URL}
                alt="SportAI"
                width={80}
                height={100}
                style={{
                  height: "auto",
                  objectFit: "contain",
                }}
                priority
              />
            </Box>
          )}

          {/* Greeting */}
          <Text
            size={isMobile ? "6" : "8"}
            weight="bold"
            align="center"
            style={{
              marginBottom: "var(--space-6)",
              color: "var(--gray-12)",
            }}
          >
            Hey athlete, how can I assist you today?
          </Text>

          {/* Chat input */}
          <Box
            style={{
              width: "100%",
              marginBottom: "var(--space-6)",
            }}
          >
            <ChatInput
              prompt={prompt}
              videoFile={videoFile}
              videoPreview={videoPreview}
              error={videoError}
              loading={false}
              progressStage="idle"
              thinkingMode={thinkingMode}
              mediaResolution={mediaResolution}
              domainExpertise={domainExpertise}
              onPromptChange={setPrompt}
              onVideoRemove={clearVideo}
              onVideoChange={handleVideoChange}
              onSubmit={handleSubmit}
              onPickleballCoachClick={() => {}}
              onThinkingModeChange={setThinkingMode}
              onMediaResolutionChange={setMediaResolution}
              onDomainExpertiseChange={setDomainExpertise}
              disableTooltips={hasJustDropped}
              videoSportDetected={videoSportDetected}
              onVideoUrlDetected={setDetectedVideoUrl}
              videoPreAnalysis={videoPreAnalysis}
              hideDisclaimer
            />
          </Box>

          {/* Starter prompts section */}
          <Flex direction="column" align="center" gap="3" style={{ width: "100%" }}>
            <Text size="2" color="gray" style={{ marginBottom: "var(--space-2)" }}>
              Other prompts you can try
            </Text>
            
            <Flex
              wrap="wrap"
              gap="2"
              justify="center"
              style={{ maxWidth: "700px" }}
            >
              {STARTER_PROMPT_BUTTONS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Button
                    key={item.id}
                    size="2"
                    variant="soft"
                    className={buttonStyles.actionButton}
                    onClick={() => {
                      setPrompt(item.label);
                    }}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <IconComponent width="16" height="16" />
                    {item.label}
                  </Button>
                );
              })}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* File size limit modal */}
      <FileSizeLimitModal
        open={showFileSizeLimitModal}
        onOpenChange={setShowFileSizeLimitModal}
      />
    </main>
  );
}

export default function Home() {
  return (
    <SidebarProvider>
      <HomeContent />
    </SidebarProvider>
  );
}
