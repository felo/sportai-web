"use client";

/**
 * Chat layout component - handles the main UI structure
 */

import { forwardRef, type RefObject, type ReactNode } from "react";
import { useSidebar } from "@/components/SidebarContext";
import { DragOverlay } from "@/components/chat/overlays/DragOverlay";
import { ScrollToBottom } from "@/components/chat/navigation/ScrollToBottom";
import { ScrollToVideo } from "@/components/chat/navigation/ScrollToVideo";
import { AudioStopButton } from "@/components/chat/input/AudioStopButton";

interface ChatLayoutProps {
  isDragging: boolean;
  dragHandlers: Record<string, unknown>;
  hasMessages: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  children: ReactNode;
  inputArea: ReactNode;
}

export const ChatLayout = forwardRef<HTMLDivElement, ChatLayoutProps>(function ChatLayout(
  { isDragging, dragHandlers, hasMessages, scrollContainerRef, messagesEndRef, children, inputArea },
  containerRef
) {
  const { isCollapsed: isSidebarCollapsed, isInitialLoad: isSidebarInitialLoad } = useSidebar();

  return (
    <div className={`content-wrapper ${!isSidebarCollapsed ? 'sidebar-expanded' : ''} ${isSidebarInitialLoad ? 'no-transition' : ''}`}>
      <div
        ref={containerRef}
        className={`flex flex-col max-w-4xl w-full h-full transition-all ${isDragging ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
        style={{ position: "relative", overflow: "hidden" }}
        {...dragHandlers}
      >
        {isDragging && <DragOverlay />}

        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <div 
            ref={scrollContainerRef} 
            data-scroll-container="true" 
            style={{ height: "100%", overflowY: "auto", minHeight: 0 }}
          >
            {children}
          </div>
          
          {hasMessages && (
            <>
              <ScrollToVideo scrollContainerRef={scrollContainerRef} />
              <ScrollToBottom 
                scrollContainerRef={scrollContainerRef}
                onScrollToBottom={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              />
            </>
          )}
          
          <AudioStopButton 
            scrollContainerRef={scrollContainerRef} 
            scrollButtonVisible={hasMessages} 
          />
          
          {/* Bottom fade overlay */}
          {hasMessages && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "60px",
                background: `linear-gradient(to top, var(--gray-1, #1C1C1C) 0%, transparent 100%)`,
                pointerEvents: "none",
                zIndex: 1000,
              }}
            />
          )}
        </div>

        {inputArea}
      </div>
    </div>
  );
});

