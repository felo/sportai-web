"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { StreamingIndicator } from "@/components/chat";

/**
 * Loading skeleton for profile cards
 */
export function LoadingSkeleton() {
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--mint-9), var(--mint-11))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 2s infinite",
          }}
        >
          <PersonIcon width={28} height={28} style={{ color: "white" }} />
        </Box>
        <Text size="3" weight="medium" style={{ color: "var(--gray-11)" }}>
          Analyzing player profiles...
        </Text>
        <Text size="2" color="gray">
          AI is evaluating performance attributes
        </Text>
        <Box style={{ marginTop: 8 }}>
          <StreamingIndicator />
        </Box>
      </Flex>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </Box>
  );
}

