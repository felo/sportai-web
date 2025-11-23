"use client";

import { Flex, Text, Select } from "@radix-ui/themes";
import selectStyles from "@/styles/selects.module.css";

interface SelectOption {
  title: string;
  description: string;
}

interface DescriptiveSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Record<string, SelectOption>;
  label: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * A select component with title and description for each option.
 * Provides a rich, informative selection experience.
 */
export function DescriptiveSelect({
  value,
  onValueChange,
  options,
  label,
  disabled = false,
  placeholder = "Select an option...",
}: DescriptiveSelectProps) {
  const currentOption = options[value];

  return (
    <Flex direction="column" gap="1">
      <Text size="2" color="gray" weight="medium">
        {label}
      </Text>
      <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <Select.Trigger 
          className={selectStyles.selectTriggerStyled}
          style={{ width: "100%", height: "70px", padding: "12px" }}
          placeholder={placeholder}
        >
          {currentOption ? (
            <Flex direction="column" gap="1" align="start">
              <Text weight="medium" size="2">
                {currentOption.title}
              </Text>
              <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                {currentOption.description}
              </Text>
            </Flex>
          ) : (
            <Text size="2" color="gray">{placeholder}</Text>
          )}
        </Select.Trigger>
        <Select.Content>
          {Object.entries(options).map(([key, option]) => (
            <Select.Item key={key} value={key} style={{ minHeight: "70px", padding: "12px" }}>
              <Flex direction="column" gap="1">
                <Text weight="medium" size="2">{option.title}</Text>
                <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                  {option.description}
                </Text>
              </Flex>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}

