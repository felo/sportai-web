"use client";

import Image from "next/image";
import { Box, Flex, Text, Badge, Button, Tooltip } from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  PlayIcon,
} from "@radix-ui/react-icons";
import { MarkdownWithSwings } from "@/components/markdown";
import { StreamingIndicator } from "@/components/chat";
import type { ReportCardProps } from "./types";
import { getReportIcon, getBadgeColor, formatDate } from "./utils";

/**
 * A single collapsible report card showing moment analysis.
 */
export function ReportCard({
  report,
  isExpanded,
  onToggle,
  onDelete,
  onViewMoment,
}: ReportCardProps) {
  return (
    <Box
      className="report-card-print"
      style={{
        backgroundColor: "var(--gray-2)",
        borderRadius: "12px",
        border: "1px solid var(--gray-5)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header - Always visible */}
      <Flex
        align="center"
        justify="between"
        gap="3"
        p="4"
        onClick={onToggle}
        style={{
          cursor: "pointer",
          backgroundColor: isExpanded ? "var(--gray-3)" : "transparent",
          transition: "background-color 0.15s ease",
        }}
      >
        <Flex align="center" gap="3" style={{ flex: 1, minWidth: 0 }}>
          {/* Icon */}
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              backgroundColor: `var(--${getBadgeColor(report)}-4)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Box style={{ color: `var(--${getBadgeColor(report)}-11)` }}>
              {getReportIcon(report)}
            </Box>
          </Box>

          {/* Title and meta */}
          <Flex direction="column" gap="1" style={{ minWidth: 0, flex: 1 }}>
            <Flex align="center" gap="2">
              <Text
                size="2"
                weight="medium"
                style={{
                  color: "var(--gray-12)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {report.momentLabel}
              </Text>
              {report.isStreaming && (
                <Badge color="blue" variant="soft" size="1">
                  Analyzing...
                </Badge>
              )}
            </Flex>
            <Text size="1" style={{ color: "var(--gray-10)" }}>
              {formatDate(report.createdAt)}
            </Text>
          </Flex>
        </Flex>

        {/* Actions */}
        <Flex align="center" gap="2" className="no-print">
          {onViewMoment && (
            <Tooltip content="View in video">
              <Button
                size="1"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMoment();
                }}
              >
                <PlayIcon width={14} height={14} />
              </Button>
            </Tooltip>
          )}
          {onDelete && !report.isStreaming && (
            <Tooltip content="Delete report">
              <Button
                size="1"
                variant="ghost"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <TrashIcon width={14} height={14} />
              </Button>
            </Tooltip>
          )}
          <Box style={{ color: "var(--gray-9)" }}>
            {isExpanded ? (
              <ChevronUpIcon width={20} height={20} />
            ) : (
              <ChevronDownIcon width={20} height={20} />
            )}
          </Box>
        </Flex>
      </Flex>

      {/* Expandable Content */}
      {isExpanded && (
        <Box style={{ borderTop: "1px solid var(--gray-5)" }}>
          {/* Preview Image */}
          {report.previewUrl && (
            <Box
              style={{
                width: "100%",
                aspectRatio: "16/9",
                backgroundColor: "black",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                src={report.previewUrl}
                alt={`Analysis preview for ${report.momentLabel}`}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                style={{
                  objectFit: "contain",
                }}
              />
            </Box>
          )}

          {/* Analysis Content */}
          <Box p="4">
            {report.content ? (
              <Box
                className="prose dark:prose-invert"
                style={{
                  maxWidth: "none",
                  fontSize: "14px",
                  lineHeight: 1.7,
                }}
              >
                <MarkdownWithSwings>{report.content}</MarkdownWithSwings>
                {report.isStreaming && (
                  <Box mt="3">
                    <StreamingIndicator />
                  </Box>
                )}
              </Box>
            ) : report.isStreaming ? (
              <Flex direction="column" gap="3" align="center" py="6">
                <Text size="2" style={{ color: "var(--gray-11)" }}>
                  Analyzing moment...
                </Text>
                <StreamingIndicator />
              </Flex>
            ) : (
              <Text size="2" style={{ color: "var(--gray-10)" }}>
                No analysis content available.
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
