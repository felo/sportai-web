"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, EnterFullScreenIcon, ExitFullScreenIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import { useFloatingVideoContext } from "./FloatingVideoContext";
import { getTheatreMode } from "@/utils/storage";
import type { DockCorner, Position } from "@/hooks/useFloatingVideo";

// Standard size (16:9 aspect ratio)
const STANDARD_WIDTH = 320;
const STANDARD_HEIGHT = 180;

// Theatre mode size (~2x diagonal = ~1.4x each dimension)
const THEATRE_WIDTH = 448;
const THEATRE_HEIGHT = 252;

// Size constraints
const MIN_WIDTH = 240;
const MIN_HEIGHT = 135;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 450;
const ASPECT_RATIO = 16 / 9;

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
    registeredVideos,
    setFloatingContainer,
    setPosition,
    setIsDragging,
    setDockedCorner,
    setIsMinimized,
    closeFloating,
  } = useFloatingVideoContext();
  
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

  // Get current dimensions based on state
  const getWidth = () => {
    if (isMinimized) return MINIMIZED_SIZE;
    if (customSize) return customSize.width;
    return theatreMode ? THEATRE_WIDTH : STANDARD_WIDTH;
  };
  const getHeight = () => {
    if (isMinimized) return MINIMIZED_SIZE;
    if (customSize) return customSize.height;
    return theatreMode ? THEATRE_HEIGHT : STANDARD_HEIGHT;
  };

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
    
    let newWidth = resizeStartRef.current.width;
    let newHeight = resizeStartRef.current.height;
    let newX = resizeStartRef.current.posX;
    let newY = resizeStartRef.current.posY;
    
    // Calculate new size based on which handle is being dragged
    switch (activeResizeHandle) {
      case "se": // Bottom-right
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = newWidth / ASPECT_RATIO;
        break;
      case "sw": // Bottom-left
        newWidth = resizeStartRef.current.width - deltaX;
        newHeight = newWidth / ASPECT_RATIO;
        newX = resizeStartRef.current.posX + (resizeStartRef.current.width - newWidth);
        break;
      case "ne": // Top-right
        newWidth = resizeStartRef.current.width + deltaX;
        newHeight = newWidth / ASPECT_RATIO;
        newY = resizeStartRef.current.posY + (resizeStartRef.current.height - newHeight);
        break;
      case "nw": // Top-left
        newWidth = resizeStartRef.current.width - deltaX;
        newHeight = newWidth / ASPECT_RATIO;
        newX = resizeStartRef.current.posX + (resizeStartRef.current.width - newWidth);
        newY = resizeStartRef.current.posY + (resizeStartRef.current.height - newHeight);
        break;
    }
    
    // Clamp to min/max sizes
    newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
    
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
  }, [isResizing, activeResizeHandle, setPosition]);

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
    
    setTimeout(() => {
      // Use custom size if available, otherwise default
      const newWidth = newMinimized ? MINIMIZED_SIZE : (customSize?.width ?? (theatreMode ? THEATRE_WIDTH : STANDARD_WIDTH));
      const newHeight = newMinimized ? MINIMIZED_SIZE : (customSize?.height ?? (theatreMode ? THEATRE_HEIGHT : STANDARD_HEIGHT));
      const pos = getCornerPosition(dockedCorner, newWidth, newHeight);
      setPosition(pos);
    }, 0);
  }, [isMinimized, theatreMode, dockedCorner, customSize, setIsMinimized, setPosition]);

  if (!mounted || !isFloating || !activeVideoId) {
    return null;
  }

  const registration = registeredVideos.get(activeVideoId);
  if (!registration) {
    return null;
  }

  const width = getWidth();
  const height = getHeight();

  const floatingContent = (
    <Box
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width,
        height,
        zIndex: 9999,
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
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
              justifyContent: "space-between",
              padding: "0 8px",
            }}
          >
            {/* Left spacer for balance */}
            <Box style={{ width: 80 }} />
            
            {/* Drag handle indicator - always visible, centered */}
            <Box
              style={{
                width: isDragging ? 96 : 48,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDragging ? "#7ADB8F" : "rgba(122, 219, 143, 0.7)",
                transition: "background-color 0.2s ease, width 0.2s ease",
              }}
            />
            
            {/* Control buttons - in the drag zone */}
            <Box
              style={{
                display: "flex",
                gap: 4,
                opacity: showControls || isDragging ? 1 : 0,
                transition: "opacity 0.2s ease",
                pointerEvents: showControls ? "auto" : "none",
              }}
            >
              <Tooltip content="Return to inline video">
                <IconButton
                  size="1"
                  variant="solid"
                  style={{ 
                    backgroundColor: "rgba(122, 219, 143, 0.9)",
                    color: "#1a1a1a",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFloating();
                  }}
                >
                  <ArrowLeftIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Minimize">
                <IconButton
                  size="1"
                  variant="solid"
                  style={{ 
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={handleMinimizeToggle}
                >
                  <ExitFullScreenIcon />
                </IconButton>
              </Tooltip>
              <Tooltip content="Close">
                <IconButton
                  size="1"
                  variant="solid"
                  style={{ 
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFloating();
                  }}
                >
                  <Cross2Icon />
                </IconButton>
              </Tooltip>
            </Box>
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
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />

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
