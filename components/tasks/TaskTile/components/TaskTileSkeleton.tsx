"use client";

import { Card, Flex, Box, Skeleton } from "@radix-ui/themes";

/**
 * Skeleton placeholder for TaskTile while loading
 * Matches the visual structure of TaskTile for smooth transitions
 */
export function TaskTileSkeleton() {
  return (
    <Card
      style={{
        transition: "all 0.2s ease",
        border: "1px solid var(--gray-6)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Thumbnail skeleton */}
      <Box
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "var(--gray-3)",
          overflow: "hidden",
        }}
      >
        <Skeleton
          style={{
            width: "100%",
            height: "100%",
          }}
        />
        
        {/* Sport badge skeleton */}
        <Box style={{ position: "absolute", top: "8px", left: "8px" }}>
          <Skeleton width="60px" height="20px" style={{ borderRadius: "4px" }} />
        </Box>
        
        {/* Duration badge skeleton */}
        <Box style={{ position: "absolute", bottom: "8px", right: "8px" }}>
          <Skeleton width="40px" height="18px" style={{ borderRadius: "4px" }} />
        </Box>
      </Box>

      {/* Card content skeleton */}
      <Flex direction="column" gap="2" p="3">
        {/* Status badge row */}
        <Flex justify="between" align="center">
          <Skeleton width="70px" height="22px" style={{ borderRadius: "4px" }} />
        </Flex>

        {/* Task type */}
        <Skeleton width="100px" height="18px" />

        {/* Time info */}
        <Skeleton width="80px" height="14px" />
      </Flex>
    </Card>
  );
}


