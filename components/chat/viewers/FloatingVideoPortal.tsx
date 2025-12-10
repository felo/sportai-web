"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Tooltip } from "@radix-ui/themes";
import { EnterFullScreenIcon, ExitFullScreenIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { useFloatingVideoContext } from "./FloatingVideoContext";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getTheatreMode } from "@/utils/storage";
import type { DockCorner, Position } from "@/hooks/useFloatingVideo";

// Default aspect ratio fallback
const DEFAULT_ASPECT_RATIO = 16 / 9;

// Theatre mode ALWAYS respects the video's actual aspect ratio
// Standard mode: smaller floating window
// Theatre mode: larger floating window (~1.4x scale)
const STANDARD_BASE_WIDTH = 320;
const STANDARD_BASE_HEIGHT = 300; // For portrait videos

// Theatre mode is ~1.4x larger (same diagonal increase as 2x area)
const THEATRE_SCALE = 1.4;
const THEATRE_BASE_WIDTH = Math.round(STANDARD_BASE_WIDTH * THEATRE_SCALE);
const THEATRE_BASE_HEIGHT = Math.round(STANDARD_BASE_HEIGHT * THEATRE_SCALE);

// Size constraints
const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 700; // Accommodate tall portrait videos in theatre mode

// Minimized size
const MINIMIZED_SIZE = 56;

const EDGE_PADDING = 16;
const HEADER_OFFSET = 80;
const BOTTOM_OFFSET = 100;

type ResizeHandle = "nw" | "ne" | "sw" | "se" | null;

const getCornerPosition = (
  corner: DockCorner,
  width: number,
  height: number
): Position => {
  switch (corner) {
    case "top-left":
      return { x: EDGE_PADDING, y: EDGE_PADDING + HEADER_OFFSET };
    case "top-right":
      return { x: window.innerWidth - width - EDGE_PADDING, y: EDGE_PADDING + HEADER_OFFSET };
    case "bottom-left":
      return { x: EDGE_PADDING, y: window.innerHeight - height - EDGE_PADDING - BOTTOM_OFFSET };
    case "bottom-right":
      return { x: window.innerWidth - width - EDGE_PADDING, y: window.innerHeight - height - EDGE_PADDING - BOTTOM_OFFSET };
  }
};

const findNearestCorner = (x: number, y: number, width: number, height: number): DockCorner => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;
  
  if (centerX < midX) {
    return centerY < midY ? "top-left" : "bottom-left";
  }
  return centerY < midY ? "top-right" : "bottom-right";
};

