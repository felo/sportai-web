"use client";

import { Box, Flex, Heading, Badge } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { formatSwingType } from "../../../../utils";
import { SwingTypeFilter } from "./SwingTypeFilter";

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  availableSwingTypes: string[];
  selectedSwingType: string | null;
  onSwingTypeChange: (type: string | null) => void;
}

export function SectionHeader({
  icon,
  title,
  availableSwingTypes,
  selectedSwingType,
  onSwingTypeChange,
}: SectionHeaderProps) {
  return (
    <Flex align="center" justify="between">
      <Flex align="center" gap="2">
        <Box
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        <Heading size="3" weight="medium">{title}</Heading>
        {selectedSwingType && (
          <Badge 
            color="green" 
            variant="soft"
            style={{ cursor: "pointer" }}
            onClick={() => onSwingTypeChange(null)}
          >
            {formatSwingType(selectedSwingType)}
            <Cross2Icon width={12} height={12} style={{ marginLeft: 4 }} />
          </Badge>
        )}
      </Flex>
      
      <SwingTypeFilter
        availableTypes={availableSwingTypes}
        selectedType={selectedSwingType}
        onTypeChange={onSwingTypeChange}
      />
    </Flex>
  );
}

