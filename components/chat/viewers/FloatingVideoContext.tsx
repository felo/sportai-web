"use client";

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, type ReactNode } from "react";
import { videoLogger } from "@/lib/logger";
import type { DockCorner, Position } from "@/hooks/useFloatingVideo";
import { useIsMobile } from "@/hooks/useIsMobile";

interface VideoRegistration {
  id: string;
  ref: React.RefObject<HTMLElement>;
  videoUrl: string;
  renderContent: () => ReactNode;
  aspectRatio?: number; // width / height (e.g., 16/9 for landscape, 9/16 for portrait)
  seekTo?: (seconds: number, shouldPlay?: boolean) => void; // Callback to seek video to a specific time
}

interface FloatingVideoContextValue {
  // State
  activeVideoId: string | null;
  isFloating: boolean;
  position: Position;
  isDragging: boolean;
  dockedCorner: DockCorner;
  isMinimized: boolean;
  
  // Pose overlay state - persisted across docked/floating transitions
  poseEnabled: boolean;
  setPoseEnabled: (enabled: boolean) => void;
  
  // Registered videos
  registeredVideos: Map<string, VideoRegistration>;
  
  // Floating container ref - for portal rendering
  floatingContainerRef: React.RefObject<HTMLDivElement>;
  setFloatingContainer: (element: HTMLDivElement | null) => void;
  
  // Scroll container ref - for IntersectionObserver root
  scrollContainerRef?: React.RefObject<HTMLElement>;
  
  // Actions
  registerVideo: (id: string, ref: React.RefObject<HTMLElement>, videoUrl: string, renderContent: () => ReactNode, aspectRatio?: number, seekTo?: (seconds: number) => void) => void;
  updateVideoAspectRatio: (id: string, aspectRatio: number) => void;
  updateVideoSeekTo: (id: string, seekTo: (seconds: number) => void) => void;
  unregisterVideo: (id: string) => void;
  setActiveVideo: (id: string | null) => void;
  setFloating: (floating: boolean) => void;
  setPosition: (position: Position) => void;
  setIsDragging: (dragging: boolean) => void;
  setDockedCorner: (corner: DockCorner) => void;
  setIsMinimized: (minimized: boolean) => void;
  scrollToVideo: () => void;
  closeFloating: () => void;
  showFloatingVideoAtTime: (seconds: number, autoPlay?: boolean) => void;
  // Ref to check if position was manually set (to prevent auto-positioning)
  positionManuallySetRef: React.MutableRefObject<boolean>;
  // Refs for controlling video playback when opening
  autoPlayOnOpenRef: React.MutableRefObject<boolean>;
  seekOnOpenRef: React.MutableRefObject<number>;
}

const FloatingVideoContext = createContext<FloatingVideoContextValue | null>(null);

// Cooldown period after chat changes to prevent auto-floating
const CHAT_CHANGE_COOLDOWN_MS = 500;

interface FloatingVideoProviderProps {
  children: ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function FloatingVideoProvider({ children, scrollContainerRef }: FloatingVideoProviderProps) {
  const isMobile = useIsMobile();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dockedCorner, setDockedCorner] = useState<DockCorner>("top-right");
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Pose overlay state - persisted across docked/floating transitions
  const [poseEnabled, setPoseEnabled] = useState(false);
  
  const registeredVideosRef = useRef<Map<string, VideoRegistration>>(new Map());
  // Track if position was manually set (to prevent auto-positioning from overriding)
  const positionManuallySetRef = useRef(false);
  // Track autoPlay and seek time when opening floating video
  const autoPlayOnOpenRef = useRef(true);
  const seekOnOpenRef = useRef(0);
  // Track version to trigger re-renders only when needed
  const [registrationVersion, setRegistrationVersion] = useState(0);
  
  // Track when chat changed to prevent auto-floating immediately after
  const chatChangeCooldownRef = useRef<number>(0);
  
  // Reset floating state when chat changes to prevent stale floating videos
  useEffect(() => {
    const handleChatChange = () => {
      // Set cooldown to prevent auto-floating on new chat
      chatChangeCooldownRef.current = Date.now();
      
      // Reset all floating-related state when switching chats
      setActiveVideoId(null);
      setIsFloating(false);
      setIsMinimized(false);
      setPoseEnabled(false);
      // Clear registered videos - new chat will re-register them
      registeredVideosRef.current.clear();
      setRegistrationVersion(v => v + 1);
    };
    
    window.addEventListener("chat-storage-change", handleChatChange);
    return () => window.removeEventListener("chat-storage-change", handleChatChange);
  }, []);
  
  // Ref to the floating container element for portal rendering
  const floatingContainerRef = useRef<HTMLDivElement>(null);
  const [floatingContainerElement, setFloatingContainerElement] = useState<HTMLDivElement | null>(null);
  
