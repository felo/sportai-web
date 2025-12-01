"use client";

import { useRouter } from "next/navigation";
import { Button, Text, Box } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import type { LibraryButtonProps } from "./types";
import { useLibraryTasks } from "./LibraryTasksContext";

export function LibraryButton({ isActive, onNavigationAttempt }: LibraryButtonProps) {
  const router = useRouter();
  const { processingCount, newCompletedCount, markTasksAsSeen } = useLibraryTasks();

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

    // Mark tasks as seen when navigating to library
    markTasksAsSeen();
    
    // Navigate to library
    router.push("/library");
  };

  const showProcessingBadge = processingCount > 0;
  const showNewBadge = newCompletedCount > 0 && !showProcessingBadge;

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
      
      {/* Processing count - green circle with number */}
      {showProcessingBadge && (
        <Box
          style={{
            minWidth: "18px",
            height: "18px",
            borderRadius: "50%",
            backgroundColor: "var(--green-9)",
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text size="1" style={{ color: "white", fontWeight: 600, fontSize: "11px" }}>
            {processingCount}
          </Text>
        </Box>
      )}
      
      {/* Analysis ready label for new completed videos */}
      {showNewBadge && (
        <Text 
          size="1" 
          style={{ 
            marginLeft: "auto", 
            color: "var(--green-11)",
            fontWeight: 500,
          }}
        >
          analysis ready
        </Text>
      )}
    </Button>
  );
}
