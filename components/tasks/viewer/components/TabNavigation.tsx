"use client";

import { ReactNode, useRef, useCallback, useState, useEffect } from "react";
import { Box, Flex, Text, Badge, Tooltip } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Colors } from "@/lib/config";

export interface TabDefinition {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Update scroll state on mount, resize, and scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, tabs]);

  // Scroll by a fixed amount
  const scroll = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // Auto-scroll to bring clicked tab into view
  const handleTabClick = useCallback((tabId: string, isDisabled: boolean) => {
    if (isDisabled) return;
    
    const tabElement = tabRefs.current.get(tabId);
    const scrollContainer = scrollContainerRef.current;
    
    if (tabElement && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const tabRect = tabElement.getBoundingClientRect();
      
      // Check if tab is partially or fully outside the visible area
      const isOutsideLeft = tabRect.left < containerRect.left;
      const isOutsideRight = tabRect.right > containerRect.right;
      
      if (isOutsideLeft || isOutsideRight) {
        // Scroll to center the tab
        const scrollLeft = tabElement.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2);
        scrollContainer.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      }
    }
    
    onTabChange(tabId);
  }, [onTabChange]);

  return (
    <Box
      style={{
        borderBottom: "1px solid var(--gray-6)",
        backgroundColor: "var(--gray-2)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Box style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 var(--space-4)", position: "relative" }}>
        {/* Left scroll button (desktop) */}
        {!isMobile && canScrollLeft && (
          <Box
            style={{
              position: "absolute",
              left: "var(--space-4)",
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              zIndex: 20,
              background: "linear-gradient(to right, var(--gray-2) 60%, transparent)",
              paddingRight: "12px",
            }}
          >
            <Tooltip content="Scroll left">
              <button
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "9999px",
                  backgroundColor: Colors.darkMint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease-out",
                  border: `2px solid ${Colors.white}`,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.lightMint;
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(122, 219, 143, 0.5), 0 2px 8px rgba(122, 219, 143, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.darkMint;
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)";
                }}
              >
                <ChevronLeftIcon width={16} height={16} color={Colors.darkGreen} />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Right scroll button (desktop) */}
        {!isMobile && canScrollRight && (
          <Box
            style={{
              position: "absolute",
              right: "var(--space-4)",
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              zIndex: 20,
              background: "linear-gradient(to left, var(--gray-2) 60%, transparent)",
              paddingLeft: "12px",
            }}
          >
            <Tooltip content="Scroll right">
              <button
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "9999px",
                  backgroundColor: Colors.darkMint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease-out",
                  border: `2px solid ${Colors.white}`,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.lightMint;
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(122, 219, 143, 0.5), 0 2px 8px rgba(122, 219, 143, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.darkMint;
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.2)";
                }}
              >
                <ChevronRightIcon width={16} height={16} color={Colors.darkGreen} />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Fade masks on mobile to indicate scrollability */}
        {isMobile && (
          <>
            <Box
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "24px",
                background: "linear-gradient(to right, var(--gray-2), transparent)",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
            <Box
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "24px",
                background: "linear-gradient(to left, var(--gray-2), transparent)",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
          </>
        )}
        <Flex
          ref={scrollContainerRef}
          gap="0"
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingLeft: !isMobile && canScrollLeft ? "32px" : undefined,
            paddingRight: !isMobile && canScrollRight ? "32px" : undefined,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <Box
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                }}
                onClick={() => handleTabClick(tab.id, !!isDisabled)}
                style={{
                  padding: isMobile ? "12px 16px" : "14px 24px",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  borderBottom: isActive ? "2px solid var(--mint-9)" : "2px solid transparent",
                  backgroundColor: isActive ? "var(--gray-1)" : "transparent",
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Flex align="center" gap="2">
                  <Box
                    style={{
                      color: isActive ? "var(--mint-11)" : "var(--gray-10)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {tab.icon}
                  </Box>
                  <Text
                    size="2"
                    weight={isActive ? "medium" : "regular"}
                    style={{
                      color: isActive ? "var(--gray-12)" : "var(--gray-11)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge !== undefined && (
                    <Badge size="1" color={isActive ? "mint" : "gray"} variant="soft">
                      {tab.badge}
                    </Badge>
                  )}
                  {isDisabled && (
                    <Badge size="1" color="gray" variant="outline">
                      Soon
                    </Badge>
                  )}
                </Flex>
              </Box>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
}




