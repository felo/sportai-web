"use client";

import { Box, Flex, Text, Card } from "@radix-ui/themes";
import { TargetIcon } from "@radix-ui/react-icons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  fullPage?: boolean;
}

export function EmptyState({ 
  icon, 
  title, 
  description,
  fullPage = false,
}: EmptyStateProps) {
  const iconElement = icon || <TargetIcon width={fullPage ? 48 : 32} height={fullPage ? 48 : 32} style={{ color: "var(--gray-8)" }} />;

  if (fullPage) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          {iconElement}
          <Text size="3" color="gray">{title}</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Card style={{ border: "1px solid var(--gray-5)" }}>
      <Flex 
        direction="column" 
        gap="2" 
        p="6" 
        align="center" 
        justify="center"
      >
        {iconElement}
        <Text size="2" color="gray" weight="medium">{title}</Text>
        {description && (
          <Text size="1" color="gray">{description}</Text>
        )}
      </Flex>
    </Card>
  );
}





