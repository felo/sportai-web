"use client";

import { Flex, Box, Text, Badge, Tooltip, Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ChatHeaderProps {
  messageCount: number;
  onNewChat?: () => void;
}

export function ChatHeader({ messageCount, onNewChat }: ChatHeaderProps) {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarWidth = isCollapsed ? "64px" : "280px";

  // Mobile layout: + New Chat button (left), centered logo, no version badge
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
        {/* New Chat Button - Positioned on left */}
        <Box
          style={{
            position: "absolute",
            left: "var(--space-3)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <Button
            variant="ghost"
            size="2"
            onClick={onNewChat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <PlusIcon width="16" height="16" />
            <Text size="2">New Chat</Text>
          </Button>
        </Box>

        {/* Centered Logo */}
        <Image
          src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg"
          alt="SportAI"
          width={120}
          height={38}
          style={{ objectFit: "contain", height: "auto" }}
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
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        transition: "left 0.2s ease-in-out",
      }}
    >
      <Image
        src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg"
        alt="SportAI"
        width={120}
        height={38}
        style={{ objectFit: "contain", height: "auto" }}
      />
      <Tooltip 
        content={
          <Box className="api-version-tooltip">
            <div style={{ fontSize: "12px"}}>
            Stable v0.5.58 - Last updated 2025-10-01
            </div>
          </Box>
        }
        side="bottom"
      >
        <Badge
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
            cursor: "help",
          }}
        >
          API version 0.5.58
        </Badge>
      </Tooltip>
    </Box>
  );
}

