"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { createMarkdownComponents } from "./markdown-components";
import { SwingExplanationModal } from "./SwingExplanationModal";
import { MetricConversionModal, convertMetric, type MetricConversion } from "./MetricConversionModal";
import type { SwingExplanation } from "@/database";

interface MarkdownWithSwingsProps {
  children: string;
}

export function MarkdownWithSwings({ children }: MarkdownWithSwingsProps) {
  const [selectedSwing, setSelectedSwing] = useState<SwingExplanation | null>(null);
  const [swingModalOpen, setSwingModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricConversion | null>(null);
  const [metricModalOpen, setMetricModalOpen] = useState(false);

  const handleTermClick = (term: SwingExplanation) => {
    setSelectedSwing(term);
    setSwingModalOpen(true);
  };

  const handleMetricClick = (value: number, unit: string, originalText: string) => {
    const conversion = convertMetric(value, unit);
    if (conversion) {
      setSelectedMetric(conversion);
      setMetricModalOpen(true);
    }
  };

  const markdownComponents = createMarkdownComponents(handleTermClick, handleMetricClick);

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
      
      <SwingExplanationModal 
        open={swingModalOpen}
        onOpenChange={setSwingModalOpen}
        swing={selectedSwing}
      />
      
      <MetricConversionModal 
        open={metricModalOpen}
        onOpenChange={setMetricModalOpen}
        metric={selectedMetric}
      />
    </>
  );
}

