"use client";

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import type { DockCorner, Position } from "@/hooks/useFloatingVideo";

interface VideoRegistration {
  id: string;
  ref: React.RefObject<HTMLElement>;
  videoUrl: string;
  renderContent: () => ReactNode;
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
  
  // Actions
  registerVideo: (id: string, ref: React.RefObject<HTMLElement>, videoUrl: string, renderContent: () => ReactNode) => void;
  unregisterVideo: (id: string) => void;
  setActiveVideo: (id: string | null) => void;
  setFloating: (floating: boolean) => void;
  setPosition: (position: Position) => void;
  setIsDragging: (dragging: boolean) => void;
  setDockedCorner: (corner: DockCorner) => void;
  setIsMinimized: (minimized: boolean) => void;
  scrollToVideo: () => void;
  closeFloating: () => void;
}

const FloatingVideoContext = createContext<FloatingVideoContextValue | null>(null);

interface FloatingVideoProviderProps {
  children: ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function FloatingVideoProvider({ children, scrollContainerRef }: FloatingVideoProviderProps) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dockedCorner, setDockedCorner] = useState<DockCorner>("top-right");
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Pose overlay state - persisted across docked/floating transitions
  const [poseEnabled, setPoseEnabled] = useState(false);
  
  const registeredVideosRef = useRef<Map<string, VideoRegistration>>(new Map());
  // Track version to trigger re-renders only when needed
  const [registrationVersion, setRegistrationVersion] = useState(0);
  
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
    renderContent: () => ReactNode
  ) => {
    // Only update if this is actually a new registration
    const existing = registeredVideosRef.current.get(id);
    if (!existing || existing.videoUrl !== videoUrl) {
      registeredVideosRef.current.set(id, { id, ref, videoUrl, renderContent });
      setRegistrationVersion(v => v + 1);
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
    setIsFloating(floating);
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
    registerVideo,
    unregisterVideo,
    setActiveVideo,
    setFloating,
    setPosition,
    setIsDragging,
    setDockedCorner,
    setIsMinimized,
    scrollToVideo,
    closeFloating,
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
    registerVideo,
    unregisterVideo,
    setActiveVideo,
    setFloating,
    scrollToVideo,
    closeFloating,
  ]);

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

