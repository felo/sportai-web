"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface Position {
  x: number;
  y: number;
}

interface UseFloatingVideoOptions {
  videoRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  defaultCorner?: DockCorner;
  miniWidth?: number;
  miniHeight?: number;
  edgePadding?: number;
  headerOffset?: number;
  bottomOffset?: number;
}

const getCornerPosition = (
  corner: DockCorner,
  padding: number,
  width: number,
  height: number,
  headerOffset: number,
  bottomOffset: number
): Position => {
  switch (corner) {
    case "top-left":
      return { x: padding, y: padding + headerOffset };
    case "top-right":
      return { x: window.innerWidth - width - padding, y: padding + headerOffset };
    case "bottom-left":
      return { x: padding, y: window.innerHeight - height - padding - bottomOffset };
    case "bottom-right":
      return { x: window.innerWidth - width - padding, y: window.innerHeight - height - padding - bottomOffset };
  }
};

export function useFloatingVideo({
  videoRef,
  enabled = true,
  defaultCorner = "bottom-right",
  miniWidth = 320,
  miniHeight = 180,
  edgePadding = 16,
  headerOffset = 80,
  bottomOffset = 100,
}: UseFloatingVideoOptions) {
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dockedCorner, setDockedCorner] = useState<DockCorner>(defaultCorner);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const hasInitializedPositionRef = useRef(false);

  // Detect when video leaves viewport using IntersectionObserver
  useEffect(() => {
    if (!enabled) {
      setIsFloating(false);
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Float when less than 30% visible
        const shouldFloat = !entry.isIntersecting || entry.intersectionRatio < 0.3;
        setIsFloating(shouldFloat);
      },
      { threshold: [0, 0.3, 0.5, 1] }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoRef, enabled]);

  // Initialize position when floating starts
  useEffect(() => {
    if (isFloating && !hasInitializedPositionRef.current) {
      const pos = getCornerPosition(dockedCorner, edgePadding, miniWidth, miniHeight, headerOffset, bottomOffset);
      setPosition(pos);
      hasInitializedPositionRef.current = true;
    } else if (!isFloating) {
      hasInitializedPositionRef.current = false;
    }
  }, [isFloating, dockedCorner, miniWidth, miniHeight, edgePadding, headerOffset, bottomOffset]);

  // Find nearest corner for snapping
  const findNearestCorner = useCallback((x: number, y: number): DockCorner => {
    const centerX = x + miniWidth / 2;
    const centerY = y + miniHeight / 2;
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    
    if (centerX < midX) {
      return centerY < midY ? "top-left" : "bottom-left";
    }
    return centerY < midY ? "top-right" : "bottom-right";
  }, [miniWidth, miniHeight]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't start drag if clicking on a button
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
    setIsDragging(true);
    e.preventDefault();
  }, [position]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStartRef.current || !isDragging) return;
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    
    // Constrain to viewport
    const newX = Math.max(0, Math.min(window.innerWidth - miniWidth, dragStartRef.current.posX + deltaX));
    const newY = Math.max(headerOffset, Math.min(window.innerHeight - miniHeight - bottomOffset, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, miniWidth, miniHeight, headerOffset, bottomOffset]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      // Snap to nearest corner with animation
      const corner = findNearestCorner(position.x, position.y);
      const snapPos = getCornerPosition(corner, edgePadding, miniWidth, miniHeight, headerOffset, bottomOffset);
      setDockedCorner(corner);
      setPosition(snapPos);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, position, findNearestCorner, edgePadding, miniWidth, miniHeight, headerOffset, bottomOffset]);

  // Global mouse/touch listeners for dragging
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

  // Handle window resize - re-snap to corner
  useEffect(() => {
    const handleResize = () => {
      if (isFloating && !isDragging) {
        const pos = getCornerPosition(dockedCorner, edgePadding, miniWidth, miniHeight, headerOffset, bottomOffset);
        setPosition(pos);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFloating, isDragging, dockedCorner, edgePadding, miniWidth, miniHeight, headerOffset, bottomOffset]);

  const scrollToVideo = useCallback(() => {
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [videoRef]);

  const closeFloating = useCallback(() => {
    scrollToVideo();
    // Small delay to let scroll complete before hiding
    setTimeout(() => setIsFloating(false), 100);
  }, [scrollToVideo]);

  return {
    isFloating,
    position,
    isDragging,
    dockedCorner,
    isMinimized,
    setIsMinimized,
    handleDragStart,
    scrollToVideo,
    closeFloating,
    setIsFloating,
    miniWidth,
    miniHeight,
  };
}

