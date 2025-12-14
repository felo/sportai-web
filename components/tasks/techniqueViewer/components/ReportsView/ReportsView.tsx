"use client";

/**
 * ReportsView
 *
 * A professional coaching-level view for displaying moment analysis reports.
 * Each report is collapsible and displays the AI analysis with markdown.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { Box, Flex, Text, Button, ScrollArea, Tooltip } from "@radix-ui/themes";
import { BookmarkIcon, DownloadIcon } from "@radix-ui/react-icons";
import type { ReportsViewProps } from "./types";
import { ReportCard } from "./ReportCard";
import { PRINT_STYLES } from "./printStyles";

/**
 * Main ReportsView component displaying coaching analysis reports.
 */
export function ReportsView({
  reports,
  onDeleteReport,
  onViewMoment,
}: ReportsViewProps) {
  // Track expanded state for each report
  const [expandedReports, setExpandedReports] = useState<Set<string>>(() => {
    // Auto-expand the most recent streaming report
    const streamingReport = reports.find((r) => r.isStreaming);
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
    const streamingReport = reports.find((r) => r.isStreaming);
    if (streamingReport && !expandedReports.has(streamingReport.id)) {
      setExpandedReports((prev) => new Set([...prev, streamingReport.id]));
    }
  }, [reports, expandedReports]);

  const toggleReport = (reportId: string) => {
    setExpandedReports((prev) => {
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
    const allReportIds = new Set(reports.map((r) => r.id));
    setExpandedReports(allReportIds);

    // Wait for DOM to update, then expand all <details> elements and print
    setTimeout(() => {
      // Expand all collapsible <details> sections within the print content
      if (printContentRef.current) {
        const detailsElements = printContentRef.current.querySelectorAll("details");
        detailsElements.forEach((details) => {
          details.setAttribute("open", "true");
        });
      }

      // Small delay to ensure details are rendered, then print
      setTimeout(() => {
        window.print();
      }, 50);
    }, 100);
  }, [reports]);

  // Empty state
  if (reports.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Print-specific styles */}
      <style>{PRINT_STYLES}</style>

      <ScrollArea style={{ height: "100%" }}>
        <Flex justify="center" p="4">
          <Flex
            ref={printContentRef}
            className="reports-print-content"
            direction="column"
            gap="3"
            style={{ width: "100%", maxWidth: "640px" }}
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
                <Button size="2" variant="soft" onClick={handleExportPDF} className="no-print">
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

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      style={{ padding: "48px 24px", textAlign: "center" }}
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
          Select a moment from the Moments tab and click &quot;Analyse Moment&quot; to generate a
          detailed coaching report.
        </Text>
      </Flex>
    </Flex>
  );
}

export default ReportsView;
