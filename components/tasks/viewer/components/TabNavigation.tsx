"use client";

import { ReactNode } from "react";
import { Box, Flex, Text, Badge } from "@radix-ui/themes";

export interface TabDefinition {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <Box
      style={{
        borderBottom: "1px solid var(--gray-5)",
        backgroundColor: "var(--gray-2)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Box style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 var(--space-4)" }}>
        <Flex
          gap="0"
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <Box
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                style={{
                  padding: "14px 24px",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  borderBottom: isActive ? "2px solid var(--mint-9)" : "2px solid transparent",
                  backgroundColor: isActive ? "var(--gray-1)" : "transparent",
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Flex align="center" gap="2">
                  <Box
                    style={{
                      color: isActive ? "var(--mint-11)" : "var(--gray-10)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {tab.icon}
                  </Box>
                  <Text
                    size="2"
                    weight={isActive ? "medium" : "regular"}
                    style={{
                      color: isActive ? "var(--gray-12)" : "var(--gray-11)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge !== undefined && (
                    <Badge size="1" color={isActive ? "mint" : "gray"} variant="soft">
                      {tab.badge}
                    </Badge>
                  )}
                  {isDisabled && (
                    <Badge size="1" color="gray" variant="outline">
                      Soon
                    </Badge>
                  )}
                </Flex>
              </Box>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
}


