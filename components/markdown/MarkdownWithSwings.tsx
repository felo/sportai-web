"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { createMarkdownComponents } from "./markdown-components";
import { SwingExplanationModal } from "./SwingExplanationModal";
import { MetricConversionModal, convertMetric, type MetricConversion } from "./MetricConversionModal";
import { SectionSpeaker } from "./SectionSpeaker";
import type { SwingExplanation } from "@/database";
import { getHighlightingPreferences, getTTSSettings, type HighlightingPreferences } from "@/utils/storage";

interface MarkdownWithSwingsProps {
  children: string;
  messageId?: string;
  onAskForHelp?: (termName: string, swing?: any) => void;
  feedbackButtons?: React.ReactNode;
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
}

/**
 * Strip markdown from text for TTS (remove formatting but keep content)
 */
function stripMarkdownForTTS(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/__([^_]+)__/g, '$1') // Remove bold
    .replace(/_([^_]+)_/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links (keep text)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/^[-*_]{3,}$/gm, '') // Remove horizontal rules
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/^[\s]*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^[\s]*\d+\.\s+/gm, '') // Remove ordered list markers
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim();
}

export function MarkdownWithSwings({ children, messageId, onAskForHelp, feedbackButtons, onTTSUsage }: MarkdownWithSwingsProps) {
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
  const [ttsEnabled, setTTSEnabled] = useState(false);

  useEffect(() => {
    // Load highlighting preferences from localStorage
    setHighlightingPrefs(getHighlightingPreferences());
    
    // Load TTS enabled state from localStorage
    setTTSEnabled(getTTSSettings().enabled);

    // Listen for highlighting preferences changes
    const handleHighlightingPreferencesChange = () => {
      setHighlightingPrefs(getHighlightingPreferences());
    };

    // Listen for TTS settings changes
    const handleTTSSettingsChange = () => {
      setTTSEnabled(getTTSSettings().enabled);
    };

    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    window.addEventListener("tts-settings-change", handleTTSSettingsChange);

    return () => {
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
      window.removeEventListener("tts-settings-change", handleTTSSettingsChange);
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

  // Split content into sections by horizontal rules (---)
  // Each section gets its own speaker button
  const sections = useMemo(() => {
    // Split by --- or *** or ___ (markdown horizontal rules)
    const sectionParts = children.split(/\n(?:[-*_]){3,}\n/);
    return sectionParts.map((section, index) => ({
      id: index,
      content: section.trim(),
      plainText: stripMarkdownForTTS(section.trim()),
    }));
  }, [children]);

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.id} style={{ position: 'relative' }}>
          {/* Section content */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {section.content}
          </ReactMarkdown>
          
          {/* Add separator between sections (except after last section) */}
          {index < sections.length - 1 && (
            <div style={{ position: 'relative' }}>
              <div className="markdown-divider" role="separator" aria-label="Section divider" style={{ marginTop: '24px', marginBottom: '24px' }}>
                <div className="markdown-divider-line" />
                <span className="markdown-divider-dots" aria-hidden="true">
                  •••
                </span>
                <div className="markdown-divider-line" />
              </div>
              
              {/* Section speaker button - positioned on the separator line */}
              {ttsEnabled && messageId && section.plainText && section.plainText.length > 0 && section.plainText.length <= 5000 && (
                <div style={{ 
                  position: 'absolute',
                  right: '0px',
                  top: '0%',
                  transform: 'translateY(-100%)',
                }}>
                  <SectionSpeaker
                    sectionText={section.plainText}
                    sectionId={String(section.id)}
                    messageId={messageId}
                    onTTSUsage={onTTSUsage}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Last section: speaker button and feedback buttons in same row */}
          {index === sections.length - 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
            }}>
              {/* Feedback buttons on the left */}
              <div>
                {feedbackButtons}
              </div>
              
              {/* Speaker button on the right */}
              {ttsEnabled && messageId && section.plainText && section.plainText.length > 0 && section.plainText.length <= 5000 && (
                <SectionSpeaker
                  sectionText={section.plainText}
                  sectionId={String(section.id)}
                  messageId={messageId}
                  onTTSUsage={onTTSUsage}
                />
              )}
            </div>
          )}
        </div>
      ))}
      
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

