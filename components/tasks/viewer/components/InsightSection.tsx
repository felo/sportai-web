"use client";

import { useState, ReactNode } from "react";
import { Box, Flex, Heading, Text, Card, Badge } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";

interface InsightSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "mint" | "blue" | "amber" | "red" | "gray" | "purple" | "cyan";
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

export function InsightSection({
  title,
  subtitle,
  badge,
  badgeColor = "mint",
  icon,
  children,
  defaultExpanded = false,
  disabled = false,
  disabledMessage = "No data available",
}: InsightSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card 
      style={{ 
        border: "1px solid var(--gray-6)",
        opacity: disabled ? 0.6 : 1,
        marginBottom: "var(--space-3)",
      }}
    >
      <Flex
        justify="between"
        align="center"
        p="3"
        onClick={() => !disabled && setExpanded(!expanded)}
        style={{ 
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        <Flex align="center" gap="3">
          {icon && (
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-2)",
                backgroundColor: `var(--${badgeColor}-a3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `var(--${badgeColor}-11)`,
              }}
            >
              {icon}
            </Box>
          )}
          <Flex direction="column" gap="0">
            <Flex align="center" gap="2">
              <Heading size="4" weight="medium">
                {title}
              </Heading>
              {badge && (
                <Badge color={badgeColor} variant="soft" size="1">
                  {badge}
                </Badge>
              )}
            </Flex>
            {subtitle && (
              <Text size="1" color="gray">
                {disabled ? disabledMessage : subtitle}
              </Text>
            )}
          </Flex>
        </Flex>
        <IconButton
          icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          variant="ghost"
          size="2"
          ariaLabel={expanded ? `Collapse ${title}` : `Expand ${title}`}
        />
      </Flex>

      {expanded && !disabled && (
        <Box
          style={{
            animation: "slideDown 0.25s ease-out",
            overflow: "hidden",
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Box p="4">
            {children}
          </Box>
        </Box>
      )}
    </Card>
  );
}

