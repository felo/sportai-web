"use client";

import { Flex } from "@radix-ui/themes";
import { ToggleButton } from "@/components/ui";
import { SUB_TABS } from "../constants";
import type { TacticalSubTab } from "../types";

interface SubTabNavigationProps {
  activeSubTab: TacticalSubTab;
  onTabChange: (tab: TacticalSubTab) => void;
}

export function SubTabNavigation({ activeSubTab, onTabChange }: SubTabNavigationProps) {
  return (
    <Flex gap="2" mb="4">
      {SUB_TABS.map((tab) => (
        <ToggleButton
          key={tab.id}
          label={tab.label}
          isActive={activeSubTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          size="3"
        />
      ))}
    </Flex>
  );
}