export function FloatingVideoPortal() {
  const {
    activeVideoId,
    isFloating,
    position,
    isDragging,
    dockedCorner,
    isMinimized,
    poseEnabled,
    setPoseEnabled,
    registeredVideos,
    setFloatingContainer,
    setPosition,
    setIsDragging,
    setDockedCorner,
    setIsMinimized,
  } = useFloatingVideoContext();
  
  const { isCollapsed: isSidebarCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle>(null);
  
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const resizeStartRef = useRef<{ 
    x: number; 
    y: number; 
    width: number; 
    height: number;
    posX: number;
    posY: number;
  } | null>(null);
  const hasInitializedRef = useRef(false);

  // Get the aspect ratio for the active video
  const getAspectRatio = () => {
    if (!activeVideoId) return DEFAULT_ASPECT_RATIO;
    const registration = registeredVideos.get(activeVideoId);
    return registration?.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  };

  // Calculate dimensions that ALWAYS respect the video's aspect ratio
  // Theatre mode scales up proportionally while maintaining the same aspect ratio
  const getDimensions = (): { width: number; height: number } => {
    if (isMinimized) return { width: MINIMIZED_SIZE, height: MINIMIZED_SIZE };
    if (customSize) return customSize;
    
    const aspectRatio = getAspectRatio();
    const isPortrait = aspectRatio < 1;
    
    let width: number;
    let height: number;
    
    if (isPortrait) {
      // Portrait videos: calculate from base height to ensure reasonable sizing
      const baseHeight = theatreMode ? THEATRE_BASE_HEIGHT : STANDARD_BASE_HEIGHT;
      height = Math.min(MAX_HEIGHT, baseHeight);
      width = height * aspectRatio;
      // Ensure minimum width
      if (width < MIN_WIDTH) {
        width = MIN_WIDTH;
        height = width / aspectRatio;
      }
    } else {
      // Landscape/square videos: calculate from base width
      const baseWidth = theatreMode ? THEATRE_BASE_WIDTH : STANDARD_BASE_WIDTH;
      width = Math.min(MAX_WIDTH, baseWidth);
      height = width / aspectRatio;
      // Ensure height doesn't exceed max
      if (height > MAX_HEIGHT) {
        height = MAX_HEIGHT;
        width = height * aspectRatio;
      }
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  };

  const getWidth = () => getDimensions().width;
  const getHeight = () => getDimensions().height;

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
    setTheatreMode(getTheatreMode());
    
    const handleTheatreModeChange = () => {
      setTheatreMode(getTheatreMode());
    };
    window.addEventListener("theatre-mode-change", handleTheatreModeChange);
    return () => window.removeEventListener("theatre-mode-change", handleTheatreModeChange);
  }, []);

  // Set the floating container ref for portal rendering
  useEffect(() => {
    if (videoContainerRef.current && isFloating && !isMinimized) {
      setFloatingContainer(videoContainerRef.current);
    } else {
      setFloatingContainer(null);
    }
    return () => setFloatingContainer(null);
  }, [isFloating, isMinimized, setFloatingContainer, mounted]);

  // Initialize position when floating starts
  useEffect(() => {
    if (isFloating && !hasInitializedRef.current) {
      const pos = getCornerPosition(dockedCorner, getWidth(), getHeight());
      setPosition(pos);
      hasInitializedRef.current = true;
    } else if (!isFloating) {
      hasInitializedRef.current = false;
    }
  }, [isFloating, dockedCorner, setPosition, theatreMode, isMinimized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isFloating && !isDragging) {
        const pos = getCornerPosition(dockedCorner, getWidth(), getHeight());
        setPosition(pos);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFloating, isDragging, dockedCorner, setPosition, theatreMode, isMinimized]);

  // Re-snap when theatre mode changes
  useEffect(() => {
    if (isFloating && !isDragging && !isMinimized) {
      const pos = getCornerPosition(dockedCorner, getWidth(), getHeight());
      setPosition(pos);
    }
  }, [theatreMode]);

  // Show controls on hover, hide after delay
  const handleMouseEnter = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1500);
  };

  // Toggle controls on tap (for mobile)
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle if clicking a button
    if (target.closest("button") || target.closest('[role="button"]')) {
      return;
    }
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    if (showControls) {
      setShowControls(false);
    } else {
      setShowControls(true);
      // Auto-hide after 3 seconds on tap
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [showControls]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="button"]') || target.closest("video")) {
      return;
    }
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
    setIsDragging(true);
    e.preventDefault();
  }, [position, setIsDragging]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStartRef.current || !isDragging) return;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    
    const width = getWidth();
    const height = getHeight();
    
    const newX = Math.max(0, Math.min(window.innerWidth - width, dragStartRef.current.posX + deltaX));
    const newY = Math.max(HEADER_OFFSET, Math.min(window.innerHeight - height - BOTTOM_OFFSET, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, isMinimized, theatreMode, setPosition]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      const width = getWidth();
      const height = getHeight();
      
      const corner = findNearestCorner(position.x, position.y, width, height);
      const snapPos = getCornerPosition(corner, width, height);
      setDockedCorner(corner);
      setPosition(snapPos);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, isMinimized, theatreMode, position, setDockedCorner, setPosition, setIsDragging, customSize]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      width: getWidth(),
      height: getHeight(),
      posX: position.x,
      posY: position.y,
    };
    setActiveResizeHandle(handle);
    setIsResizing(true);
  }, [position, customSize, theatreMode, isMinimized]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current || !isResizing || !activeResizeHandle) return;
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    const deltaX = clientX - resizeStartRef.current.x;
    const deltaY = clientY - resizeStartRef.current.y;
    
    const aspectRatio = getAspectRatio();
    const minHeight = MIN_WIDTH / aspectRatio;
    
    let newWidth = resizeStartRef.current.width;
    let newHeight = resizeStartRef.current.height;
    let newX = resizeStartRef.current.posX;
    let newY = resizeStartRef.current.posY;
    
    // Calculate new size based on which handle is being dragged
    switch (activeResizeHandle) {
      case "se": // Bottom-right
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = newWidth / aspectRatio;
        break;
      case "sw": // Bottom-left
        newWidth = resizeStartRef.current.width - deltaX;
        newHeight = newWidth / aspectRatio;
        newX = resizeStartRef.current.posX + (resizeStartRef.current.width - newWidth);
        break;
      case "ne": // Top-right
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = newWidth / aspectRatio;
        newY = resizeStartRef.current.posY + (resizeStartRef.current.height - newHeight);
        break;
      case "nw": // Top-left
        newWidth = resizeStartRef.current.width - deltaX;
        newHeight = newWidth / aspectRatio;
        newX = resizeStartRef.current.posX + (resizeStartRef.current.width - newWidth);
        newY = resizeStartRef.current.posY + (resizeStartRef.current.height - newHeight);
        break;
    }
    
    // Clamp to min/max sizes while maintaining aspect ratio
    newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    newHeight = Math.max(minHeight, Math.min(MAX_HEIGHT, newHeight));
    // Re-calculate to maintain aspect ratio after clamping
    newHeight = newWidth / aspectRatio;
    
    // Recalculate position if size was clamped
    if (activeResizeHandle === "sw" || activeResizeHandle === "nw") {
      newX = resizeStartRef.current.posX + resizeStartRef.current.width - newWidth;
    }
    if (activeResizeHandle === "ne" || activeResizeHandle === "nw") {
      newY = resizeStartRef.current.posY + resizeStartRef.current.height - newHeight;
    }
    
    // Constrain position to viewport
    newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
    newY = Math.max(HEADER_OFFSET, Math.min(window.innerHeight - newHeight - BOTTOM_OFFSET, newY));
    
    setCustomSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  }, [isResizing, activeResizeHandle, setPosition, activeVideoId, registeredVideos]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setActiveResizeHandle(null);
    resizeStartRef.current = null;
  }, []);

  // Reset custom size when theatre mode changes
  useEffect(() => {
    setCustomSize(null);
  }, [theatreMode]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleMinimizeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    
    // Calculate dimensions immediately (not in setTimeout) to avoid stale closure issues
    let newWidth: number;
    let newHeight: number;
    
    if (newMinimized) {
      newWidth = MINIMIZED_SIZE;
      newHeight = MINIMIZED_SIZE;
    } else if (customSize) {
      newWidth = customSize.width;
      newHeight = customSize.height;
    } else {
      // Calculate expanded dimensions based on aspect ratio
      const aspectRatio = getAspectRatio();
      const isPortrait = aspectRatio < 1;
      
      if (isPortrait) {
        const baseHeight = theatreMode ? THEATRE_BASE_HEIGHT : STANDARD_BASE_HEIGHT;
        newHeight = Math.min(MAX_HEIGHT, baseHeight);
        newWidth = newHeight * aspectRatio;
        if (newWidth < MIN_WIDTH) {
          newWidth = MIN_WIDTH;
          newHeight = newWidth / aspectRatio;
        }
      } else {
        const baseWidth = theatreMode ? THEATRE_BASE_WIDTH : STANDARD_BASE_WIDTH;
        newWidth = Math.min(MAX_WIDTH, baseWidth);
        newHeight = newWidth / aspectRatio;
        if (newHeight > MAX_HEIGHT) {
          newHeight = MAX_HEIGHT;
          newWidth = newHeight * aspectRatio;
        }
      }
      newWidth = Math.round(newWidth);
      newHeight = Math.round(newHeight);
    }
    
    const pos = getCornerPosition(dockedCorner, newWidth, newHeight);
    setPosition(pos);
  }, [isMinimized, theatreMode, dockedCorner, customSize, setIsMinimized, setPosition, activeVideoId, registeredVideos]);

  if (!mounted || !isFloating || !activeVideoId) {
    return null;
  }

  const registration = registeredVideos.get(activeVideoId);
  if (!registration) {
    return null;
  }

  const width = getWidth();
  const height = getHeight();

  // Hide floating video when sidebar is open (only on mobile - desktop can show both)
  const shouldHideForSidebar = !isSidebarCollapsed && isMobile;
  
  const floatingContent = (
    <Box
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width,
        height,
        zIndex: 50,
        borderRadius: isMinimized ? "50%" : "8px",
        overflow: "hidden",
        border: isMinimized ? "2px solid white" : "1px solid #7ADB8F",
        boxShadow: `
          0 0 10px rgba(122, 219, 143, 0.3),
          0 0 20px rgba(122, 219, 143, 0.2),
          0 8px 32px rgba(0, 0, 0, 0.4)
        `,
        backgroundColor: "#000",
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isDragging ? "scale(1.02)" : "scale(1)",
        userSelect: "none",
        // Hide when sidebar is open (only on mobile)
        opacity: shouldHideForSidebar ? 0 : 1,
        pointerEvents: shouldHideForSidebar ? "none" : "auto",
        visibility: shouldHideForSidebar ? "hidden" : "visible",
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      {/* Video content */}
      {!isMinimized && (
        <>
          {/* Dedicated drag zone at top - always active */}
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 32,
              zIndex: 20,
              cursor: isDragging ? "grabbing" : "grab",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 8px",
            }}
          >
            {/* Drag handle indicator - centered */}
            <Box
              style={{
                width: isDragging ? 96 : 48,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDragging ? "#7ADB8F" : "rgba(122, 219, 143, 0.7)",
                transition: "background-color 0.2s ease, width 0.2s ease",
              }}
            />
          </Box>

          {/* Container for the portaled VideoPoseViewer - fills entire space, drag zone overlays it */}
          <Box
            ref={videoContainerRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000",
              overflow: "hidden",
              zIndex: 1,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          
          {/* Mid-left control buttons - appear on hover/tap */}
          {/* Positioned at vertical center to avoid corners where native device controls appear */}
          <Box
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              zIndex: 100, // Ensure above video
              opacity: showControls || isDragging ? 1 : 0.4,
              transition: "opacity 0.2s ease",
            }}
          >
            {/* Minimize button */}
            <Tooltip content="Minimize" side="right">
              <IconButton
                size="1"
                variant="solid"
                style={{ 
                  backgroundColor: "#7ADB8F",
                  color: "#1C1C1C",
                  border: "2px solid white",
                  borderRadius: "var(--radius-3)",
                  width: 28,
                  height: 28,
                }}
                onClick={handleMinimizeToggle}
              >
                <ExitFullScreenIcon width={14} height={14} />
              </IconButton>
            </Tooltip>
            
            {/* Movement Analysis toggle */}
            <Tooltip content={poseEnabled ? "Disable Movement Analysis" : "Analyse Movement"} side="right">
              <IconButton
                size="1"
                variant="solid"
                style={{ 
                  backgroundColor: poseEnabled ? "#7ADB8F" : "rgba(60, 60, 60, 0.9)",
                  color: poseEnabled ? "#1C1C1C" : "#7ADB8F",
                  border: poseEnabled ? "2px solid white" : "2px solid #7ADB8F",
                  borderRadius: "var(--radius-3)",
                  width: 28,
                  height: 28,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPoseEnabled(!poseEnabled);
                }}
              >
                <MagicWandIcon width={14} height={14} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Resize handles at corners - triangular */}
          {(["nw", "ne", "sw", "se"] as const).map((handle) => {
            // SVG path for triangle pointing towards corner (14x14)
            const trianglePaths: Record<string, string> = {
              nw: "M 0 0 L 14 0 L 0 14 Z",
              ne: "M 0 0 L 14 0 L 14 14 Z",
              sw: "M 0 0 L 0 14 L 14 14 Z",
              se: "M 14 0 L 14 14 L 0 14 Z",
            };
            
            return (
              <Box
                key={handle}
                onMouseDown={(e) => handleResizeStart(e, handle)}
                style={{
                  position: "absolute",
                  width: 14,
                  height: 14,
                  ...(handle.includes("n") ? { top: 0 } : { bottom: 0 }),
                  ...(handle.includes("w") ? { left: 0 } : { right: 0 }),
                  cursor: handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize",
                  zIndex: 30,
                  opacity: showControls || isResizing ? 1 : 0,
                  transition: "opacity 0.2s ease",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  <path
                    d={trianglePaths[handle]}
                    fill="rgba(122, 219, 143, 0.8)"
                  />
                </svg>
              </Box>
            );
          })}
        </>
      )}

      {/* Minimized state - circular button */}
      {isMinimized && (
        <Tooltip content="Expand floating video">
          <Box
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#7ADB8F",
              cursor: "pointer",
            }}
            onClick={handleMinimizeToggle}
          >
            <EnterFullScreenIcon style={{ color: "#1a1a1a", width: 20, height: 20 }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );

  return createPortal(floatingContent, document.body);
}
