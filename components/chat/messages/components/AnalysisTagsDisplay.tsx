"use client";

import { Flex, Text, Badge } from "@radix-ui/themes";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import type { AnalysisTags } from "@/utils/analysis-tags";

interface AnalysisTagsDisplayProps {
  tags: AnalysisTags;
}

/**
 * Display analysis tags (strengths and improvements) as colored pills
 * Shows at the end of assistant messages after video analysis
 */
export function AnalysisTagsDisplay({ tags }: AnalysisTagsDisplayProps) {
  const hasStrengths = tags.strengths.length > 0;
  const hasImprovements = tags.improvements.length > 0;

  if (!hasStrengths && !hasImprovements) {
    return null;
  }

  return (
    <Flex
      direction="column"
      gap="2"
      mt="4"
      pt="3"
      style={{
        borderTop: "1px solid var(--gray-a5)",
      }}
    >
      {/* Strengths */}
      {hasStrengths && (
        <Flex align="center" gap="2" wrap="wrap">
          <Flex align="center" gap="1" style={{ minWidth: "fit-content" }}>
            <CheckCircledIcon
              width={14}
              height={14}
              style={{ color: "var(--green-9)" }}
            />
            <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
              Strengths
            </Text>
          </Flex>
          <Flex gap="1" wrap="wrap">
            {tags.strengths.map((tag) => (
              <Badge
                key={tag}
                color="green"
                variant="soft"
                size="1"
                style={{ textTransform: "lowercase" }}
              >
                {tag}
              </Badge>
            ))}
          </Flex>
        </Flex>
      )}

      {/* Improvements */}
      {hasImprovements && (
        <Flex align="center" gap="2" wrap="wrap">
          <Flex align="center" gap="1" style={{ minWidth: "fit-content" }}>
            <CrossCircledIcon
              width={14}
              height={14}
              style={{ color: "var(--amber-9)" }}
            />
            <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
              Work on
            </Text>
          </Flex>
          <Flex gap="1" wrap="wrap">
            {tags.improvements.map((tag) => (
              <Badge
                key={tag}
                color="amber"
                variant="soft"
                size="1"
                style={{ textTransform: "lowercase" }}
              >
                {tag}
              </Badge>
            ))}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
