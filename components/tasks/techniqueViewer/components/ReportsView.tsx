"use client";

/**
 * ReportsView
 *
 * A professional coaching-level view for displaying moment analysis reports.
 * Each report is collapsible and displays the AI analysis with markdown.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { Box, Flex, Text, Badge, Button, ScrollArea, Tooltip } from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  TargetIcon,
  BookmarkIcon,
  ChatBubbleIcon,
  Pencil1Icon,
  PlayIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { MarkdownWithSwings } from "@/components/markdown";
import { StreamingIndicator } from "@/components/chat";
import type { MomentReport } from "@/components/videoPoseViewerV2/types";

interface ReportsViewProps {
  reports: MomentReport[];
  onDeleteReport?: (reportId: string) => void;
  onViewMoment?: (time: number) => void;
}

// Get icon for report based on moment type
function getReportIcon(report: MomentReport) {
  if (report.protocolId) {
    switch (report.protocolId) {
      case "tennis-contact-point":
        return <TargetIcon width={16} height={16} />;
      default:
        return <BookmarkIcon width={16} height={16} />;
    }
  }

  switch (report.momentType) {
    case "comment":
      return <ChatBubbleIcon width={16} height={16} />;
    case "custom":
      return <Pencil1Icon width={16} height={16} />;
    default:
      return <BookmarkIcon width={16} height={16} />;
  }
}

// Get badge color based on moment type
function getBadgeColor(report: MomentReport): "blue" | "green" | "orange" | "purple" {
  if (report.protocolId) return "blue";
  switch (report.momentType) {
    case "comment":
      return "purple";
    case "custom":
      return "green";
    default:
      return "orange";
  }
}

// Format date for printed reports
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { 
    weekday: "long",
    year: "numeric",
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Single Report Card Component
function ReportCard({
  report,
  isExpanded,
  onToggle,
  onDelete,
  onViewMoment,
}: {
  report: MomentReport;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onViewMoment?: () => void;
}) {
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
              <Text size="2" weight="medium" style={{ 
                color: "var(--gray-12)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
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
        <Box
          style={{
            borderTop: "1px solid var(--gray-5)",
          }}
        >
          {/* Preview Image */}
          {report.previewUrl && (
            <Box
              style={{
                width: "100%",
                aspectRatio: "16/9",
                backgroundColor: "black",
                overflow: "hidden",
              }}
            >
              <img
                src={report.previewUrl}
                alt={`Analysis preview for ${report.momentLabel}`}
                style={{
                  width: "100%",
                  height: "100%",
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
                <MarkdownWithSwings>
                  {report.content}
                </MarkdownWithSwings>
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

export function ReportsView({
  reports,
  onDeleteReport,
  onViewMoment,
}: ReportsViewProps) {
  // Track expanded state for each report
  const [expandedReports, setExpandedReports] = useState<Set<string>>(() => {
    // Auto-expand the most recent streaming report
    const streamingReport = reports.find(r => r.isStreaming);
    return streamingReport ? new Set([streamingReport.id]) : new Set();
  });

  // Ref for the printable content area
  const printContentRef = useRef<HTMLDivElement>(null);

  // Sort reports by creation time (newest first)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => b.createdAt - a.createdAt);
  }, [reports]);

  // Auto-expand new streaming reports
  useMemo(() => {
    const streamingReport = reports.find(r => r.isStreaming);
    if (streamingReport && !expandedReports.has(streamingReport.id)) {
      setExpandedReports(prev => new Set([...prev, streamingReport.id]));
    }
  }, [reports, expandedReports]);

  const toggleReport = (reportId: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  // Export to PDF - expands all reports and triggers print
  const handleExportPDF = useCallback(() => {
    // Expand all reports before printing
    const allReportIds = new Set(reports.map(r => r.id));
    setExpandedReports(allReportIds);
    
    // Wait for DOM to update, then expand all <details> elements and print
    setTimeout(() => {
      // Expand all collapsible <details> sections within the print content
      if (printContentRef.current) {
        const detailsElements = printContentRef.current.querySelectorAll('details');
        detailsElements.forEach(details => {
          details.setAttribute('open', 'true');
        });
      }
      
      // Small delay to ensure details are rendered, then print
      setTimeout(() => {
        window.print();
      }, 50);
    }, 100);
  }, [reports]);

  if (reports.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="3"
        style={{
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            backgroundColor: "var(--gray-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookmarkIcon width={28} height={28} style={{ color: "var(--gray-8)" }} />
        </Box>
        <Flex direction="column" gap="1" align="center">
          <Text size="3" weight="medium" style={{ color: "var(--gray-11)" }}>
            No Analysis Reports Yet
          </Text>
          <Text size="2" style={{ color: "var(--gray-9)", maxWidth: 280 }}>
            Select a moment from the Moments tab and click &quot;Analyse Moment&quot; to generate a detailed coaching report.
          </Text>
        </Flex>
      </Flex>
    );
  }

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Reset body for printing */
          body {
            visibility: hidden;
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Make print content visible and flow naturally */
          .reports-print-content,
          .reports-print-content * {
            visibility: visible !important;
          }
          .reports-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            overflow: visible !important;
            padding: 20px !important;
          }
          
          /* Remove scroll constraints from parent containers */
          .reports-print-content,
          .reports-print-content > div,
          [data-radix-scroll-area-viewport] {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          /* Hide action buttons in print */
          .no-print {
            display: none !important;
          }
          
          /* Expand all collapsible details/summary sections */
          details {
            display: block !important;
          }
          details > summary {
            display: block !important;
            list-style: none !important;
          }
          details > summary::marker,
          details > summary::-webkit-details-marker {
            display: none !important;
          }
          details > *:not(summary) {
            display: block !important;
          }
          
          /* Ensure proper page breaks */
          .report-card-print {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          
          /* Clean backgrounds for print */
          .report-card-print {
            background-color: #f5f5f5 !important;
            border: 1px solid #ddd !important;
          }
          
          /* Ensure images print properly */
          img {
            max-width: 100% !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
      
      <ScrollArea style={{ height: "100%" }}>
        <Flex justify="center" p="4">
          <Flex 
            ref={printContentRef}
            className="reports-print-content"
            direction="column" 
            gap="3" 
            style={{ 
              width: "100%", 
              maxWidth: "640px",
            }}
          >
            {/* Header */}
            <Flex justify="between" align="center" mb="2">
              <Flex direction="column" gap="1">
                <Text size="3" weight="medium" style={{ color: "var(--gray-12)" }}>
                  Coaching Reports
                </Text>
                <Text size="1" style={{ color: "var(--gray-10)" }}>
                  {reports.length} analysis {reports.length === 1 ? "report" : "reports"}
                </Text>
              </Flex>
              
              {/* Export Button */}
              <Tooltip content="Export as PDF">
                <Button
                  size="2"
                  variant="soft"
                  onClick={handleExportPDF}
                  className="no-print"
                >
                  <DownloadIcon width={16} height={16} />
                  Export
                </Button>
              </Tooltip>
            </Flex>

            {/* Reports List */}
            {sortedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isExpanded={expandedReports.has(report.id)}
                onToggle={() => toggleReport(report.id)}
                onDelete={onDeleteReport ? () => onDeleteReport(report.id) : undefined}
                onViewMoment={onViewMoment ? () => onViewMoment(report.time) : undefined}
              />
            ))}
          </Flex>
        </Flex>
      </ScrollArea>
    </>
  );
}

export default ReportsView;


