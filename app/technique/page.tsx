"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Container, Flex, Text, Card, TextField, Button, Heading } from "@radix-ui/themes";
import { PlayIcon, Link2Icon } from "@radix-ui/react-icons";
import { TechniqueViewer } from "@/components/tasks/techniqueViewer";
import buttonStyles from "@/styles/buttons.module.css";

export default function TechniquePage() {
  return (
    <Suspense fallback={<TechniquePageLoading />}>
      <TechniquePageContent />
    </Suspense>
  );
}

function TechniquePageLoading() {
  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--gray-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text color="gray">Loading...</Text>
    </Box>
  );
}

function TechniquePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  // Get the source of navigation (chat, library, or undefined for direct access)
  const fromSource = useMemo(() => searchParams.get("from"), [searchParams]);

  // Load video from URL query parameter on mount
  useEffect(() => {
    const videoParam = searchParams.get("video");
    if (videoParam) {
      setLoadedUrl(videoParam);
      setVideoUrl(videoParam);
    }
  }, [searchParams]);

  const handleLoadVideo = () => {
    if (videoUrl.trim()) {
      setLoadedUrl(videoUrl.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLoadVideo();
    }
  };

  // Handle back navigation based on source
  const handleBack = useCallback(() => {
    if (fromSource === "chat") {
      // Navigate back to chat (main page)
      router.push("/");
    } else if (fromSource === "library") {
      // Navigate back to library
      router.push("/library");
    } else {
      // Default: just clear the video (stay on page)
      setLoadedUrl(null);
      setVideoUrl("");
    }
  }, [fromSource, router]);

  // Get appropriate back button label based on source
  const backLabel = useMemo(() => {
    if (fromSource === "chat") return "Back to Chat";
    if (fromSource === "library") return "Back to Library";
    return "Back";
  }, [fromSource]);

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--gray-1)",
        overflow: "hidden",
      }}
    >
      {!loadedUrl ? (
        // URL Input State
        <Container size="2" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Card size="4" style={{ width: "100%", maxWidth: "600px" }}>
            <Flex direction="column" gap="5" align="center" py="4">
              <Heading size="6" weight="bold">
                Technique Analyzer
              </Heading>
              <Text size="2" color="gray" align="center">
                Paste a video URL to analyze technique with 3D pose overlay
              </Text>
              
              <Flex gap="3" style={{ width: "100%" }}>
                <Box style={{ flex: 1 }}>
                  <TextField.Root
                    size="3"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                  >
                    <TextField.Slot>
                      <Link2Icon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
                <Button 
                  size="3" 
                  onClick={handleLoadVideo}
                  disabled={!videoUrl.trim()}
                  className={buttonStyles.actionButton}
                >
                  <PlayIcon width="16" height="16" />
                  Load
                </Button>
              </Flex>

              <Text size="1" color="gray">
                Supported: MP4, WebM, MOV, HLS streams
              </Text>
            </Flex>
          </Card>
        </Container>
      ) : (
        // Viewer State - Fullscreen
        <TechniqueViewer 
          videoUrl={loadedUrl} 
          onBack={handleBack}
          backLabel={backLabel}
        />
      )}
    </Box>
  );
}

