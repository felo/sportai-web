"use client";

import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Box, Flex, Button, Text, Switch, Spinner, Select } from "@radix-ui/themes";
import { PlayIcon, PauseIcon, ResetIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
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
  const [useAccurateMode, setUseAccurateMode] = useState(false);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [confidenceMode, setConfidenceMode] = useState<"standard" | "high" | "low">("standard");
  const [resolutionMode, setResolutionMode] = useState<"fast" | "balanced" | "accurate">("balanced");
  const [dimensions, setDimensions] = useState({ width, height });
  const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);
  const [videoFPS, setVideoFPS] = useState(30); // Default FPS, will be detected
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTrajectories, setShowTrajectories] = useState(false);
  const [selectedJoints, setSelectedJoints] = useState<number[]>([9, 10]); // Default: wrists
  const [jointTrajectories, setJointTrajectories] = useState<Map<number, Array<{x: number, y: number, frame: number}>>>(new Map());
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessProgress, setPreprocessProgress] = useState(0);
  const [preprocessedPoses, setPreprocessedPoses] = useState<Map<number, PoseDetectionResult[]>>(new Map());
  const [usePreprocessing, setUsePreprocessing] = useState(false);
  const [maxPoses, setMaxPoses] = useState(1);

  // Track average confidence stats: Map<personIndex, { sum: number, count: number }>
  const confidenceStats = useRef<Map<number, { sum: number; count: number }>>(new Map());

  // Update confidence stats when poses change
  useEffect(() => {
    if (currentPoses.length === 0) return;
    
    currentPoses.forEach((pose, idx) => {
      if (pose.score !== null && pose.score !== undefined) {
        const stats = confidenceStats.current.get(idx) || { sum: 0, count: 0 };
        stats.sum += pose.score;
        stats.count += 1;
        confidenceStats.current.set(idx, stats);
      }
    });
  }, [currentPoses]);

  // Confidence threshold presets
  const confidencePresets = {
    standard: { minPoseScore: 0.25, minPartScore: 0.3 },
    high: { minPoseScore: 0.5, minPartScore: 0.5 },
    low: { minPoseScore: 0.15, minPartScore: 0.2 },
  };

  const currentConfidence = confidencePresets[confidenceMode];
  
  // Memoize resolution to prevent object recreation
  const currentResolution = React.useMemo(() => {
    const presets = {
      fast: { width: 160, height: 160 },
      balanced: { width: 256, height: 256 },
      accurate: { width: 384, height: 384 },
    };
    return presets[resolutionMode];
  }, [resolutionMode]);

  // Automatically switch to MultiPose when maxPoses > 1
  const effectiveModelType = maxPoses > 1 
    ? "MultiPose.Lightning" 
    : (useAccurateMode ? "SinglePose.Thunder" : "SinglePose.Lightning");

  const { isLoading, loadingFromCache, error, isDetecting, detectPose, startDetection, stopDetection, clearModelCache } =
    usePoseDetection({
      modelType: effectiveModelType,
      enableSmoothing: enableSmoothing,
      minPoseScore: currentConfidence.minPoseScore,
      minPartScore: currentConfidence.minPartScore,
      inputResolution: currentResolution,
      maxPoses: maxPoses,
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
      
      // Detect video FPS
      detectVideoFPS(video);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [width, height]);

  // Detect video FPS using requestVideoFrameCallback if available
  const detectVideoFPS = (video: HTMLVideoElement) => {
    // Check if requestVideoFrameCallback is available (Chrome/Edge)
    if ('requestVideoFrameCallback' in video) {
      let frameCount = 0;
      let startTime = 0;
      const maxFrames = 60; // Sample 60 frames to calculate FPS

      const callback = (now: number, metadata: any) => {
        if (frameCount === 0) {
          startTime = now;
        }
        
        frameCount++;
        
        if (frameCount >= maxFrames) {
          const elapsed = (now - startTime) / 1000; // Convert to seconds
          const detectedFPS = Math.round(frameCount / elapsed);
          setVideoFPS(detectedFPS);
          console.log(`Detected video FPS: ${detectedFPS}`);
        } else if (!video.paused && !video.ended) {
          (video as any).requestVideoFrameCallback(callback);
        }
      };

      // Start detection when video plays
      const startDetection = () => {
        frameCount = 0;
        (video as any).requestVideoFrameCallback(callback);
      };

      video.addEventListener('play', startDetection, { once: true });
    } else {
      // Fallback: Try to estimate from common frame rates
      // Most videos are 24, 25, 30, or 60 FPS
      console.log('requestVideoFrameCallback not available, using default 30 FPS');
      setVideoFPS(30);
    }
  };

  // Handle continuous pose detection while playing (only if not using preprocessed mode)
  useEffect(() => {
    const video = videoRef.current;
    
    // Skip real-time detection if using preprocessed poses
    if (usePreprocessing) {
      stopDetection();
      return;
    }
    
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
  }, [isPlaying, showSkeleton, isLoading, usePreprocessing]);

  // Handle pose detection when scrubbing (seeked event) while paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showSkeleton || isLoading) return;

    const handleSeeked = async () => {
      // Update frame number
      const frame = Math.floor(video.currentTime * videoFPS);
      setCurrentFrame(frame);
      
      if (video.paused) {
        // Use preprocessed poses if available
        if (usePreprocessing && preprocessedPoses.has(frame)) {
          setCurrentPoses(preprocessedPoses.get(frame) || []);
        } else if (detectPose) {
          // Otherwise detect in real-time
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            console.error('Error detecting pose on seek:', err);
          }
        }
      }
    };

    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, [showSkeleton, isLoading, detectPose, videoFPS, usePreprocessing, preprocessedPoses]);

  // Track current frame number during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateFrameNumber = () => {
      setCurrentFrame(Math.floor(video.currentTime * videoFPS));
    };

    video.addEventListener('timeupdate', updateFrameNumber);
    return () => video.removeEventListener('timeupdate', updateFrameNumber);
  }, [videoFPS]);

  // Sync preprocessed poses during playback using requestAnimationFrame for smooth updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !usePreprocessing || !isPlaying) return;

    let rafId: number;
    let lastFrame = -1;

    const syncPoses = () => {
      if (!video.paused && !video.ended) {
        const currentFrame = Math.floor(video.currentTime * videoFPS);
        
        // Only update if we're on a new frame
        if (currentFrame !== lastFrame && preprocessedPoses.has(currentFrame)) {
          const poses = preprocessedPoses.get(currentFrame);
          if (poses && poses.length > 0) {
            setCurrentPoses(poses);
            lastFrame = currentFrame;
          }
        }
        
        rafId = requestAnimationFrame(syncPoses);
      }
    };

    syncPoses();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [usePreprocessing, isPlaying, videoFPS, preprocessedPoses]);

  // Auto-adjust playback speed for accurate trajectory tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // When trajectories enabled, slow down for deterministic frame capture
    if (showTrajectories) {
      video.playbackRate = 0.25; // 4x slower for accurate tracking
    } else {
      video.playbackRate = playbackSpeed; // Normal speed
    }
  }, [showTrajectories, playbackSpeed]);

  // Update trajectories when poses change (only track first person for now)
  useEffect(() => {
    if (!showTrajectories || currentPoses.length === 0) return;

    const video = videoRef.current;
    if (!video) return;

    const scaleX = dimensions.width / video.videoWidth;
    const scaleY = dimensions.height / video.videoHeight;

    setJointTrajectories(prev => {
      const newTrajectories = new Map(prev);
      
      // Track first person only for trajectories
      const firstPose = currentPoses[0];
      if (!firstPose) return prev;
      
      for (const jointIndex of selectedJoints) {
        const keypoint = firstPose.keypoints[jointIndex];
        if (keypoint && (keypoint.score ?? 0) > 0.3) {
          const trajectory = newTrajectories.get(jointIndex) || [];
          trajectory.push({
            x: keypoint.x * scaleX,
            y: keypoint.y * scaleY,
            frame: currentFrame,
          });
          
          // Keep last 300 points to avoid memory issues
          if (trajectory.length > 300) {
            trajectory.shift();
          }
          
          newTrajectories.set(jointIndex, trajectory);
        }
      }
      
      return newTrajectories;
    });
  }, [currentPoses, showTrajectories, selectedJoints, currentFrame, dimensions.width, dimensions.height]);

  // Draw skeleton on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trajectories first (behind skeleton)
    if (showTrajectories && jointTrajectories.size > 0) {
      const jointColors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#B8E994",
        "#FDA7DF", "#82CCDD", "#F6A6D1", "#A29BFE", "#FD79A8",
        "#FDCB6E", "#6C5CE7"
      ];

      jointTrajectories.forEach((trajectory, jointIndex) => {
        if (trajectory.length < 2) return;
        
        const color = jointColors[jointIndex % jointColors.length];
        
        // Draw trajectory line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        
        for (let i = 1; i < trajectory.length; i++) {
          ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        
        ctx.stroke();
        
        // Draw dots along trajectory
        trajectory.forEach((point, index) => {
          if (index % 5 === 0) { // Draw every 5th point to reduce clutter
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      });
    }

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
  }, [currentPoses, showSkeleton, showTrajectories, jointTrajectories, dimensions.width, dimensions.height]);

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
    setJointTrajectories(new Map()); // Clear trajectories
    confidenceStats.current.clear(); // Clear confidence stats
  };

  const handlePreprocess = async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isLoading) return;

    setIsPreprocessing(true);
    setPreprocessProgress(0);
    setPreprocessedPoses(new Map());

    // Pause video
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    try {
      const fps = videoFPS;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      const allPoses = new Map<number, PoseDetectionResult[]>();
      
      console.log(`Pre-processing ${totalFrames} frames at ${fps} FPS...`);

      for (let frame = 0; frame < totalFrames; frame++) {
        // Seek to exact frame
        const targetTime = frame / fps;
        video.currentTime = targetTime;
        
        // Wait for seek to complete
        await new Promise<void>(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Detect pose on this frame
        const poses = await detectPose(video);
        allPoses.set(frame, poses);

        // Update progress
        const progress = ((frame + 1) / totalFrames) * 100;
        setPreprocessProgress(progress);

        // Small delay to prevent browser freezing
        if (frame % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      console.log(`Pre-processing complete! Processed ${totalFrames} frames.`);
      setPreprocessedPoses(allPoses);
      setIsPreprocessing(false);
      setPreprocessProgress(100);
      setUsePreprocessing(true); // Auto-enable preprocessed mode

      // Reset to start and load first frame's pose
      video.currentTime = 0;
      const firstPoses = allPoses.get(0);
      if (firstPoses) {
        setCurrentPoses(firstPoses);
      }
    } catch (err) {
      console.error('Pre-processing error:', err);
      setIsPreprocessing(false);
      setPreprocessProgress(0);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    stopDetection();
  };

  const handleFrameStep = async (direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;

    // Pause the video if playing
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    // Calculate frame duration based on detected FPS
    const frameDuration = 1 / videoFPS; // seconds per frame

    // Step forward or backward by one frame
    if (direction === 'forward') {
      video.currentTime = Math.min(video.currentTime + frameDuration, video.duration);
    } else {
      video.currentTime = Math.max(video.currentTime - frameDuration, 0);
    }

    // Update frame and pose
    const newFrame = Math.floor(video.currentTime * videoFPS);
    setCurrentFrame(newFrame);

    // Use preprocessed poses if available, otherwise detect in real-time
    if (usePreprocessing && preprocessedPoses.has(newFrame)) {
      setCurrentPoses(preprocessedPoses.get(newFrame) || []);
    } else if (detectPose && showSkeleton && !isLoading) {
      try {
        const poses = await detectPose(video);
        setCurrentPoses(poses);
      } catch (err) {
        console.error('Error detecting pose on frame step:', err);
      }
    }
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

        {/* Stats Overlay */}
        {showSkeleton && currentPoses.length > 0 && (
          <Box
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              padding: "8px 12px",
              borderRadius: "var(--radius-3)",
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            <Flex direction="column" gap="1">
              <Text size="1" weight="medium" style={{ color: "white", fontFamily: "var(--font-mono)" }}>
                Frame {currentFrame} • {videoFPS} FPS
              </Text>
              <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                Detected {currentPoses.length} {currentPoses.length === 1 ? "person" : "people"}
              </Text>
              {currentPoses.map((pose, idx) => {
                const stats = confidenceStats.current.get(idx);
                const avgConfidence = stats ? (stats.sum / stats.count) : (pose.score || 0);
                
                return (
                  <Text key={idx} size="1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    Person {idx + 1}: {pose.score ? `${(pose.score * 100).toFixed(0)}%` : "N/A"}
                    {" • Avg: "}{(avgConfidence * 100).toFixed(0)}%
                  </Text>
                );
              })}
            </Flex>
          </Box>
        )}
        
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
            <Flex align="center" gap="2" direction="column" style={{ color: "white" }}>
              <Flex align="center" gap="2">
                <Spinner size="3" />
                <Text size="4">
                  {loadingFromCache ? "Loading model from cache..." : "Downloading model..."}
                </Text>
              </Flex>
              {!loadingFromCache && (
                <Text size="1" style={{ opacity: 0.8 }}>
                  First load: ~6-13MB. Will be cached for next time.
                </Text>
              )}
            </Flex>
          </Flex>
        )}
      </Box>

      {/* Controls */}
      {showControls && (
        <Flex direction="column" gap="2">
          {/* Playback Controls */}
          <Flex gap="2" align="center" wrap="wrap">
            <Button
              onClick={handlePlayPause}
              disabled={isLoading || isPreprocessing}
              variant="soft"
              size="2"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading || isPreprocessing}
              variant="soft"
              size="2"
            >
              <ResetIcon />
              Reset
            </Button>
            {!isPreprocessing && !usePreprocessing && (
              <Button
                onClick={handlePreprocess}
                disabled={isLoading}
                variant="soft"
                size="2"
                color="mint"
              >
                Pre-process All Frames
              </Button>
            )}
            {usePreprocessing && (
              <Button
                onClick={() => {
                  setUsePreprocessing(false);
                  setPreprocessedPoses(new Map());
                }}
                variant="soft"
                size="2"
                color="amber"
              >
                Using Pre-processed • Click to Disable
              </Button>
            )}
          </Flex>

          {/* Pre-processing Progress */}
          {isPreprocessing && (
            <Flex direction="column" gap="2" p="3" style={{
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-2)",
            }}>
              <Flex align="center" gap="2">
                <Spinner size="2" />
                <Text size="2" weight="medium">
                  Pre-processing video frames...
                </Text>
              </Flex>
              <Box style={{ width: "100%", height: "8px", backgroundColor: "var(--gray-6)", borderRadius: "4px", overflow: "hidden" }}>
                <Box style={{ 
                  width: `${preprocessProgress}%`, 
                  height: "100%", 
                  backgroundColor: "var(--mint-9)",
                  transition: "width 0.1s"
                }} />
              </Box>
              <Text size="1" color="gray">
                {preprocessProgress.toFixed(1)}% complete • This may take 30-60 seconds for longer videos
              </Text>
            </Flex>
          )}

          {/* Frame-by-Frame Navigation */}
          <Flex gap="2" align="center">
            <Button
              onClick={() => handleFrameStep('backward')}
              disabled={isLoading}
              variant="soft"
              size="2"
              style={{ flex: 1 }}
            >
              <ChevronLeftIcon width="16" height="16" />
              Previous Frame
            </Button>
            <Button
              onClick={() => handleFrameStep('forward')}
              disabled={isLoading}
              variant="soft"
              size="2"
              style={{ flex: 1 }}
            >
              Next Frame
              <ChevronRightIcon width="16" height="16" />
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

          {/* Playback Speed Selector */}
          <Flex direction="column" gap="1">
            <Text size="2" color="gray" weight="medium">
              Playback speed
            </Text>
            <Select.Root
              value={playbackSpeed.toString()}
              onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
              disabled={isLoading || showTrajectories}
            >
              <Select.Trigger 
                style={{ width: "100%", height: "70px", padding: "12px" }}
                placeholder="Select speed..."
              >
                <Flex direction="column" gap="1" align="start">
                  <Text weight="medium" size="2">
                    {playbackSpeed === 0.25 && "0.25× (Slowest)"}
                    {playbackSpeed === 0.5 && "0.5× (Slow)"}
                    {playbackSpeed === 1.0 && "1.0× (Normal)"}
                    {playbackSpeed === 2.0 && "2.0× (Fast)"}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                    {playbackSpeed === 0.25 && "Frame-perfect tracking, no skipped frames"}
                    {playbackSpeed === 0.5 && "Good balance for most analysis"}
                    {playbackSpeed === 1.0 && "Standard playback speed"}
                    {playbackSpeed === 2.0 && "Quick review (may skip some frames)"}
                  </Text>
                </Flex>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="0.25" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">0.25× (Slowest)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Frame-perfect tracking, no skipped frames
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="0.5" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">0.5× (Slow)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Good balance for most analysis
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="1.0" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">1.0× (Normal)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Standard playback speed
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="2.0" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">2.0× (Fast)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Quick review (may skip some frames)
                    </Text>
                  </Flex>
                </Select.Item>
              </Select.Content>
            </Select.Root>
            <Text size="1" color="gray" style={{ opacity: 0.7 }}>
              {showTrajectories 
                ? "Auto-set to 0.25× for accurate trajectory tracking"
                : `Current speed: ${playbackSpeed}×`}
            </Text>
          </Flex>

          {/* Temporal Smoothing Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={enableSmoothing}
              onCheckedChange={setEnableSmoothing}
              disabled={isLoading || isDetecting}
            />
            <Flex direction="column" gap="0">
              <Text size="2" color="gray">
                Temporal smoothing
              </Text>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {enableSmoothing 
                  ? "Smooth tracking, reduces jitter. Better for viewing."
                  : "Raw keypoints, no filtering. Shows exact frame data."}
              </Text>
            </Flex>
          </Flex>

          {/* Trajectory Tracking Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={showTrajectories}
              onCheckedChange={(checked) => {
                setShowTrajectories(checked);
                if (!checked) {
                  setJointTrajectories(new Map()); // Clear when disabled
                }
              }}
              disabled={isLoading}
            />
            <Flex direction="column" gap="0">
              <Text size="2" color="gray">
                Draw joint trajectories
              </Text>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {showTrajectories 
                  ? "Recording motion paths. Use Reset to clear."
                  : "Track joint movements over time."}
              </Text>
            </Flex>
          </Flex>

          {/* Joint Selection (shown when trajectories enabled) */}
          {showTrajectories && (
            <Flex direction="column" gap="1">
              <Flex justify="between" align="center">
                <Text size="2" color="gray" weight="medium">
                  Track joints ({selectedJoints.length} selected)
                </Text>
              </Flex>
              
              {/* Quick Presets */}
              <Flex gap="1" wrap="wrap">
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedJoints([9, 10])}
                  color={selectedJoints.length === 2 && selectedJoints.includes(9) && selectedJoints.includes(10) ? "mint" : "gray"}
                >
                  Wrists
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedJoints([7, 8, 9, 10])}
                  color="gray"
                >
                  Arms
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedJoints([11, 12, 13, 14, 15, 16])}
                  color="gray"
                >
                  Legs
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedJoints([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])}
                  color="gray"
                >
                  All
                </Button>
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => {
                    setSelectedJoints([]);
                    setJointTrajectories(new Map());
                  }}
                  color="gray"
                >
                  Clear
                </Button>
              </Flex>

              {/* Individual Joint Checkboxes - Compact Grid */}
              <Flex 
                direction="column" 
                gap="1" 
                style={{ 
                  maxHeight: "150px", 
                  overflowY: "auto",
                  border: "1px solid var(--gray-6)",
                  borderRadius: "var(--radius-2)",
                  padding: "6px"
                }}
              >
                <Flex wrap="wrap" gap="1">
                  {[
                    { id: 0, name: "Nose", color: "#FF6B6B" },
                    { id: 1, name: "L Eye", color: "#4ECDC4" },
                    { id: 2, name: "R Eye", color: "#45B7D1" },
                    { id: 3, name: "L Ear", color: "#FFA07A" },
                    { id: 4, name: "R Ear", color: "#98D8C8" },
                    { id: 5, name: "L Shoulder", color: "#F7DC6F" },
                    { id: 6, name: "R Shoulder", color: "#BB8FCE" },
                    { id: 7, name: "L Elbow", color: "#85C1E2" },
                    { id: 8, name: "R Elbow", color: "#F8B88B" },
                    { id: 9, name: "L Wrist", color: "#B8E994" },
                    { id: 10, name: "R Wrist", color: "#FDA7DF" },
                    { id: 11, name: "L Hip", color: "#82CCDD" },
                    { id: 12, name: "R Hip", color: "#F6A6D1" },
                    { id: 13, name: "L Knee", color: "#A29BFE" },
                    { id: 14, name: "R Knee", color: "#FD79A8" },
                    { id: 15, name: "L Ankle", color: "#FDCB6E" },
                    { id: 16, name: "R Ankle", color: "#6C5CE7" },
                  ].map((joint) => (
                    <Flex 
                      key={joint.id} 
                      align="center" 
                      gap="1" 
                      style={{ 
                        padding: "2px 6px",
                        borderRadius: "var(--radius-2)",
                        backgroundColor: selectedJoints.includes(joint.id) ? "var(--gray-3)" : "transparent",
                        cursor: "pointer",
                        minWidth: "80px"
                      }}
                      onClick={() => {
                        if (selectedJoints.includes(joint.id)) {
                          setSelectedJoints(selectedJoints.filter(j => j !== joint.id));
                          setJointTrajectories(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(joint.id);
                            return newMap;
                          });
                        } else {
                          setSelectedJoints([...selectedJoints, joint.id]);
                        }
                      }}
                    >
                      <Box
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: joint.color,
                          opacity: selectedJoints.includes(joint.id) ? 1 : 0.3,
                        }}
                      />
                      <Text size="1" style={{ opacity: selectedJoints.includes(joint.id) ? 1 : 0.6 }}>
                        {joint.name}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            </Flex>
          )}

          {/* Max People Slider */}
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text size="2" color="gray" weight="medium">
                Detect people
              </Text>
              <Text size="2" color="mint" weight="bold">
                {maxPoses} {maxPoses === 1 ? "person" : "people"}
              </Text>
            </Flex>
            <input
              type="range"
              min="1"
              max="6"
              value={maxPoses}
              onChange={(e) => setMaxPoses(parseInt(e.target.value))}
              disabled={isLoading || isDetecting}
              style={{
                width: "100%",
                cursor: isLoading || isDetecting ? "not-allowed" : "pointer",
              }}
            />
            <Text size="1" color="gray" style={{ opacity: 0.7 }}>
              {maxPoses === 1 
                ? "Single person mode (Lightning/Thunder)" 
                : `Multi-person mode (up to ${maxPoses} people)`}
            </Text>
            {maxPoses > 1 && (
              <Text size="1" color="amber">
                Note: MultiPose.Lightning is always used when detecting 2+ people
              </Text>
            )}
          </Flex>

          {/* Accurate Mode Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={useAccurateMode}
              onCheckedChange={setUseAccurateMode}
              disabled={isLoading || isDetecting || maxPoses > 1}
            />
            <Flex direction="column" gap="0">
              <Text size="2" color="gray">
                High accuracy mode
                {maxPoses === 1 && useAccurateMode && (
                  <Text as="span" color="amber" ml="2">
                    • Thunder
                  </Text>
                )}
                {maxPoses === 1 && !useAccurateMode && (
                  <Text as="span" color="mint" ml="2">
                    • Lightning
                  </Text>
                )}
                {maxPoses > 1 && (
                  <Text as="span" color="gray" ml="2">
                    • N/A
                  </Text>
                )}
              </Text>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {maxPoses > 1 
                  ? "Not available for multi-person detection"
                  : (useAccurateMode 
                    ? "More accurate, slower (~2x). Best for analysis."
                    : "Fast, real-time. Good for live viewing.")}
              </Text>
            </Flex>
          </Flex>

          {/* Confidence Threshold Selector */}
          <Flex direction="column" gap="1">
            <Text size="2" color="gray" weight="medium">
              Detection sensitivity
            </Text>
            <Select.Root
              value={confidenceMode}
              onValueChange={(value: "standard" | "high" | "low") => setConfidenceMode(value)}
              disabled={isLoading || isDetecting}
            >
              <Select.Trigger 
                style={{ width: "100%", height: "70px", padding: "12px" }}
                placeholder="Select sensitivity..."
              >
                <Flex direction="column" gap="1" align="start">
                  <Text weight="medium" size="2">
                    {confidenceMode === "high" && "High Quality"}
                    {confidenceMode === "standard" && "Standard"}
                    {confidenceMode === "low" && "Challenging Conditions"}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                    {confidenceMode === "high" && "Indoor, good lighting. Only confident keypoints."}
                    {confidenceMode === "standard" && "Balanced. Good for most videos."}
                    {confidenceMode === "low" && "Outdoor, motion blur, or distant subjects."}
                  </Text>
                </Flex>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="high" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">High Quality</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Indoor, good lighting. Only confident keypoints.
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="standard" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">Standard</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Balanced. Good for most videos.
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="low" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">Challenging Conditions</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Outdoor, motion blur, or distant subjects.
                    </Text>
                  </Flex>
                </Select.Item>
              </Select.Content>
            </Select.Root>
            <Text size="1" color="gray" style={{ opacity: 0.7 }}>
              {confidenceMode === "high" && "Thresholds: 0.5 / 0.5 - Cleanest results"}
              {confidenceMode === "standard" && "Thresholds: 0.25 / 0.3 - Default balance"}
              {confidenceMode === "low" && "Thresholds: 0.15 / 0.2 - Maximum detection"}
            </Text>
          </Flex>

          {/* Input Resolution Selector */}
          <Flex direction="column" gap="1">
            <Text size="2" color="gray" weight="medium">
              Processing resolution
            </Text>
            <Select.Root
              value={resolutionMode}
              onValueChange={(value: "fast" | "balanced" | "accurate") => setResolutionMode(value)}
              disabled={isLoading || isDetecting}
            >
              <Select.Trigger 
                style={{ width: "100%", height: "70px", padding: "12px" }}
                placeholder="Select resolution..."
              >
                <Flex direction="column" gap="1" align="start">
                  <Text weight="medium" size="2">
                    {resolutionMode === "fast" && "Fast (160×160)"}
                    {resolutionMode === "balanced" && "Balanced (256×256)"}
                    {resolutionMode === "accurate" && "Accurate (384×384)"}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                    {resolutionMode === "fast" && "~2x faster. Good for real-time on slower devices."}
                    {resolutionMode === "balanced" && "Default. Good balance of speed and accuracy."}
                    {resolutionMode === "accurate" && "Best for small/distant subjects. Slower processing."}
                  </Text>
                </Flex>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="fast" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">Fast (160×160)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      ~2x faster. Good for real-time on slower devices.
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="balanced" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">Balanced (256×256)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Default. Good balance of speed and accuracy.
                    </Text>
                  </Flex>
                </Select.Item>
                <Select.Item value="accurate" style={{ minHeight: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1">
                    <Text weight="medium" size="2">Accurate (384×384)</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Best for small/distant subjects. Slower processing.
                    </Text>
                  </Flex>
                </Select.Item>
              </Select.Content>
            </Select.Root>
            <Text size="1" color="gray" style={{ opacity: 0.7 }}>
              {resolutionMode === "fast" && "Lower res = faster processing, less detail"}
              {resolutionMode === "balanced" && "Standard resolution for most use cases"}
              {resolutionMode === "accurate" && "Higher res = better for small subjects"}
            </Text>
          </Flex>

          {/* Pose Info - MOVED TO OVERLAY */}


          {/* Error Display */}
          {error && (
            <Flex direction="column" gap="2">
              <Text size="2" color="red">
                Error: {error}
              </Text>
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={async () => {
                  const cleared = await clearModelCache();
                  if (cleared > 0) {
                    window.location.reload();
                  }
                }}
              >
                Clear Cache & Reload
              </Button>
            </Flex>
          )}
        </Flex>
      )}
    </Flex>
  );
}

