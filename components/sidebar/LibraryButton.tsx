"use client";

import Link from "next/link";
import { Button, Text } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import type { LibraryButtonProps } from "./types";

export function LibraryButton({ isActive }: LibraryButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if already on the Library page
    if (isActive) {
      e.preventDefault();
    }
    // Never close the sidebar when clicking Library - let the page navigate naturally
  };

  return (
    <Button
      variant={isActive ? "soft" : "ghost"}
      size="2"
      asChild
      style={{
        justifyContent: "flex-start",
        padding: "var(--space-2) var(--space-3)",
        backgroundColor: isActive ? "var(--accent-a4)" : undefined,
      }}
    >
      <Link href="/tasks" onClick={handleClick}>
        <VideoIcon width="16" height="16" />
        <Text size="2" ml="2">
          Library
        </Text>
      </Link>
    </Button>
  );
}

