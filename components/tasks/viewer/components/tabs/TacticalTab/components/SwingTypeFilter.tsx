"use client";

import { Box, DropdownMenu, IconButton } from "@radix-ui/themes";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { formatSwingType } from "../../../../utils";

interface SwingTypeFilterProps {
  availableTypes: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
}

export function SwingTypeFilter({ 
  availableTypes, 
  selectedTypes, 
  onTypesChange 
}: SwingTypeFilterProps) {
  if (availableTypes.length === 0) return null;

  const handleToggle = (swingType: string) => {
    if (selectedTypes.includes(swingType)) {
      onTypesChange(selectedTypes.filter(t => t !== swingType));
    } else {
      onTypesChange([...selectedTypes, swingType]);
    }
  };

  const handleSelectAll = () => {
    onTypesChange([]);
  };

  const isAllSelected = selectedTypes.length === 0;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          variant="soft"
          size="2"
          style={{ position: "relative" }}
        >
          <MixerHorizontalIcon width={16} height={16} />
          {selectedTypes.length > 0 && (
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
        <DropdownMenu.CheckboxItem
          checked={isAllSelected}
          onCheckedChange={handleSelectAll}
        >
          All Shots
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.Separator />
        {availableTypes.map(swingType => (
          <DropdownMenu.CheckboxItem
            key={swingType}
            checked={selectedTypes.includes(swingType)}
            onCheckedChange={() => handleToggle(swingType)}
            onSelect={(e) => e.preventDefault()}
          >
            {formatSwingType(swingType)}
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

