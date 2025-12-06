"use client";

import { useState, useRef, useEffect } from "react";
import { Container, Heading, Text, Flex, Box, Button, Card, Code, Badge, Tabs } from "@radix-ui/themes";
import { logger } from "@/lib/logger";
import { VideoPoseViewer } from "@/components/chat/viewers/VideoPoseViewer";
import { SAM2Viewer } from "@/components/chat/viewers/SAM2Viewer";
import { UploadIcon, TrashIcon } from "@radix-ui/react-icons";
import * as tf from "@tensorflow/tfjs";
import { getCacheDiagnostics, type CacheDiagnostics } from "@/lib/model-cache-diagnostics";
import buttonStyles from "@/styles/buttons.module.css";

export default function PoseDemoPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<CacheDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check cache diagnostics on mount and periodically
  useEffect(() => {
    const checkDiagnostics = async () => {
      try {
        const diag = await getCacheDiagnostics();
        logger.debug("🔍 Cache diagnostics:", diag);
        setDiagnostics(diag);
      } catch (err) {
        logger.error("Failed to get diagnostics:", err);
      }
    };
    
    checkDiagnostics();
    
    // Recheck every 5 seconds
    const interval = setInterval(checkDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

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
        
        {/* Diagnostics Panel */}
        {showDiagnostics && diagnostics && (
          <Card size="2">
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">📊 Model Cache Diagnostics</Text>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={() => setShowDiagnostics(false)}
                >
                  Hide
                </Button>
              </Flex>
              
              {/* Status Badges */}
              <Flex gap="2" wrap="wrap">
                <Badge color={diagnostics.indexedDBAvailable ? "green" : "red"}>
                  IndexedDB: {diagnostics.indexedDBAvailable ? "✓" : "✗"}
                </Badge>
                <Badge color={diagnostics.cacheAPIAvailable ? "green" : "red"}>
                  Cache API: {diagnostics.cacheAPIAvailable ? "✓" : "✗"}
                </Badge>
                <Badge color={diagnostics.cacheSize > 0 ? "green" : "orange"}>
                  IDB Models: {diagnostics.cacheSize}
                </Badge>
                <Badge color={(diagnostics.cacheAPIEntries || 0) > 0 ? "green" : "orange"}>
                  HTTP Cache: {diagnostics.cacheAPIEntries || 0} files
                </Badge>
                {diagnostics.storageQuota && (
                  <Badge color={diagnostics.storageQuota.percentUsed > 80 ? "red" : "blue"}>
                    Storage: {(diagnostics.storageQuota.usage / 1024 / 1024).toFixed(1)}MB / {(diagnostics.storageQuota.quota / 1024 / 1024).toFixed(0)}MB ({diagnostics.storageQuota.percentUsed.toFixed(1)}%)
                  </Badge>
                )}
              </Flex>
              
              {/* Model List */}
              {diagnostics.cacheSize === 0 ? (
                <Box>
                  <Text size="2" color="orange" weight="medium">
                    ⚠️ No models cached yet
                  </Text>
                  <Text size="1" color="gray">
                    Models will be downloaded when you load a video. This is normal on first use.
                  </Text>
                </Box>
              ) : (
                <Box>
                  <Text size="2" weight="medium" mb="2">✅ Cached models:</Text>
                  <Box style={{ maxHeight: "200px", overflow: "auto" }}>
                    {diagnostics.cachedModels.map((key, idx) => (
                      <Code key={idx} size="1" style={{ display: "block", marginBottom: "4px", wordBreak: "break-all" }}>
                        {key}
                      </Code>
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Instructions */}
              <Box style={{ borderTop: "1px solid var(--gray-5)", paddingTop: "12px" }}>
                <Text size="2" weight="medium" mb="2">🧪 Test Instructions:</Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  1. Open your browser&apos;s Developer Tools (F12)
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  2. Go to the Console tab to see detailed logging
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  3. Load a video below and wait for pose detection to initialize
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  4. Check console for &quot;Network: X requests, Y MB loaded&quot; message
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  5. Refresh the page (Cmd+R / Ctrl+R)
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "8px" }}>
                  6. Load a video again and check if network traffic is reduced
                </Text>
                <Text size="2" weight="medium" mt="2" mb="1">📊 What to look for:</Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  • First load: ~6-13MB download (depending on model)
                </Text>
                <Text size="1" color="gray" style={{ display: "block", marginBottom: "4px" }}>
                  • Subsequent loads: Should show &quot;loaded from cache&quot; or minimal traffic
                </Text>
                <Text size="1" color="gray" style={{ display: "block" }}>
                  • If you see large downloads every time, caching is NOT working
                </Text>
              </Box>
            </Flex>
          </Card>
        )}
        
        {!showDiagnostics && (
          <Button
            size="1"
            variant="soft"
            onClick={() => setShowDiagnostics(true)}
          >
            Show Cache Diagnostics
          </Button>
        )}
        
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
                className={buttonStyles.actionButton}
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

        {/* Video Player with Model Detection */}
        {videoUrl && (
          <Card size="3">
            <Flex direction="column" gap="4">
              <Flex justify="between" align="center">
                <Text size="2" weight="bold" color="gray">
                  {fileName}
                </Text>
                <Button
                  size="2"
                  className={buttonStyles.actionButtonSquare}
                  onClick={handleClearVideo}
                >
                  <TrashIcon width="16" height="16" />
                  Clear Video
                </Button>
              </Flex>
              
              {/* Tabbed interface for different detection models */}
              <Tabs.Root defaultValue="pose">
                <Tabs.List>
                  <Tabs.Trigger value="pose">Pose Detection</Tabs.Trigger>
                  <Tabs.Trigger value="sam2">SAM 2 Segmentation</Tabs.Trigger>
                </Tabs.List>

                <Box pt="4">
                  <Tabs.Content value="pose">
                    <VideoPoseViewer
                      videoUrl={videoUrl}
                      width={800}
                      height={600}
                      autoPlay={false}
                      showControls={true}
                    />
                  </Tabs.Content>

                  <Tabs.Content value="sam2">
                    <Flex direction="column" gap="3">
                      <Box p="3" style={{ background: "var(--blue-3)", borderRadius: "8px" }}>
                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                          🎯 SAM 2 Interactive Segmentation
                        </Text>
                        <Text size="1" color="gray" style={{ display: "block" }}>
                          SAM 2 (Segment Anything Model 2) provides pixel-perfect segmentation for rackets, balls, and other sports equipment.
                          Enable it below and click on objects in the video to segment them!
                        </Text>
                      </Box>
                      
                      <SAM2Viewer
                        videoUrl={videoUrl}
                        width={800}
                        height={600}
                      />
                      
                      <Box p="3" style={{ background: "var(--gray-2)", borderRadius: "8px" }}>
                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                          📚 Usage Tips
                        </Text>
                        <Text size="1" style={{ display: "block", marginBottom: "4px" }}>
                          • Start with <strong>Tiny</strong> model for fast, real-time segmentation
                        </Text>
                        <Text size="1" style={{ display: "block", marginBottom: "4px" }}>
                          • Click <strong>foreground points</strong> (red) on objects you want to segment
                        </Text>
                        <Text size="1" style={{ display: "block", marginBottom: "4px" }}>
                          • Add <strong>background points</strong> (blue) to exclude unwanted areas
                        </Text>
                        <Text size="1" style={{ display: "block", marginBottom: "4px" }}>
                          • Use 2-5 points for best results
                        </Text>
                        <Text size="1" style={{ display: "block", marginBottom: "8px" }}>
                          • Models will be downloaded on first use (~40-900MB depending on size)
                        </Text>
                        <Text size="1" weight="bold" style={{ display: "block" }}>
                          ⚠️ Note: SAM 2 models must be exported first. See <Code>docs/SAM2_INTEGRATION.md</Code> for instructions.
                        </Text>
                      </Box>
                    </Flex>
                  </Tabs.Content>
                </Box>
              </Tabs.Root>
            </Flex>
          </Card>
        )}

        


        </Flex>
      </Container>
    </Box>
  );
}
