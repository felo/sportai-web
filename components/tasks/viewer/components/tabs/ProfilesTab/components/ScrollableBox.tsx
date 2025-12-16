"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Box, Tooltip } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Colors } from "@/lib/config";

interface ScrollableBoxProps {
  children: React.ReactNode;
  maxHeight?: number;
  flex?: number;
  color: string;
}

/**
 * Scrollable box with tappable "scroll down" button
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

  const handleScrollDown = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ top: 60, behavior: "smooth" });
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
      {/* Scroll down button */}
      {canScrollDown && (
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            background: "linear-gradient(to bottom, transparent 0%, var(--gray-1) 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 4,
          }}
        >
          <Tooltip content="Scroll down">
            <Box
              onClick={handleScrollDown}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: Colors.darkMint,
                border: `2px solid ${Colors.white}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = Colors.lightMint;
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 0 12px rgba(122, 219, 143, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = Colors.darkMint;
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)";
              }}
            >
              <ChevronDownIcon
                width={10}
                height={10}
                style={{ color: Colors.darkGreen }}
              />
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}







