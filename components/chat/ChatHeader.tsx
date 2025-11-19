"use client";

import { Flex, Box } from "@radix-ui/themes";
import Image from "next/image";
import { URLs } from "@/lib/config";
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
        src={URLs.logo}
        alt="SportAI Web"
        width={120}
        height={38}
        style={{ objectFit: "contain", height: "auto" }}
      />
    </Box>
  );
}

