import React, { useState } from "react";
import styles from "@/styles/markdown.module.css";
import { swingExplanations, type SwingExplanation } from "@/database";

/**
 * Convert timestamp string to seconds
 * Supports formats: M:SS, MM:SS, H:MM:SS
 */
function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  
  if (parts.length === 2) {
    // M:SS or MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // H:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

/**
 * Find the most recent video element in the chat
 */
function findMostRecentVideo(): HTMLVideoElement | null {
  // Find all video elements in the chat
  const videos = document.querySelectorAll('video');
  
  // Return the last one (most recent)
  return videos.length > 0 ? videos[videos.length - 1] : null;
}

/**
 * Jump to timestamp in the most recent video
 */
function jumpToTimestamp(timestamp: string) {
  const video = findMostRecentVideo();
  
  if (!video) {
    console.warn('No video found in chat');
    return;
  }
  
  const seconds = timestampToSeconds(timestamp);
  
  // Jump to the timestamp
  video.currentTime = seconds;
  
  // Set playback speed to 0.25x (slow motion)
  video.playbackRate = 0.25;
  
  // Play the video at slow motion
  video.play().catch(error => {
    console.warn('Could not autoplay video:', error);
  });
  
  // Scroll the video into view
  video.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Process text content to detect and highlight metrics (speeds, angles, times, distances)
 */
function processTextWithMetrics(text: string): React.ReactNode[] {
  // Pattern to match sports metrics:
  // - Speeds: 23 mph, 45.5 km/h, 120 kph
  // - Angles: 45°, 90 degrees
  // - Times: 2.5 seconds, 1.2s, 500ms, 3.4 sec
  // - Distances: 10 meters, 5.5m, 20 feet, 15ft, 30 yards
  // - Percentages: 85%, 92.5%
  // - Clock positions: 10 o'clock, 2 o'clock
  const metricPattern = /\b(\d+\.?\d*)\s*(mph|km\/h|kph|°|degrees?|seconds?|sec|ms|milliseconds?|meters?|m|feet|ft|yards?|yd|%|o'clock)\b/gi;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = metricPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the metric as a highlighted span
    const metric = match[0];
    parts.push(
      <span
        key={`metric-${match.index}`}
        className={styles.metricHighlight}
      >
        {metric}
      </span>
    );
    
    lastIndex = match.index + metric.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Process text content to detect and linkify timestamps
 */
function processTextWithTimestamps(text: string): React.ReactNode[] {
  // Pattern to match timestamps: M:SS, MM:SS, or H:MM:SS
  const timestampPattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = timestampPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the timestamp as a clickable link
    const timestamp = match[0];
    parts.push(
      <a
        key={`timestamp-${match.index}`}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          jumpToTimestamp(timestamp);
        }}
        className={styles.timestampLink}
        title="Click to jump to this timestamp in the video"
      >
        {timestamp}
      </a>
    );
    
    lastIndex = match.index + timestamp.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Process text with both timestamps, metrics, and swing types
 */
function processTextWithTimestampsAndMetrics(
  text: string,
  onSwingClick?: (swing: SwingExplanation) => void,
  onMetricClick?: (value: number, unit: string, originalText: string) => void
): React.ReactNode[] {
  // Timestamps take precedence (they are clickable)
  const timestampPattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
  // Compound clock positions like "10 or 2 o'clock" (processed before single metrics to avoid partial matches)
  const compoundClockPattern = /\b(\d+)\s+or\s+(\d+)\s+o'clock\b/gi;
  // Regular metrics including single clock positions like "2 o'clock"
  const metricPattern = /\b(\d+\.?\d*)\s*(mph|km\/h|kph|°|degrees?|seconds?|sec|ms|milliseconds?|meters?|m|feet|ft|yards?|yd|%|o'clock)\b/gi;
  // Swing types pattern (case-insensitive)
  const swingNames = Object.keys(swingExplanations).join('|');
  const swingPattern = new RegExp(`\\b(${swingNames})\\b`, 'gi');
  
  // Collect all matches with their types
  const matches: Array<{ 
    index: number; 
    length: number; 
    text: string; 
    type: 'timestamp' | 'metric' | 'swing';
    value?: number;
    unit?: string;
  }> = [];
  
  let timestampMatch: RegExpExecArray | null;
  while ((timestampMatch = timestampPattern.exec(text)) !== null) {
    matches.push({
      index: timestampMatch.index,
      length: timestampMatch[0].length,
      text: timestampMatch[0],
      type: 'timestamp'
    });
  }
  
  // Process swing types (high priority, processed before metrics)
  let swingMatch: RegExpExecArray | null;
  while ((swingMatch = swingPattern.exec(text)) !== null) {
    const overlaps = matches.some(m => 
      m.index <= swingMatch!.index && swingMatch!.index < m.index + m.length
    );
    if (!overlaps) {
      matches.push({
        index: swingMatch.index,
        length: swingMatch[0].length,
        text: swingMatch[0],
        type: 'swing'
      });
    }
  }
  
  // Process compound clock positions (e.g., "10 or 2 o'clock")
  let compoundClockMatch: RegExpExecArray | null;
  while ((compoundClockMatch = compoundClockPattern.exec(text)) !== null) {
    const overlaps = matches.some(m => 
      m.index <= compoundClockMatch!.index && compoundClockMatch!.index < m.index + m.length
    );
    if (!overlaps) {
      matches.push({
        index: compoundClockMatch.index,
        length: compoundClockMatch[0].length,
        text: compoundClockMatch[0],
        type: 'metric'
      });
    }
  }
  
  let metricMatch: RegExpExecArray | null;
  while ((metricMatch = metricPattern.exec(text)) !== null) {
    // Check if this metric overlaps with existing matches
    const overlaps = matches.some(m => 
      m.index <= metricMatch!.index && metricMatch!.index < m.index + m.length
    );
    if (!overlaps) {
      // Extract value and unit from the match
      const value = parseFloat(metricMatch[1]);
      const unit = metricMatch[2];
      
      matches.push({
        index: metricMatch.index,
        length: metricMatch[0].length,
        text: metricMatch[0],
        type: 'metric',
        value: value,
        unit: unit
      });
    }
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  matches.forEach((matchItem) => {
    // Add text before the match
    if (matchItem.index > lastIndex) {
      parts.push(text.substring(lastIndex, matchItem.index));
    }
    
    // Add the match based on type
    if (matchItem.type === 'timestamp') {
      parts.push(
        <a
          key={`timestamp-${matchItem.index}`}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            jumpToTimestamp(matchItem.text);
          }}
          className={styles.timestampLink}
          title="Click to jump to this timestamp in the video"
        >
          {matchItem.text}
        </a>
      );
    } else if (matchItem.type === 'swing') {
      const swingKey = matchItem.text.toLowerCase();
      const swingInfo = swingExplanations[swingKey];
      parts.push(
        <button
          key={`swing-${matchItem.index}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSwingClick?.(swingInfo);
          }}
          className={styles.swingHighlight}
          title="Click to learn more about this technique"
          type="button"
        >
          {matchItem.text}
        </button>
      );
    } else {
      // Metric with conversion support
      if (matchItem.value !== undefined && matchItem.unit && onMetricClick) {
        parts.push(
          <button
            key={`metric-${matchItem.index}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMetricClick(matchItem.value!, matchItem.unit!, matchItem.text);
            }}
            className={styles.metricHighlight}
            title="Click to see conversions"
            type="button"
          >
            {matchItem.text}
          </button>
        );
      } else {
        parts.push(
          <span
            key={`metric-${matchItem.index}`}
            className={styles.metricHighlight}
          >
            {matchItem.text}
          </span>
        );
      }
    }
    
    lastIndex = matchItem.index + matchItem.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Custom text component that processes timestamps, metrics, and swings
 */
const TextWithTimestamps: React.FC<{ 
  children?: React.ReactNode;
  onSwingClick?: (swing: SwingExplanation) => void;
  onMetricClick?: (value: number, unit: string, originalText: string) => void;
}> = ({ children, onSwingClick, onMetricClick }) => {
  if (typeof children === 'string') {
    return <>{processTextWithTimestampsAndMetrics(children, onSwingClick, onMetricClick)}</>;
  }
  
  if (Array.isArray(children)) {
    return <>{children.map((child, index) => {
      if (typeof child === 'string') {
        return <React.Fragment key={index}>{processTextWithTimestampsAndMetrics(child, onSwingClick, onMetricClick)}</React.Fragment>;
      }
      return <React.Fragment key={index}>{child}</React.Fragment>;
    })}</>;
  }
  
  return <>{children}</>;
};

// Factory function to create markdown components with swing and metric click handlers
export const createMarkdownComponents = (
  onSwingClick?: (swing: SwingExplanation) => void,
  onMetricClick?: (value: number, unit: string, originalText: string) => void
) => ({
  h1: ({ node, ...props }: any) => (
    <h1
      className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100"
      {...props}
    />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100"
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100"
      {...props}
    />
  ),
  p: ({ node, children, ...props }: any) => (
    <p
      className="mb-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed"
      {...props}
    >
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick}>{children}</TextWithTimestamps>
    </p>
  ),
  ul: ({ node, ...props }: any) => (
    <ul
      className="markdown-ul mb-4 text-base text-gray-700 dark:text-gray-300"
      style={{ listStyle: "none" }}
      {...props}
    />
  ),
  ol: ({ node, ...props }: any) => (
    <ol
      className="markdown-ol mb-4 text-base text-gray-700 dark:text-gray-300"
      style={{ listStyle: "none", counterReset: "markdown-counter" }}
      {...props}
    />
  ),
  li: ({ node, children, ...props }: any) => (
    <li
      className="markdown-li"
      {...props}
    >
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick}>{children}</TextWithTimestamps>
    </li>
  ),
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code
        className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-base font-mono"
        {...props}
      />
    ) : (
      <code
        className="block p-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-base font-mono overflow-x-auto mb-4"
        {...props}
      />
    ),
  pre: ({ node, ...props }: any) => (
    <pre className="mb-4 overflow-x-auto" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400"
      {...props}
    />
  ),
  strong: ({ node, children, ...props }: any) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick}>{children}</TextWithTimestamps>
    </strong>
  ),
  em: ({ node, children, ...props }: any) => (
    <em className="italic" {...props}>
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick}>{children}</TextWithTimestamps>
    </em>
  ),
  a: ({ node, ...props }: any) => (
    <a
      className="text-blue-600 dark:text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
        {...props}
      />
    </div>
  ),
  th: ({ node, ...props }: any) => (
    <th
      className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left"
      {...props}
    />
  ),
  td: ({ node, ...props }: any) => (
    <td
      className="border border-gray-300 dark:border-gray-600 px-4 py-2"
      {...props}
    />
  ),
  hr: ({ node, ...props }: any) => (
    <div className="markdown-divider" role="separator" aria-label="Section divider">
      <div className="markdown-divider-line" />
      <span className="markdown-divider-dots" aria-hidden="true">
        •••
      </span>
      <div className="markdown-divider-line" />
    </div>
  ),
  details: ({ node, ...props }: any) => (
    <details
      className={styles.collapsibleSection}
      {...props}
    />
  ),
  summary: ({ node, ...props }: any) => (
    <summary
      className={styles.collapsibleSummary}
      {...props}
    />
  ),
});

// Default export without swing click handler for backward compatibility
export const markdownComponents = createMarkdownComponents();

