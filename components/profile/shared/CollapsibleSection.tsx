"use client";

import { useState } from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Box>
      <Flex
        align="center"
        gap="2"
        py="2"
        style={{ cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDownIcon width={16} height={16} />
        ) : (
          <ChevronRightIcon width={16} height={16} />
        )}
        <Flex direction="column" gap="0">
          <Heading size="3" weight="medium">
            {title}
          </Heading>
          {description && (
            <Text size="1" color="gray">
              {description}
            </Text>
          )}
        </Flex>
      </Flex>
      
      <Box
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? "2000px" : "0",
          opacity: isOpen ? 1 : 0,
          transition: "max-height 0.3s ease-out, opacity 0.2s ease-out",
        }}
      >
        <Box pl="6" pt="2" pb="4">
          {children}
        </Box>
      </Box>
    </Box>
  );
}

