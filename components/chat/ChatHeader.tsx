"use client";

import { Flex, Box, Text, Badge, Tooltip } from "@radix-ui/themes";
import Image from "next/image";
import { useSidebar } from "@/components/SidebarContext";

interface ChatHeaderProps {
  messageCount: number;
}

export function ChatHeader({ messageCount }: ChatHeaderProps) {
  const { isCollapsed } = useSidebar();
  const sidebarWidth = isCollapsed ? "64px" : "280px";

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

