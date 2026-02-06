"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { createMarkdownComponents, timestampToSeconds } from "./markdown-components";
import { SwingExplanationModal } from "./SwingExplanationModal";
import { MetricConversionModal, convertMetric, type MetricConversion } from "./MetricConversionModal";
import { CourtCoordinateModal, type CourtCoordinate, type BallSequenceClick, type CourtZone } from "./CourtCoordinateModal";
import { SectionSpeaker } from "./SectionSpeaker";
import { useFloatingVideoContextOptional } from "@/components/chat/viewers/FloatingVideoContext";
import type { SwingExplanation } from "@/database";
import { getHighlightingPreferences, getTTSSettings, getDeveloperMode, type HighlightingPreferences } from "@/utils/storage";
import type { SharkFeature } from "@/types/shark";
import { AnalysisTagsDisplay } from "@/components/chat/messages/components/AnalysisTagsDisplay";
import type { AnalysisTags } from "@/utils/analysis-tags";

interface MarkdownWithSwingsProps {
  children: string;
  messageId?: string;
  onAskForHelp?: (termName: string, swing?: any) => void;
  feedbackButtons?: React.ReactNode;
  onTTSUsage?: (characters: number, cost: number, quality: string) => void;
  onBallSequenceClick?: (ballSequence: BallSequenceClick) => void;
  isStreaming?: boolean;
  features?: SharkFeature[]; // Technique features for rendering [[FEATURE:name]] tags
  fps?: number; // Video FPS for thumbnail extraction (derived from Shark analysis)
  analysisTags?: AnalysisTags; // Analysis tags (strengths and improvements) to display above feedback buttons
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

export function MarkdownWithSwings({ children, messageId, onAskForHelp, feedbackButtons, onTTSUsage, onBallSequenceClick, isStreaming, features, fps, analysisTags }: MarkdownWithSwingsProps) {
  const [selectedSwing, setSelectedSwing] = useState<SwingExplanation | null>(null);
  const [swingModalOpen, setSwingModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricConversion | null>(null);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState<CourtCoordinate | null>(null);
  const [selectedZone, setSelectedZone] = useState<CourtZone | null>(null);
  const [coordinateModalOpen, setCoordinateModalOpen] = useState(false);
  const [highlightingPrefs, setHighlightingPrefs] = useState<HighlightingPreferences>({
    terminology: true,
    technique: true,
    timestamps: true,
    swings: true,
  });
  const [ttsEnabled, setTTSEnabled] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  // Video element for thumbnail extraction (found from DOM)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Track when streaming just completed to trigger fade-in animation
  const wasStreamingRef = useRef(isStreaming);
  const [showSpeakerFadeIn, setShowSpeakerFadeIn] = useState(!isStreaming);

  // Find video element from DOM when features are present (for thumbnail extraction)
  useEffect(() => {
    if (features && features.length > 0 && !videoElement) {
      // Find the video element in the DOM
      const videos = document.querySelectorAll("video");
      if (videos.length > 0) {
        // Use the last video (most likely the relevant one for this chat)
        setVideoElement(videos[videos.length - 1] as HTMLVideoElement);
      }
    }
  }, [features, videoElement]);

  useEffect(() => {
    // When streaming changes from true to false, trigger the fade-in
    if (wasStreamingRef.current && !isStreaming) {
      setShowSpeakerFadeIn(true);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    // Load highlighting preferences from localStorage
    setHighlightingPrefs(getHighlightingPreferences());

    // Load TTS enabled state from localStorage
    setTTSEnabled(getTTSSettings().enabled);

    // Load developer mode state
    setDeveloperMode(getDeveloperMode());

    // Listen for highlighting preferences changes
    const handleHighlightingPreferencesChange = () => {
      setHighlightingPrefs(getHighlightingPreferences());
    };

    // Listen for TTS settings changes
    const handleTTSSettingsChange = () => {
      setTTSEnabled(getTTSSettings().enabled);
    };

    // Listen for developer mode changes
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };

    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    window.addEventListener("tts-settings-change", handleTTSSettingsChange);
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);

    return () => {
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
      window.removeEventListener("tts-settings-change", handleTTSSettingsChange);
      window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
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

  const handleCoordinateClick = useCallback((coordinate: CourtCoordinate) => {
    setSelectedCoordinate(coordinate);
    setSelectedZone(null);
    setCoordinateModalOpen(true);
  }, []);

  const handleCourtZoneClick = useCallback((zone: CourtZone) => {
    setSelectedZone(zone);
    setSelectedCoordinate(null);
    setCoordinateModalOpen(true);
  }, []);

  // Floating video context for timestamp clicks
  const floatingCtx = useFloatingVideoContextOptional();

  // Store floatingCtx in a ref so we always have the latest value
  const floatingCtxRef = useRef(floatingCtx);
  floatingCtxRef.current = floatingCtx;

  // Handle timestamp clicks - bring up floating video and seek to timestamp (paused)
  const handleTimestampClick = useCallback((timestamp: string) => {
    const ctx = floatingCtxRef.current;
    if (!ctx) return;

    const seconds = timestampToSeconds(timestamp);
    // Pass false for autoPlay - video should pause at the timestamp so user can press play
    ctx.showFloatingVideoAtTime(seconds, false);
  }, []);

  // Handle feature thumbnail clicks - seek floating video to timestamp
  const handleFeatureThumbnailClick = useCallback((timestampSeconds: number) => {
    const ctx = floatingCtxRef.current;
    if (!ctx) return;

    // Show floating video and seek to the timestamp (paused)
    ctx.showFloatingVideoAtTime(timestampSeconds, false);
  }, []);

  // Memoize markdown components to prevent recreating them on every render
  // This prevents flickering when hovering over links/collapsible sections during streaming
  const markdownComponents = useMemo(
    () => createMarkdownComponents(handleTermClick, handleMetricClick, highlightingPrefs, handleCoordinateClick, onBallSequenceClick, handleCourtZoneClick, handleTimestampClick, features, videoElement, fps, handleFeatureThumbnailClick),
    [handleTermClick, handleMetricClick, highlightingPrefs, handleCoordinateClick, onBallSequenceClick, handleCourtZoneClick, handleTimestampClick, features, videoElement, fps, handleFeatureThumbnailClick]
  );

  // Filter out Context & Environment Analysis section when not in developer mode
  const processedContent = useMemo(() => {
    if (developerMode) {
      return children;
    }
    // Remove the Context & Environment Analysis collapsible section
    // Matches: <details>\n<summary>🔍 Context & Environment Analysis</summary>\n...\n</details>
    const contextSectionRegex = /<details>\s*<summary>\s*🔍\s*Context\s*&?\s*Environment\s*Analysis\s*<\/summary>[\s\S]*?<\/details>/gi;
    return children.replace(contextSectionRegex, '').trim();
  }, [children, developerMode]);

  // Split content into sections by horizontal rules (---)
  // Each section gets its own speaker button
  const sections = useMemo(() => {
    // Split by --- or *** or ___ (markdown horizontal rules)
    const sectionParts = processedContent.split(/\n(?:[-*_]){3,}\n/);
    return sectionParts.map((section, index) => ({
      id: index,
      content: section.trim(),
      plainText: stripMarkdownForTTS(section.trim()),
    }));
  }, [processedContent]);

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
              {ttsEnabled && messageId && section.plainText && section.plainText.length > 0 && section.plainText.length <= 5000 && showSpeakerFadeIn && (
                <div
                  className="speaker-fade-in"
                  style={{
                    position: 'absolute',
                    right: '0px',
                    top: '0%',
                    transform: 'translateY(-100%)',
                  }}
                >
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

          {/* Last section: analysis tags, speaker button and feedback buttons */}
          {index === sections.length - 1 && (
            <>
              {/* Analysis Tags (strengths and improvements) - above feedback buttons */}
              {analysisTags && !isStreaming && (
                <div style={{ marginTop: '16px' }}>
                  <AnalysisTagsDisplay tags={analysisTags} />
                </div>
              )}

              {/* Feedback buttons and speaker button row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: analysisTags && !isStreaming ? '16px' : '16px',
              }}>
                {/* Feedback buttons on the left */}
                <div>
                  {feedbackButtons}
                </div>

                {/* Speaker button on the right */}
                {ttsEnabled && messageId && section.plainText && section.plainText.length > 0 && section.plainText.length <= 5000 && showSpeakerFadeIn && (
                  <div className="speaker-fade-in">
                    <SectionSpeaker
                      sectionText={section.plainText}
                      sectionId={String(section.id)}
                      messageId={messageId}
                      onTTSUsage={onTTSUsage}
                    />
                  </div>
                )}
              </div>
            </>
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

      <CourtCoordinateModal
        open={coordinateModalOpen}
        onOpenChange={setCoordinateModalOpen}
        coordinate={selectedCoordinate}
        zone={selectedZone}
      />

      {/* Fade-in animation for speaker buttons */}
      <style jsx global>{`
        .speaker-fade-in {
          animation: speakerFadeIn 0.3s ease-in-out;
        }
        @keyframes speakerFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
