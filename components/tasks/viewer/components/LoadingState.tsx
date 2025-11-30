"use client";

import { Box, Spinner } from "@radix-ui/themes";

export function LoadingState() {
  return (
    <Box
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--gray-1)",
      }}
    >
      <Spinner size="3" />
    </Box>
  );
}


