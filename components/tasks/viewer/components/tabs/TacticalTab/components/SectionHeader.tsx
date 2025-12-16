"use client";

import { Box, Flex, Heading, Badge } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { formatSwingType } from "../../../../utils";
import { SwingTypeFilter } from "./SwingTypeFilter";

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  availableSwingTypes: string[];
  selectedSwingTypes: string[];
  onSwingTypesChange: (types: string[]) => void;
}

export function SectionHeader({
  icon,
  title,
  availableSwingTypes,
  selectedSwingTypes,
  onSwingTypesChange,
}: SectionHeaderProps) {
  const handleRemoveType = (typeToRemove: string) => {
    onSwingTypesChange(selectedSwingTypes.filter(t => t !== typeToRemove));
  };

  return (
    <Flex align="center" justify="between">
      <Flex align="center" gap="2" style={{ flexWrap: "wrap" }}>
        <Box
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Heading size="3" weight="medium">{title}</Heading>
        {selectedSwingTypes.map(swingType => (
          <Badge 
            key={swingType}
            color="green" 
            variant="soft"
            style={{ cursor: "pointer" }}
            onClick={() => handleRemoveType(swingType)}
          >
            {formatSwingType(swingType)}
            <Cross2Icon width={12} height={12} style={{ marginLeft: 4 }} />
          </Badge>
        ))}
      </Flex>
      
      <SwingTypeFilter
        availableTypes={availableSwingTypes}
        selectedTypes={selectedSwingTypes}
        onTypesChange={onSwingTypesChange}
      />
    </Flex>
  );
}

