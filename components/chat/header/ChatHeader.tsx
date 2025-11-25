"use client";

import { useState } from "react";
import { Box, Flex, Text, Button } from "@radix-ui/themes";
import { PlusIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton, BadgeWithTooltip } from "@/components/ui";

interface ChatHeaderProps {
  messageCount: number;
  onNewChat?: () => void;
}

export function ChatHeader({ messageCount, onNewChat }: ChatHeaderProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarWidth = isCollapsed ? "64px" : "280px";
  const [isHovered, setIsHovered] = useState(false);

  // Mobile layout: Hamburger menu (left), centered logo, + button (right)
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

        {/* Centered Logo */}
        <Image
          src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg"
          alt="SportAI"
          width={120}
          height={38}
          style={{ objectFit: "contain", height: "auto" }}
        />

        {/* New Chat Button - Positioned on right */}
        <Box
          style={{
            position: "absolute",
            right: "var(--space-4)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <IconButton
            icon={<PlusIcon />}
            onClick={onNewChat}
            ariaLabel="New chat"
          />
        </Box>
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
        transition: "left 0.2s ease-in-out",
      }}
    >
      {/* Logo with Morph to New Chat Button on Hover */}
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "relative",
          width: "120px",
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isCollapsed ? 1 : 0,
          transition: "opacity 0.1s ease-in-out",
          pointerEvents: isCollapsed ? "auto" : "none",
        }}
      >
        {/* Logo */}
        <Box
          style={{
            opacity: isHovered ? 0 : 1,
            transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isHovered ? "none" : "auto",
          }}
        >
          <Image
            src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg"
            alt="SportAI"
            width={120}
            height={38}
            style={{ objectFit: "contain", height: "auto", display: "block" }}
          />
        </Box>

        {/* New Chat Button */}
        <Button
          variant="ghost"
          size="2"
          onClick={onNewChat}
          style={{
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-2) var(--space-3)",
            whiteSpace: "nowrap",
            pointerEvents: isHovered ? "auto" : "none",
            gap: "6px",
          }}
        >
          <PlusIcon width="16" height="16" />
          <Text size="2" style={{ fontSize: "14px", lineHeight: "1" }}>
            New chat
          </Text>
        </Button>
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

