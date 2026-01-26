"use client";

/**
 * EmptyState Component
 * 
 * Displays loading or empty state for the SwingCurveView.
 */

import React from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ActivityLogIcon } from "@radix-ui/react-icons";

interface EmptyStateProps {
  isAnalyzing: boolean;
}

export function EmptyState({ isAnalyzing }: EmptyStateProps) {
  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--gray-1)",
        padding: "32px",
      }}
    >
      {isAnalyzing ? (
        <Flex direction="column" align="center" gap="3">
          <Box
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid var(--gray-4)",
              borderTopColor: "var(--mint-9)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <Text size="3" color="gray">
            Analyzing swing data...
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" align="center" gap="3">
          <ActivityLogIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray" weight="medium">
            Data Analysis
          </Text>
          <Text size="2" color="gray" style={{ textAlign: "center", maxWidth: 300 }}>
            Process a video with pose detection enabled to see data analysis.
          </Text>
        </Flex>
      )}
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}
