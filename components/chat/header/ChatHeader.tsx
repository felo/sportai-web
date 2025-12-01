"use client";

import { Box } from "@radix-ui/themes";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton, BadgeWithTooltip, LogoNewChatButton } from "@/components/ui";

interface ChatHeaderProps {
  messageCount: number;
  onNewChat?: () => void;
}

export function ChatHeader({ messageCount, onNewChat }: ChatHeaderProps) {
  const { isCollapsed, isInitialLoad, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarWidth = isCollapsed ? "64px" : "280px";

  // Mobile layout: Hamburger menu (left), centered logo with tap-to-new-chat
  if (isMobile) {
    return (
      <Box
        className="fixed top-0 left-0 right-0 z-20"
        style={{
          borderBottom: "1px solid var(--gray-6)",
          backgroundColor: "var(--color-background)",
          backdropFilter: "blur(8px)",
          paddingTop: "calc(var(--space-3) + env(safe-area-inset-top))", // Safe area support
          paddingBottom: "var(--space-3)",
          paddingLeft: "var(--space-4)",
          paddingRight: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          position: "relative",
        }}
      >
        {/* Hamburger Menu - Positioned on left */}
        <Box
          style={{
            position: "absolute",
            left: "var(--space-4)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <IconButton
            icon={<HamburgerMenuIcon />}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
          />
        </Box>

        {/* Centered Logo - Tap to create new chat */}
        <LogoNewChatButton
          onNewChat={onNewChat}
          directTapAction={true}
        />
      </Box>
    );
  }

  // Desktop layout: logo (left), version badge (right)
  return (
    <Box
      className="fixed top-0 right-0 z-20"
      style={{
        left: sidebarWidth, // Start to the right of sidebar
        borderBottom: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-background)",
        backdropFilter: "blur(8px)",
        height: "57px",
        paddingLeft: "var(--space-4)",
        paddingRight: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        transition: isInitialLoad ? "none" : "left 0.2s ease-in-out",
      }}
    >
      {/* Logo with Morph to New Chat Button on Hover */}
      <Box
        style={{
          opacity: isCollapsed ? 1 : 0,
          transition: "opacity 0.1s ease-in-out",
          pointerEvents: isCollapsed ? "auto" : "none",
        }}
      >
        <LogoNewChatButton onNewChat={onNewChat} />
      </Box>

      <BadgeWithTooltip
        text="API version 0.5.58"
        tooltip="Stable v0.5.58 - Last updated 2025-10-01"
        variant="soft"
        color="gray"
        radius="full"
        size="2"
        style={{
          fontFamily: "var(--font-mono, 'Courier New', monospace)",
          fontSize: "12px",
          fontWeight: "500",
          letterSpacing: "0.02em",
          padding: "4px 12px",
        }}
      />
    </Box>
  );
}