  const setFloatingContainer = useCallback((element: HTMLDivElement | null) => {
    setFloatingContainerElement(element);
  }, []);

  const registerVideo = useCallback((
    id: string,
    ref: React.RefObject<HTMLElement>,
    videoUrl: string,
    renderContent: () => ReactNode,
    aspectRatio?: number,
    seekTo?: (seconds: number) => void
  ) => {
    // Only update if this is actually a new registration
    const existing = registeredVideosRef.current.get(id);
    if (!existing || existing.videoUrl !== videoUrl) {
      registeredVideosRef.current.set(id, { id, ref, videoUrl, renderContent, aspectRatio, seekTo });
      setRegistrationVersion(v => v + 1);
    }
  }, []);

  const updateVideoAspectRatio = useCallback((id: string, aspectRatio: number) => {
    const existing = registeredVideosRef.current.get(id);
    if (existing && existing.aspectRatio !== aspectRatio) {
      registeredVideosRef.current.set(id, { ...existing, aspectRatio });
      setRegistrationVersion(v => v + 1);
    }
  }, []);

  const updateVideoSeekTo = useCallback((id: string, seekTo: (seconds: number) => void) => {
    const existing = registeredVideosRef.current.get(id);
    if (existing) {
      registeredVideosRef.current.set(id, { ...existing, seekTo });
    }
  }, []);

  const unregisterVideo = useCallback((id: string) => {
    const existed = registeredVideosRef.current.has(id);
    registeredVideosRef.current.delete(id);
    
    // Only update state if this was the active video
    if (activeVideoId === id) {
      setActiveVideoId(null);
      setIsFloating(false);
    }
    // Don't force re-render on unregister - it happens during cleanup
    // and can cause infinite loops
  }, [activeVideoId]);

  const setActiveVideo = useCallback((id: string | null) => {
    setActiveVideoId(id);
    if (!id) {
      setIsFloating(false);
    }
  }, []);

  const setFloating = useCallback((floating: boolean) => {
    // When trying to start floating, check if we're in cooldown period
    // This prevents auto-floating immediately after switching chats
    if (floating) {
      const timeSinceChange = Date.now() - chatChangeCooldownRef.current;
      if (timeSinceChange < CHAT_CHANGE_COOLDOWN_MS) {
        videoLogger.debug("[FloatingVideoContext] Ignoring float request during cooldown", {
          timeSinceChange,
          cooldown: CHAT_CHANGE_COOLDOWN_MS,
        });
        return;
      }
    }
    
    setIsFloating(floating);
    // Always start minimized when docking the video
    if (floating) {
      setIsMinimized(true);
    }
  }, []);

