"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { SUB_TABS } from "../constants";
import type { TacticalSubTab } from "../types";

interface SubTabNavigationProps {
  activeSubTab: TacticalSubTab;
  onTabChange: (tab: TacticalSubTab) => void;
}

export function SubTabNavigation({ activeSubTab, onTabChange }: SubTabNavigationProps) {
  return (
    <Flex gap="2" mb="4">
      {SUB_TABS.map((tab) => {
        const isActive = activeSubTab === tab.id;
        return (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-3)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: isActive ? "var(--accent-9)" : "var(--gray-3)",
              border: `1px solid ${isActive ? "var(--accent-9)" : "var(--gray-6)"}`,
            }}
          >
            <Flex align="center" gap="2">
              <Box style={{ color: isActive ? "white" : "var(--gray-11)" }}>
                {tab.icon}
              </Box>
              <Text
                size="2"
                weight="medium"
                style={{ color: isActive ? "white" : "var(--gray-11)" }}
              >
                {tab.label}
              </Text>
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
}





