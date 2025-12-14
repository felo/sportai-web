"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Box } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";

interface ScrollableBoxProps {
  children: React.ReactNode;
  maxHeight?: number;
  flex?: number;
  color: string;
}

/**
 * Scrollable box with "more content" indicator
 */
export function ScrollableBox({ children, maxHeight, flex, color }: ScrollableBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setCanScrollDown(
      scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 5
    );
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    // Also check on resize
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <Box style={{ position: "relative", flex, minHeight: flex ? 0 : undefined }}>
      <Box
        ref={scrollRef}
        style={{
          maxHeight: maxHeight,
          height: flex ? "100%" : undefined,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        {children}
      </Box>
      {/* Scroll indicator */}
      {canScrollDown && (
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            background: "linear-gradient(to bottom, transparent 0%, var(--gray-1) 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 2,
            pointerEvents: "none",
          }}
        >
          <ChevronDownIcon
            width={14}
            height={14}
            style={{
              color: color,
              animation: "bounce 1.5s infinite",
            }}
          />
        </Box>
      )}
    </Box>
  );
}





