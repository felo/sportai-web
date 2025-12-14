/**
 * Print-specific CSS styles for ReportsView PDF export.
 */
export const PRINT_STYLES = `
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
`;
