"use client";

import { useEffect, useState, useRef } from "react";

interface ScrollSpacerProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Dynamic spacer that allows the last message to scroll to top,
 * but prevents scrolling past the content (like ChatGPT).
 * 
 * Height = viewport height - offset for header/input
 * This ensures exactly enough space to scroll content to top, no more.
 */
export function ScrollSpacer({ scrollContainerRef }: ScrollSpacerProps) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);

  useEffect(() => {
    const calculateHeight = () => {
      const scrollContainer = scrollContainerRef?.current;
      const spacer = spacerRef.current;
      
      if (!scrollContainer || !spacer) return;

      // Get viewport height of the scroll container
      const containerHeight = scrollContainer.clientHeight;
      
      // Get the spacer's position relative to the scroll container's scroll height
      // We want enough space so the content BEFORE the spacer can scroll to top
      const spacerTop = spacer.offsetTop;
      const scrollHeight = scrollContainer.scrollHeight - spacer.offsetHeight;
      
      // Calculate: how much space do we need so that when scrolled to bottom,
      // the last message (just before spacer) is at the top of the viewport?
      // Space needed = containerHeight - (space for input area ~140px) - (some padding ~60px)
      const inputAreaHeight = 140;
      const topPadding = 80;
      const neededHeight = containerHeight - inputAreaHeight - topPadding;
      
      // Only set positive heights
      setSpacerHeight(Math.max(0, neededHeight));
    };

    // Calculate on mount and resize
    calculateHeight();
    
    window.addEventListener("resize", calculateHeight);
    
    // Also recalculate when scroll container content changes
    const observer = new ResizeObserver(calculateHeight);
    if (scrollContainerRef?.current) {
      observer.observe(scrollContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", calculateHeight);
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  return (
    <div 
      ref={spacerRef}
      style={{ 
        height: spacerHeight,
        minHeight: spacerHeight,
        flexShrink: 0,
      }} 
      aria-hidden="true" 
    />
  );
}


