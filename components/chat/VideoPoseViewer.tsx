"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Flex, Button, Text, Switch, Spinner } from "@radix-ui/themes";
import { PlayIcon, PauseIcon, ResetIcon } from "@radix-ui/react-icons";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { drawPose } from "@/types/pose";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

interface VideoPoseViewerProps {
  videoUrl: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  showControls?: boolean;
}

export function VideoPoseViewer({
  videoUrl,
  width = 640,
  height = 480,
  autoPlay = false,
  showControls = true,
}: VideoPoseViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [dimensions, setDimensions] = useState({ width, height });
  const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);

  const { isLoading, error, isDetecting, detectPose, startDetection, stopDetection } =
    usePoseDetection({
      enableSmoothing: true,
      minPoseScore: 0.25,
      minPartScore: 0.3,
    });

  // Update canvas dimensions when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      const containerWidth = containerRef.current?.clientWidth || width;
      
      let newWidth = containerWidth;
      let newHeight = containerWidth / aspectRatio;

      // Constrain height if needed
      if (newHeight > height) {
        newHeight = height;
        newWidth = height * aspectRatio;
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [width, height]);

  // Handle continuous pose detection while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showSkeleton || !isPlaying || isLoading) {
      stopDetection();
      return;
    }

    startDetection(video, (poses) => {
      setCurrentPoses(poses);
    });

    return () => {
      stopDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, showSkeleton, isLoading]);

  // Handle pose detection when scrubbing (seeked event) while paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showSkeleton || isLoading || !detectPose) return;

    const handleSeeked = async () => {
      if (video.paused) {
        // Detect pose on the current frame when user scrubs while paused
        try {
          const poses = await detectPose(video);
          setCurrentPoses(poses);
        } catch (err) {
          console.error('Error detecting pose on seek:', err);
        }
      }
    };

    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, [showSkeleton, isLoading, detectPose]);

  // Draw skeleton on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw poses
    if (showSkeleton && currentPoses.length > 0) {
      // Calculate scale factors from video native size to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      for (const pose of currentPoses) {
        // Scale keypoints from video space to canvas space
        const scaledKeypoints = pose.keypoints.map(kp => ({
          ...kp,
          x: kp.x * scaleX,
          y: kp.y * scaleY,
        }));
        
        drawPose(ctx, scaledKeypoints, {
          keypointColor: "#FF9800", // Orange center
          keypointOutlineColor: "#7ADB8F", // Mint green outline
          keypointRadius: 4,
          connectionColor: "#7ADB8F",
          connectionWidth: 3,
          minConfidence: 0.3,
        });
      }
    }
  }, [currentPoses, showSkeleton]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentPoses([]);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    stopDetection();
  };

  return (
    <Flex direction="column" gap="3">
      {/* Video Container with Canvas Overlay */}
      <Box
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: `${width}px`,
          backgroundColor: "var(--gray-2)",
          borderRadius: "var(--radius-3)",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          width={dimensions.width}
          height={dimensions.height}
          autoPlay={autoPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          controls
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 20,
            }}
          >
            <Flex align="center" gap="2" style={{ color: "white" }}>
              <Spinner size="3" />
              <Text>Loading pose detector...</Text>
            </Flex>
          </Flex>
        )}
      </Box>

      {/* Controls */}
      {showControls && (
        <Flex direction="column" gap="2">
          {/* Playback Controls */}
          <Flex gap="2" align="center">
            <Button
              onClick={handlePlayPause}
              disabled={isLoading}
              variant="soft"
              size="2"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading}
              variant="soft"
              size="2"
            >
              <ResetIcon />
              Reset
            </Button>
          </Flex>

          {/* Skeleton Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={showSkeleton}
              onCheckedChange={setShowSkeleton}
              disabled={isLoading}
            />
            <Text size="2" color="gray">
              Show skeleton overlay
              {isDetecting && showSkeleton && (
                <Text as="span" color="mint" ml="2">
                  • Detecting
                </Text>
              )}
            </Text>
          </Flex>

          {/* Pose Info */}
          {showSkeleton && currentPoses.length > 0 && (
            <Text size="1" color="gray">
              Detected {currentPoses.length} pose{currentPoses.length > 1 ? "s" : ""}
              {currentPoses[0]?.score && ` (confidence: ${(currentPoses[0].score * 100).toFixed(0)}%)`}
            </Text>
          )}

          {/* Error Display */}
          {error && (
            <Text size="2" color="red">
              Error: {error}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}

