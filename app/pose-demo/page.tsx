"use client";

import { useState, useRef } from "react";
import { Container, Heading, Text, Flex, Box, Button, Card } from "@radix-ui/themes";
import { VideoPoseViewer } from "@/components/chat/VideoPoseViewer";
import { UploadIcon, TrashIcon } from "@radix-ui/react-icons";

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
    <Box
      className="absolute inset-0 overflow-auto overscroll-contain"
      style={{
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Container size="3" py="6">
        <Flex direction="column" gap="6">
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
                  className="action-button-square"
                  onClick={handleClearVideo}
                >
                  <TrashIcon width="16" height="16" />
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

        


        </Flex>
      </Container>
    </Box>
  );
}
