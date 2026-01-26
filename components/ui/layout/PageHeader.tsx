"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton, BadgeWithTooltip, LogoNewChatButton } from "@/components/ui";
import { getDisplayVersion, getFullVersion, getBuildInfo } from "@/lib/version";
import type { ReactNode } from "react";

type NavigationMode = "chat" | "studio";

interface ModeToggleButtonProps {
  mode: NavigationMode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ModeToggleButton({ label, isActive, onClick }: ModeToggleButtonProps) {
  return (
    <Box
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius-3)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        background: isActive ? "var(--accent-9)" : "var(--gray-3)",
        border: `1px solid ${isActive ? "var(--accent-9)" : "var(--gray-6)"}`,
      }}
    >
      <Text
        size="2"
        weight="medium"
        style={{ color: isActive ? "white" : "var(--gray-11)" }}
      >
        {label}
      </Text>
    </Box>
  );
}

export interface PageHeaderProps {
  /** Page title to display (only shown on desktop when sidebar is expanded) */
  title?: string;
  /** Actions to display on the right side of the header */
  actions?: ReactNode;
  /** Callback when new chat button is clicked (for chat pages) */
  onNewChat?: () => void;
  /** Whether to show the API version badge (default: true) */
  showVersionBadge?: boolean;
  /** Message count for new chat button (chat pages) */
  messageCount?: number;
}

export function PageHeader({ 
  title, 
  actions, 
  onNewChat,
  showVersionBadge = true,
}: PageHeaderProps) {
  const { isCollapsed, isInitialLoad, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarWidth = isCollapsed ? "64px" : "280px";

  // Determine active mode based on current route
  const activeMode: NavigationMode = pathname?.startsWith("/library") ? "studio" : "chat";

  const handleModeChange = (mode: NavigationMode) => {
    if (mode === "studio") {
      router.push("/library");
    } else {
      router.push("/");
    }
  };

  // Mobile layout: Hamburger menu (left), centered logo (2/3 desktop size)
  if (isMobile) {
    return (
      <Box
        className="fixed top-0 left-0 right-0 z-20"
        style={{
          borderBottom: "1px solid var(--gray-6)",
          backgroundColor: "var(--color-background)",
          backdropFilter: "blur(8px)",
          paddingTop: "calc(var(--space-1) + env(safe-area-inset-top))",
          paddingBottom: "var(--space-1)",
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

        {/* Centered Logo - Tap to create new chat if handler provided (2/3 desktop size) */}
        <LogoNewChatButton
          onNewChat={onNewChat}
          directTapAction={!!onNewChat}
          width={120}
          height={38}
        />

        {/* Actions on the right */}
        {actions && (
          <Box
            style={{
              position: "absolute",
              right: "var(--space-4)",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    );
  }

  // Desktop layout
  return (
    <Box
      className="fixed top-0 right-0 z-20"
      style={{
        left: sidebarWidth,
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
      {/* Left side: Logo (when collapsed) or Page Title */}
      <Flex align="center" gap="3" style={{ minWidth: "180px" }}>
        {/* Logo with Morph to New Chat Button - Only visible when sidebar collapsed */}
        <Box
          style={{
            opacity: isCollapsed ? 1 : 0,
            transition: "opacity 0.1s ease-in-out",
            pointerEvents: isCollapsed ? "auto" : "none",
            position: isCollapsed ? "relative" : "absolute",
          }}
        >
          <LogoNewChatButton onNewChat={onNewChat} />
        </Box>

        {/* Page title - Always visible when provided and sidebar expanded */}
        {title && !isCollapsed && (
          <Text size="5" weight="bold">
            {title}
          </Text>
        )}
      </Flex>

      {/* Center: Mode Toggle Buttons */}
      <Flex 
        align="center" 
        gap="2"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <ModeToggleButton
          mode="chat"
          label="Chat"
          isActive={activeMode === "chat"}
          onClick={() => handleModeChange("chat")}
        />
        <ModeToggleButton
          mode="studio"
          label="Studio Playground"
          isActive={activeMode === "studio"}
          onClick={() => handleModeChange("studio")}
        />
      </Flex>

      {/* Right side: Actions and/or Version Badge */}
      <Flex align="center" gap="3" style={{ minWidth: "180px", justifyContent: "flex-end" }}>
        {actions}
        
        {showVersionBadge && (
          <BadgeWithTooltip
            text={getDisplayVersion()}
            tooltip={`${getFullVersion()} • ${getBuildInfo()}`}
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
        )}
      </Flex>
    </Box>
  );
}
