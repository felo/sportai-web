"use client";

import { Box, Flex, Text, Heading, Badge } from "@radix-ui/themes";
import { MixIcon } from "@radix-ui/react-icons";

export function TechniqueTab() {
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="4"
        style={{ padding: "60px 20px" }}
      >
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: "var(--gray-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MixIcon width={40} height={40} style={{ color: "var(--gray-8)" }} />
        </Box>
        <Heading size="4" weight="medium" style={{ color: "var(--gray-11)" }}>
          Technique Analysis
        </Heading>
        <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
          Detailed swing analysis, form breakdowns, and technique comparisons will be
          available in a future update.
        </Text>
        <Badge color="mint" variant="soft" size="2">Coming Soon</Badge>
      </Flex>
    </Box>
  );
}