  const scrollToVideo = useCallback(() => {
    if (activeVideoId) {
      const registration = registeredVideosRef.current.get(activeVideoId);
      if (registration?.ref.current) {
        registration.ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeVideoId]);

  const closeFloating = useCallback(() => {
    scrollToVideo();
    setTimeout(() => {
      setIsFloating(false);
    }, 100);
  }, [scrollToVideo]);

  // Show floating video at a specific timestamp
  // autoPlay: true = start playing immediately (video button click), false = pause at timestamp (timestamp click)
  const showFloatingVideoAtTime = useCallback((seconds: number, autoPlay: boolean = true) => {
    const ensureDomVideoRegistered = () => {
      if (typeof document === "undefined") return false;
      const allVideos = document.querySelectorAll("video");
      const videoEl = allVideos.length > 0 ? allVideos[allVideos.length - 1] : null;
      if (!videoEl) {
        videoLogger.warn("[FloatingVideoContext] No DOM video found to auto-register");
        return false;
      }
      const container = (videoEl.closest('[data-video-container=\"true\"]') as HTMLElement | null) || (videoEl as unknown as HTMLElement | null);
      const autoId = `dom-video-${Date.now()}`;
      const src = (videoEl as HTMLVideoElement).currentSrc || (videoEl as HTMLVideoElement).src || "dom-video";
      registeredVideosRef.current.set(autoId, {
        id: autoId,
        ref: { current: container } as React.RefObject<HTMLElement>,
        videoUrl: src,
        // renderContent returns null - FloatingVideoPortal will use videoUrl fallback
        renderContent: () => null,
        aspectRatio: undefined,
        seekTo: (s: number, shouldPlay: boolean = false) => {
          (videoEl as HTMLVideoElement).currentTime = s;
          if (shouldPlay) {
            (videoEl as HTMLVideoElement).play().catch(() => {});
          } else {
            (videoEl as HTMLVideoElement).pause();
          }
        },
      });
      setRegistrationVersion(v => v + 1);
      videoLogger.debug("[FloatingVideoContext] Auto-registered DOM video", {
        autoId,
        src,
        hasContainer: !!container,
      });
      return true;
    };

    let videos = Array.from(registeredVideosRef.current.values());
    videoLogger.debug("[FloatingVideoContext] showFloatingVideoAtTime called", {
      seconds,
      autoPlay,
      registeredVideoCount: videos.length,
      videoIds: videos.map(v => v.id),
      isFloating,
      isMinimized,
      activeVideoId,
    });
    
    if (videos.length === 0) {
      const ok = ensureDomVideoRegistered();
      if (!ok) {
        videoLogger.warn("[FloatingVideoContext] No registered videos to show");
        return;
      }
      videos = Array.from(registeredVideosRef.current.values());
    }
    
    const video = videos[0]; // Use first registered video
    
    // If video is already floating and expanded, just seek to the timestamp
    if (isFloating && !isMinimized && activeVideoId) {
      videoLogger.debug("[FloatingVideoContext] Video already open, seeking to timestamp", { seconds, autoPlay });
      // Find the video element in the DOM and seek directly
      const floatingVideo = document.querySelector('.floating-video-content video') as HTMLVideoElement | null;
      if (floatingVideo) {
        floatingVideo.currentTime = seconds;
        if (!autoPlay) {
          floatingVideo.pause();
        }
      } else {
        // Fallback to registration's seekTo
        const activeVideo = registeredVideosRef.current.get(activeVideoId);
        activeVideo?.seekTo?.(seconds, autoPlay);
      }
      return;
    }
    
    // Calculate a safe position for the expanded video (top-right, within viewport)
    const EDGE_PADDING = 16;
    const HEADER_OFFSET = 80;
    const BASE_WIDTH = 320;
    const aspectRatio = video.aspectRatio ?? 16/9;
    const width = BASE_WIDTH;
    const height = width / aspectRatio;
    
    // Position in top-right corner, ensuring it stays within viewport
    const safeX = Math.max(EDGE_PADDING, window.innerWidth - width - EDGE_PADDING);
    const safeY = EDGE_PADDING + HEADER_OFFSET;
    
    // Mark that position was manually set, to prevent auto-positioning from overriding
    positionManuallySetRef.current = true;
    
    // Store autoPlay preference for the portal to use
    autoPlayOnOpenRef.current = autoPlay;
    seekOnOpenRef.current = seconds;
    
    // Set position BEFORE setting floating state to avoid race conditions
    setPosition({ x: safeX, y: safeY });
    setActiveVideoId(video.id);
    setIsFloating(true);
    setIsMinimized(false);
  }, [isFloating, isMinimized, activeVideoId]);

  // Create a stable ref object that points to the current floating container
  const stableFloatingContainerRef = useRef<HTMLDivElement>(null);
  // Keep the stable ref updated
  if (floatingContainerElement) {
    (stableFloatingContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = floatingContainerElement;
  }

  const value = useMemo<FloatingVideoContextValue>(() => ({
    activeVideoId,
    isFloating,
    position,
    isDragging,
    dockedCorner,
    isMinimized,
    poseEnabled,
    setPoseEnabled,
    registeredVideos: registeredVideosRef.current,
    floatingContainerRef: stableFloatingContainerRef,
    setFloatingContainer,
    scrollContainerRef,
    registerVideo,
    updateVideoAspectRatio,
    updateVideoSeekTo,
    unregisterVideo,
    setActiveVideo,
    setFloating,
    setPosition,
    setIsDragging,
    setDockedCorner,
    setIsMinimized,
    scrollToVideo,
    closeFloating,
    showFloatingVideoAtTime,
    positionManuallySetRef,
    autoPlayOnOpenRef,
    seekOnOpenRef,
  }), [
    activeVideoId,
    isFloating,
    position,
    isDragging,
    dockedCorner,
    isMinimized,
    poseEnabled,
    floatingContainerElement,
    setFloatingContainer,
    scrollContainerRef,
    registerVideo,
    updateVideoAspectRatio,
    updateVideoSeekTo,
    unregisterVideo,
    setActiveVideo,
    setFloating,
    scrollToVideo,
    closeFloating,
    showFloatingVideoAtTime,
    registrationVersion, // Trigger re-render when registrations (including aspectRatio) change
  ]);

  // Expose context on window for debugging/manual registration in DevTools
  useEffect(() => {
    (window as any).__floatingCtx = value;
    return () => {
      delete (window as any).__floatingCtx;
    };
  }, [value]);

  return (
    <FloatingVideoContext.Provider value={value}>
      {children}
    </FloatingVideoContext.Provider>
  );
}

export function useFloatingVideoContext() {
  const context = useContext(FloatingVideoContext);
  if (!context) {
    throw new Error("useFloatingVideoContext must be used within a FloatingVideoProvider");
  }
  return context;
}

// Optional hook that returns null if not in provider (for components that may be used outside)
export function useFloatingVideoContextOptional() {
  return useContext(FloatingVideoContext);
}

