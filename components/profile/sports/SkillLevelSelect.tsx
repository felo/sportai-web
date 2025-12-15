"use client";

import { useState } from "react";
import { Box, Flex, Text, Button, Popover } from "@radix-ui/themes";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import { skillLevelOptions } from "@/lib/profile-options";
import type { SkillLevel } from "@/types/profile";

interface SkillLevelSelectProps {
  value: SkillLevel | "";
  onChange: (value: SkillLevel) => void;
  placeholder?: string;
}

export function SkillLevelSelect({
  value,
  onChange,
  placeholder = "Select level",
}: SkillLevelSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = skillLevelOptions.find((s) => s.value === value);

  const handleSelect = (optionValue: SkillLevel) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button
          variant="surface"
          style={{
            width: "100%",
            justifyContent: "space-between",
            fontWeight: "normal",
            color: selectedOption ? "inherit" : "var(--gray-9)",
            cursor: "pointer",
          }}
          type="button"
        >
          <Text truncate>{selectedOption?.label || placeholder}</Text>
          <ChevronDownIcon />
        </Button>
      </Popover.Trigger>

      <Popover.Content
        side="bottom"
        align="start"
        sideOffset={4}
        style={{
          padding: 0,
          minWidth: "280px",
          overflow: "hidden",
        }}
      >
        {skillLevelOptions.map((option, index) => {
          const isSelected = option.value === value;
          const isLast = index === skillLevelOptions.length - 1;
          return (
            <Box
              key={option.value}
              onClick={() => handleSelect(option.value as SkillLevel)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                backgroundColor: isSelected
                  ? "var(--mint-3)"
                  : "transparent",
                borderBottom: isLast ? "none" : "1px solid var(--gray-4)",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "var(--gray-3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isSelected
                  ? "var(--mint-3)"
                  : "transparent";
              }}
            >
              <Flex justify="between" align="start" gap="3">
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text
                    weight="medium"
                    size="2"
                    style={{ color: isSelected ? "var(--mint-11)" : "inherit" }}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text size="1" color="gray">
                      {option.description}
                    </Text>
                  )}
                </Flex>
                {isSelected && (
                  <CheckIcon
                    width={16}
                    height={16}
                    style={{ color: "var(--mint-11)", flexShrink: 0 }}
                  />
                )}
              </Flex>
            </Box>
          );
        })}
      </Popover.Content>
    </Popover.Root>
  );
}

