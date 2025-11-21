"use client";

import { useState, useRef } from "react";
import { Container, Heading, Text, Flex, Box, Button, Card } from "@radix-ui/themes";
import { VideoPoseViewer } from "@/components/chat/VideoPoseViewer";
import { UploadIcon } from "@radix-ui/react-icons";

export default function PoseDemoPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        alert("Please select a video file");
        return;
      }

      // Create object URL for the video
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFileName(file.name);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleClearVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Container size="3" py="6">
        <Flex direction="column" gap="6">
        {/* Header */}
        <Box>
          <Heading size="8" mb="2" style={{ color: "var(--mint-9)" }}>
            Pose Detection Demo
          </Heading>
          <Text size="3" color="gray">
            Upload a video to see real-time skeleton detection overlay. This runs entirely in your browser using TensorFlow.js.
          </Text>
        </Box>

        {/* Upload Section */}
        {!videoUrl && (
          <Card size="3">
            <Flex direction="column" align="center" gap="4" py="6">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <Button
                size="4"
                onClick={handleSelectFile}
                className="action-button"
              >
                <UploadIcon width="20" height="20" />
                Select Video File
              </Button>
              <Text size="2" color="gray">
                Supported formats: MP4, WebM, MOV, and more
              </Text>
            </Flex>
          </Card>
        )}

        {/* Video Player with Pose Detection */}
        {videoUrl && (
          <Card size="3">
            <Flex direction="column" gap="4">
              <Flex justify="between" align="center">
                <Text size="2" weight="bold" color="gray">
                  {fileName}
                </Text>
                <Button
                  size="2"
                  variant="soft"
                  color="red"
                  onClick={handleClearVideo}
                >
                  Clear Video
                </Button>
              </Flex>
              
              <VideoPoseViewer
                videoUrl={videoUrl}
                width={800}
                height={600}
                autoPlay={false}
                showControls={true}
              />
            </Flex>
          </Card>
        )}

        {/* Info Section */}
        <Card size="2">
          <Flex direction="column" gap="3">
            <Heading size="4">How it works</Heading>
            <Flex direction="column" gap="2" as="ul" style={{ listStyle: "none", padding: 0 }}>
              <Text as="li" size="2">
                ✅ <strong>Client-side processing</strong> - All analysis happens in your browser
              </Text>
              <Text as="li" size="2">
                ✅ <strong>Real-time detection</strong> - Skeleton overlay updates as video plays
              </Text>
              <Text as="li" size="2">
                ✅ <strong>MoveNet model</strong> - Fast and accurate pose estimation
              </Text>
              <Text as="li" size="2">
                ✅ <strong>17 keypoints</strong> - Full body tracking from nose to ankles
              </Text>
              <Text as="li" size="2">
                ✅ <strong>Privacy-first</strong> - No video data leaves your device
              </Text>
            </Flex>
          </Flex>
        </Card>

        {/* Use Cases */}
        <Card size="2">
          <Flex direction="column" gap="3">
            <Heading size="4">Sports Analysis Use Cases</Heading>
            <Flex direction="column" gap="2" as="ul" style={{ listStyle: "none", padding: 0 }}>
              <Text as="li" size="2">
                🏃 <strong>Form analysis</strong> - Track running, jumping, or lifting technique
              </Text>
              <Text as="li" size="2">
                ⚽ <strong>Motion tracking</strong> - Analyze kicks, throws, and swings
              </Text>
              <Text as="li" size="2">
                🤸 <strong>Pose comparison</strong> - Compare athlete form to ideal technique
              </Text>
              <Text as="li" size="2">
                📊 <strong>Movement metrics</strong> - Extract angles, distances, and velocities
              </Text>
              <Text as="li" size="2">
                🎯 <strong>Injury prevention</strong> - Identify potentially harmful movements
              </Text>
            </Flex>
          </Flex>
        </Card>
        </Flex>
      </Container>
    </div>
  );
}

