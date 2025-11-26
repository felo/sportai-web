"use client";

import { useState } from "react";
import { Box, Button, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import Image from "next/image";

export interface LogoNewChatButtonProps {
  onNewChat?: () => void;
  /** Logo width in pixels */
  width?: number;
  /** Logo height in pixels */
  height?: number;
  /** Whether to trigger new chat directly on tap (for mobile) instead of hover morph */
  directTapAction?: boolean;
}

const LOGO_URL = "https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg";

/**
 * A logo component that morphs into a "New chat" button on hover (desktop).
 * On mobile with directTapAction, tapping the logo directly triggers new chat.
 */
export function LogoNewChatButton({
  onNewChat,
  width = 120,
  height = 38,
  directTapAction = false,
}: LogoNewChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (directTapAction) {
      onNewChat?.();
    }
  };

  const handleNewChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNewChat?.();
  };

  return (
    <Box
      onMouseEnter={directTapAction ? undefined : () => setIsHovered(true)}
      onMouseLeave={directTapAction ? undefined : () => setIsHovered(false)}
      onClick={directTapAction ? handleClick : undefined}
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: directTapAction ? "pointer" : "default",
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
          src={LOGO_URL}
          alt="SportAI"
          width={width}
          height={height}
          style={{ objectFit: "contain", height: "auto", display: "block" }}
        />
      </Box>

      {/* New Chat Button - only shown on hover for desktop */}
      {!directTapAction && (
        <Button
          variant="ghost"
          size="2"
          onClick={handleNewChatClick}
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
      )}
    </Box>
  );
}

