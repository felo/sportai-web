"use client";

import React from "react";
import { Flex, Select } from "@radix-ui/themes";
import { MixerHorizontalIcon, ClockIcon } from "@radix-ui/react-icons";

export interface FilterSelectOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterSelectGroup {
  label?: string;
  options: FilterSelectOption[];
}

export interface FilterSelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Options can be a flat list or grouped */
  options: FilterSelectOption[] | FilterSelectGroup[];
  /** Icon to show before the dropdown - "filter", "time", or a custom React element */
  icon?: "filter" | "time" | React.ReactNode;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Minimum width of the trigger */
  minWidth?: string;
  /** Size of the select */
  size?: "1" | "2" | "3";
  /** Variant of the trigger */
  variant?: "classic" | "surface" | "soft" | "ghost";
}

/**
 * Reusable filter select component with optional icon and count support.
 * Designed to match the TechniqueViewer moments filter style.
 */
export function FilterSelect({
  value,
  onValueChange,
  options,
  icon,
  placeholder,
  minWidth = "140px",
  size = "2",
  variant = "soft",
}: FilterSelectProps) {
  // Check if options are grouped
  const isGrouped = options.length > 0 && "options" in options[0];

  // Render the icon
  const renderIcon = () => {
    if (!icon) return null;
    
    if (icon === "filter") {
      return (
        <MixerHorizontalIcon
          width={14}
          height={14}
          style={{ color: "rgba(255,255,255,0.5)" }}
        />
      );
    }
    if (icon === "time") {
      return (
        <ClockIcon
          width={14}
          height={14}
          style={{ color: "rgba(255,255,255,0.5)" }}
        />
      );
    }
    return icon;
  };

  // Format option label with optional count
  const formatLabel = (option: FilterSelectOption) => {
    if (option.count !== undefined) {
      return `${option.label} (${option.count})`;
    }
    return option.label;
  };

  const selectContent = isGrouped ? (
    // Grouped options
    (options as FilterSelectGroup[]).map((group, groupIndex) => (
      <Select.Group key={groupIndex}>
        {group.label && <Select.Label>{group.label}</Select.Label>}
        {group.options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {formatLabel(option)}
          </Select.Item>
        ))}
      </Select.Group>
    ))
  ) : (
    // Flat options
    (options as FilterSelectOption[]).map((option) => (
      <Select.Item key={option.value} value={option.value}>
        {formatLabel(option)}
      </Select.Item>
    ))
  );

  const select = (
    <Select.Root value={value} onValueChange={onValueChange} size={size}>
      <Select.Trigger
        variant={variant}
        placeholder={placeholder}
        style={{ minWidth }}
      />
      <Select.Content>{selectContent}</Select.Content>
    </Select.Root>
  );

  // If icon is provided, wrap in Flex
  if (icon) {
    return (
      <Flex align="center" gap="2">
        {renderIcon()}
        {select}
      </Flex>
    );
  }

  return select;
}




