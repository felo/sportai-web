"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { createMarkdownComponents } from "./markdown-components";
import { SwingExplanationModal } from "./SwingExplanationModal";
import { MetricConversionModal, convertMetric, type MetricConversion } from "./MetricConversionModal";
import type { SwingExplanation } from "@/database";
import { getHighlightingPreferences, type HighlightingPreferences } from "@/utils/storage";

interface MarkdownWithSwingsProps {
  children: string;
  onAskForHelp?: (termName: string) => void;
}

export function MarkdownWithSwings({ children, onAskForHelp }: MarkdownWithSwingsProps) {
  const [selectedSwing, setSelectedSwing] = useState<SwingExplanation | null>(null);
  const [swingModalOpen, setSwingModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricConversion | null>(null);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [highlightingPrefs, setHighlightingPrefs] = useState<HighlightingPreferences>({
    terminology: true,
    technique: true,
    timestamps: true,
    swings: true,
  });

  useEffect(() => {
    // Load highlighting preferences from localStorage
    setHighlightingPrefs(getHighlightingPreferences());

    // Listen for highlighting preferences changes
    const handleHighlightingPreferencesChange = () => {
      setHighlightingPrefs(getHighlightingPreferences());
    };

    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);

    return () => {
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    };
  }, []);

  // Memoize click handlers to prevent recreating them on every render
  const handleTermClick = useCallback((term: SwingExplanation) => {
    setSelectedSwing(term);
    setSwingModalOpen(true);
  }, []);

  const handleMetricClick = useCallback((value: number, unit: string, originalText: string) => {
    const conversion = convertMetric(value, unit);
    if (conversion) {
      setSelectedMetric(conversion);
      setMetricModalOpen(true);
    }
  }, []);

  // Memoize markdown components to prevent recreating them on every render
  // This prevents flickering when hovering over links/collapsible sections during streaming
  const markdownComponents = useMemo(
    () => createMarkdownComponents(handleTermClick, handleMetricClick, highlightingPrefs),
    [handleTermClick, handleMetricClick, highlightingPrefs]
  );

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
        onAskForHelp={onAskForHelp}
      />
      
      <MetricConversionModal 
        open={metricModalOpen}
        onOpenChange={setMetricModalOpen}
        metric={selectedMetric}
      />
    </>
  );
}

