"use client";

import { Box, Flex, DropdownMenu, IconButton } from "@radix-ui/themes";
import { MixerHorizontalIcon, CheckIcon } from "@radix-ui/react-icons";
import { formatSwingType } from "../../../../utils";

interface SwingTypeFilterProps {
  availableTypes: string[];
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}

export function SwingTypeFilter({ 
  availableTypes, 
  selectedType, 
  onTypeChange 
}: SwingTypeFilterProps) {
  if (availableTypes.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          variant="soft"
          size="2"
          style={{ position: "relative" }}
        >
          <MixerHorizontalIcon width={16} height={16} />
          {selectedType && (
            <Box
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-9)",
              }}
            />
          )}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Filter by Shot Type</DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          onClick={() => onTypeChange(null)}
          style={{ 
            fontWeight: !selectedType ? 600 : 400,
            color: !selectedType ? "var(--accent-11)" : undefined,
          }}
        >
          <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
            <span>All Shots</span>
            {!selectedType && <CheckIcon width={16} height={16} />}
          </Flex>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        {availableTypes.map(swingType => (
          <DropdownMenu.Item
            key={swingType}
            onClick={() => onTypeChange(swingType)}
            style={{ 
              fontWeight: selectedType === swingType ? 600 : 400,
              color: selectedType === swingType ? "var(--accent-11)" : undefined,
            }}
          >
            <Flex align="center" justify="between" gap="3" style={{ width: "100%" }}>
              <span>{formatSwingType(swingType)}</span>
              {selectedType === swingType && <CheckIcon width={16} height={16} />}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

