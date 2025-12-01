"use client";

import { useRouter } from "next/navigation";
import { Button, Text } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import type { LibraryButtonProps } from "./types";

export function LibraryButton({ isActive, onNavigationAttempt }: LibraryButtonProps) {
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Don't navigate if already on the Library page
    if (isActive) {
      return;
    }

    // Check if navigation is allowed (e.g., if chat is thinking)
    if (onNavigationAttempt) {
      const allowed = await Promise.resolve(onNavigationAttempt());
      if (!allowed) {
        return; // User cancelled navigation
      }
    }

    // Navigate to library
    router.push("/library");
  };

  return (
    <Button
      variant={isActive ? "soft" : "ghost"}
      size="2"
      onClick={handleClick}
      style={{
        justifyContent: "flex-start",
        padding: "var(--space-2) var(--space-3)",
        backgroundColor: isActive ? "var(--accent-a4)" : undefined,
        cursor: "pointer",
      }}
    >
      <VideoIcon width="16" height="16" />
      <Text size="2" ml="2">
        Library
      </Text>
    </Button>
  );
}

