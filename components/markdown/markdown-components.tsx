import React, { useState } from "react";
import { Tooltip } from "@radix-ui/themes";
import { logger } from "@/lib/logger";
import styles from "@/styles/markdown.module.css";
import buttonStyles from "@/styles/buttons.module.css";
import { 
  swingExplanations, 
  type SwingExplanation,
  sharedSwings,
  tennisSwings,
  pickleballSwings,
  padelSwings,
  sharedTerminology,
  tennisTerminology,
  pickleballTerminology,
  padelTerminology,
  tennisCourts,
  pickleballCourts,
  padelCourts,
  sharedTechnique,
} from "@/database";
import type { HighlightingPreferences } from "@/utils/storage";
import type { CourtCoordinate, BallSequenceClick, BallSequenceType, CourtZone } from "./CourtCoordinateModal";
import { COURT_ZONE_DEFINITIONS } from "./CourtCoordinateModal";

// Court grid constants for validation
const GRID_COLS = 12;
const GRID_ROWS = 6;

// Ball sequence term mappings
const BALL_SEQUENCE_TERMS: Record<string, { type: BallSequenceType; label: string }> = {
  'serve': { type: 'serve', label: 'Serve' },
  'serves': { type: 'serve', label: 'Serve' },
  'service': { type: 'serve', label: 'Serve' },
  '1st ball': { type: 'serve', label: 'Serve' },
  '1st balls': { type: 'serve', label: 'Serve' },
  'first ball': { type: 'serve', label: 'Serve' },
  'first balls': { type: 'serve', label: 'Serve' },
  'return': { type: 'return', label: 'Return' },
  'returns': { type: 'return', label: 'Return' },
  '2nd ball': { type: 'return', label: 'Return' },
  '2nd balls': { type: 'return', label: 'Return' },
  'second ball': { type: 'return', label: 'Return' },
  'second balls': { type: 'return', label: 'Return' },
  'third ball': { type: 'third-ball', label: 'Third Ball' },
  'third balls': { type: 'third-ball', label: 'Third Ball' },
  '3rd ball': { type: 'third-ball', label: 'Third Ball' },
  '3rd balls': { type: 'third-ball', label: 'Third Ball' },
  'fourth ball': { type: 'fourth-ball', label: 'Fourth Ball' },
  'fourth balls': { type: 'fourth-ball', label: 'Fourth Ball' },
  '4th ball': { type: 'fourth-ball', label: 'Fourth Ball' },
  '4th balls': { type: 'fourth-ball', label: 'Fourth Ball' },
  'fifth ball': { type: 'fifth-ball', label: 'Fifth Ball' },
  'fifth balls': { type: 'fifth-ball', label: 'Fifth Ball' },
  '5th ball': { type: 'fifth-ball', label: 'Fifth Ball' },
  '5th balls': { type: 'fifth-ball', label: 'Fifth Ball' },
};

// Court position terms to highlight (shot directions and zones)
const COURT_POSITION_TERMS = [
  // Shot directions
  'down-the-line',
  'down the line',
  'cross-court',
  'cross court',
  'crosscourt',
  // Side positions
  'far-side right',
  'far-side left',
  'far-side center',
  'far-side centre',
  'near-side right',
  'near-side left', 
  'near-side center',
  'near-side centre',
  'far side right',
  'far side left',
  'far side center',
  'far side centre',
  'near side right',
  'near side left',
  'near side center',
  'near side centre',
  // Padel court zones
  'service box',
  'service boxes',
  'receiving box',
  'receiving boxes',
  'net area',
  'net zone',
  'mid-court',
  'mid-court zone',
  'midcourt',
  'back of the court',
  'back court',
  'backcourt',
  'side walls',
  'side wall',
  'sidewall',
  'sidewalls',
  'corners',
  'corner',
  'back glass',
  'back wall',
  'backwall',
];

/**
 * Find the nearest player reference by looking backwards in text from a given position
 */
function findPlayerContext(text: string, position: number): string | undefined {
  // Look at the text before this position
  const textBefore = text.substring(0, position);
  
  // Pattern to find "Player X" or "Player #X" references
  const playerPattern = /Player\s*#?\s*(\d+)/gi;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  
  while ((match = playerPattern.exec(textBefore)) !== null) {
    lastMatch = match;
  }
  
  if (lastMatch) {
    return `Player ${lastMatch[1]}`;
  }
  
  return undefined;
}

/**
 * Categorize swing explanations by type
 */
const swingsByType = {
  swings: { ...sharedSwings, ...tennisSwings, ...pickleballSwings, ...padelSwings },
  terminology: { 
    ...sharedTerminology, 
    ...tennisTerminology, 
    ...pickleballTerminology, 
    ...padelTerminology,
    ...tennisCourts,
    ...pickleballCourts,
    ...padelCourts,
  },
  technique: { ...sharedTechnique },
};

/**
 * Get the category of a term
 */
function getTermCategory(term: string): 'swing' | 'terminology' | 'technique' | null {
  const lowerTerm = term.toLowerCase();
  
  if (swingsByType.swings[lowerTerm]) return 'swing';
  if (swingsByType.terminology[lowerTerm]) return 'terminology';
  if (swingsByType.technique[lowerTerm]) return 'technique';
  
  return null;
}

/**
 * Convert timestamp string to seconds
 * Supports formats: M:SS, MM:SS, H:MM:SS
 */
export function timestampToSeconds(timestamp: string): number {
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
    logger.warn('No video found in chat');
    return;
  }
  
  const seconds = timestampToSeconds(timestamp);
  
  // Jump to the timestamp
  video.currentTime = seconds;
  
  // Set playback speed to 0.25x (slow motion)
  video.playbackRate = 0.25;
  
  // Play the video at slow motion
  video.play().catch(error => {
    logger.warn('Could not autoplay video:', error);
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
      <Tooltip key={`timestamp-${match.index}`} content="Click to jump to this timestamp in the video">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            jumpToTimestamp(timestamp);
          }}
          className={styles.timestampLink}
        >
          {timestamp}
        </a>
      </Tooltip>
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
 * Process text with timestamps, metrics, swing types, court coordinates, ball sequences, and court zones
 */
function processTextWithTimestampsAndMetrics(
  text: string,
  onSwingClick?: (swing: SwingExplanation) => void,
  onMetricClick?: (value: number, unit: string, originalText: string) => void,
  highlightingPrefs?: HighlightingPreferences,
  onCoordinateClick?: (coordinate: CourtCoordinate) => void,
  onBallSequenceClick?: (ballSequence: BallSequenceClick) => void,
  onCourtZoneClick?: (zone: CourtZone) => void,
  onTimestampClick?: (timestamp: string) => void
): React.ReactNode[] {
  // Default to all enabled if not provided
  const prefs = highlightingPrefs || {
    terminology: true,
    technique: true,
    timestamps: true,
    swings: true,
  };
  // Only process patterns if their corresponding preference is enabled
  const timestampPattern = prefs.timestamps ? /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g : null;
  // Compound clock positions like "10 or 2 o'clock" (processed before single metrics to avoid partial matches)
  const compoundClockPattern = /\b(\d+)\s+or\s+(\d+)\s+o'clock\b/gi;
  // Regular metrics including single clock positions like "2 o'clock"
  const metricPattern = /\b(\d+\.?\d*)\s*(mph|km\/h|kph|°|degrees?|seconds?|sec|ms|milliseconds?|meters?|m|feet|ft|yards?|yd|%|o'clock)\b/gi;
  
  // Build swing types pattern based on enabled preferences
  let enabledSwingNames: string[] = [];
  if (prefs.swings) {
    enabledSwingNames.push(...Object.keys(swingsByType.swings));
  }
  if (prefs.terminology) {
    enabledSwingNames.push(...Object.keys(swingsByType.terminology));
  }
  if (prefs.technique) {
    enabledSwingNames.push(...Object.keys(swingsByType.technique));
  }
  
  const swingPattern = enabledSwingNames.length > 0 
    ? new RegExp(`\\b(${enabledSwingNames.join('|')})\\b`, 'gi')
    : null;
  
  // Pattern to match court coordinates in various formats:
  // (col, row), Grid (col, row), (Grid col,row), Grid col,row, grids col,row and col,row
  // Examples: (1, 0), Grid (5, 3), (Grid 10,0), Grid 10,0, (grids 0,3 and 0,5)
  const coordinatePattern = /(?:Grids?\s*\((?:Grids?\s*)?|\((?:Grids?\s*)?|Grids?\s+|and\s+)(\d{1,2})\s*,\s*(\d)\)?/gi;
  
  // Pattern to match ball sequence terms (always detect for highlighting, clickable when handler provided)
  const ballSequenceTerms = Object.keys(BALL_SEQUENCE_TERMS).join('|');
  const ballSequencePattern = new RegExp(`\\b(${ballSequenceTerms})\\b`, 'gi');
  
  // Pattern to match court position terms (sorted by length desc to match longer phrases first)
  const sortedCourtTerms = [...COURT_POSITION_TERMS].sort((a, b) => b.length - a.length);
  const courtPositionPattern = new RegExp(`\\b(${sortedCourtTerms.map(t => t.replace(/-/g, '[-\\s]?')).join('|')})\\b`, 'gi');
  
  // Collect all matches with their types
  const matches: Array<{ 
    index: number; 
    length: number; 
    text: string; 
    type: 'timestamp' | 'metric' | 'swing' | 'coordinate' | 'ballSequence' | 'courtPosition';
    value?: number;
    unit?: string;
    category?: 'swing' | 'terminology' | 'technique';
    coordinate?: CourtCoordinate;
    ballSequence?: BallSequenceClick;
    courtZone?: CourtZone;
  }> = [];
  
  // Only process timestamps if enabled
  if (timestampPattern) {
    let timestampMatch: RegExpExecArray | null;
    while ((timestampMatch = timestampPattern.exec(text)) !== null) {
      matches.push({
        index: timestampMatch.index,
        length: timestampMatch[0].length,
        text: timestampMatch[0],
        type: 'timestamp'
      });
    }
  }
  
  // Process swing types (high priority, processed before metrics) - only if any category is enabled
  if (swingPattern) {
    let swingMatch: RegExpExecArray | null;
    while ((swingMatch = swingPattern.exec(text)) !== null) {
      const overlaps = matches.some(m => 
        m.index <= swingMatch!.index && swingMatch!.index < m.index + m.length
      );
      if (!overlaps) {
        const category = getTermCategory(swingMatch[0]);
        // Only add if the category is enabled
        const shouldAdd = 
          (category === 'swing' && prefs.swings) ||
          (category === 'terminology' && prefs.terminology) ||
          (category === 'technique' && prefs.technique);
        
        if (shouldAdd && category) {
          matches.push({
            index: swingMatch.index,
            length: swingMatch[0].length,
            text: swingMatch[0],
            type: 'swing',
            category: category
          });
        }
      }
    }
  }
  
  // Process court coordinates (e.g., "(1, 0)", "Grid (5, 3)")
  if (onCoordinateClick) {
    let coordinateMatch: RegExpExecArray | null;
    while ((coordinateMatch = coordinatePattern.exec(text)) !== null) {
      const col = parseInt(coordinateMatch[1], 10);
      const row = parseInt(coordinateMatch[2], 10);
      
      // Only add if within valid grid bounds
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        const overlaps = matches.some(m => 
          m.index <= coordinateMatch!.index && coordinateMatch!.index < m.index + m.length
        );
        if (!overlaps) {
          // Find player context by looking backwards in text
          const playerContext = findPlayerContext(text, coordinateMatch.index);
          
          matches.push({
            index: coordinateMatch.index,
            length: coordinateMatch[0].length,
            text: coordinateMatch[0],
            type: 'coordinate',
            coordinate: { col, row, playerContext }
          });
        }
      }
    }
  }
  
  // Process ball sequence terms (e.g., "serve", "third ball") - always detect, clickable when handler provided
  let ballMatch: RegExpExecArray | null;
  while ((ballMatch = ballSequencePattern.exec(text)) !== null) {
    const overlaps = matches.some(m => 
      m.index <= ballMatch!.index && ballMatch!.index < m.index + m.length
    );
    if (!overlaps) {
      const termKey = ballMatch[0].toLowerCase();
      const termInfo = BALL_SEQUENCE_TERMS[termKey];
      if (termInfo) {
        // Find player context
        const playerContext = findPlayerContext(text, ballMatch.index);
        
        matches.push({
          index: ballMatch.index,
          length: ballMatch[0].length,
          text: ballMatch[0],
          type: 'ballSequence',
          ballSequence: {
            ballType: termInfo.type,
            ballLabel: termInfo.label,
            playerContext
          }
        });
      }
    }
  }
  
  // Process court position terms (e.g., "down-the-line", "far-side right")
  let courtMatch: RegExpExecArray | null;
  while ((courtMatch = courtPositionPattern.exec(text)) !== null) {
    const overlaps = matches.some(m => 
      m.index <= courtMatch!.index && courtMatch!.index < m.index + m.length
    );
    if (!overlaps) {
      // Normalize the matched term to find the zone definition
      const normalizedTerm = courtMatch[0].toLowerCase().replace(/\s+/g, '-').replace(/--+/g, '-');
      // Try to find zone by various key formats
      const zone = COURT_ZONE_DEFINITIONS[normalizedTerm] 
        || COURT_ZONE_DEFINITIONS[normalizedTerm.replace(/-/g, ' ')]
        || COURT_ZONE_DEFINITIONS[courtMatch[0].toLowerCase()];
      
      matches.push({
        index: courtMatch.index,
        length: courtMatch[0].length,
        text: courtMatch[0],
        type: 'courtPosition',
        courtZone: zone
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
        <Tooltip key={`timestamp-${matchItem.index}`} content="Click to jump to this timestamp in the video">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onTimestampClick) {
                onTimestampClick(matchItem.text);
              } else {
                jumpToTimestamp(matchItem.text);
              }
            }}
            className={styles.timestampLink}
          >
            {matchItem.text}
          </a>
        </Tooltip>
      );
    } else if (matchItem.type === 'swing') {
      const swingKey = matchItem.text.toLowerCase();
      const swingInfo = swingExplanations[swingKey];
      parts.push(
        <Tooltip key={`swing-${matchItem.index}`} content="Click to learn more about this technique">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSwingClick?.(swingInfo);
            }}
            className={styles.swingHighlight}
            type="button"
          >
            {matchItem.text}
          </button>
        </Tooltip>
      );
    } else if (matchItem.type === 'coordinate' && matchItem.coordinate && onCoordinateClick) {
      const tooltipContent = matchItem.coordinate.playerContext 
        ? `Click to see court position (${matchItem.coordinate.playerContext})`
        : "Click to see court position";
      parts.push(
        <Tooltip key={`coord-${matchItem.index}`} content={tooltipContent}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCoordinateClick(matchItem.coordinate!);
            }}
            className={styles.coordinateHighlight}
            type="button"
          >
            {matchItem.text}
          </button>
        </Tooltip>
      );
    } else if (matchItem.type === 'ballSequence' && matchItem.ballSequence) {
      // If handler provided, make clickable with tooltip; otherwise just highlight
      if (onBallSequenceClick) {
        const tooltipContent = matchItem.ballSequence.playerContext
          ? `Go to ${matchItem.ballSequence.ballLabel} tab (${matchItem.ballSequence.playerContext})`
          : `Go to ${matchItem.ballSequence.ballLabel} tab`;
        parts.push(
          <Tooltip key={`ball-${matchItem.index}`} content={tooltipContent}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBallSequenceClick(matchItem.ballSequence!);
              }}
              className={styles.ballSequenceHighlight}
              type="button"
            >
              {matchItem.text}
            </button>
          </Tooltip>
        );
      } else {
        // Just highlight without click functionality
        parts.push(
          <span
            key={`ball-${matchItem.index}`}
            className={styles.ballSequenceHighlight}
          >
            {matchItem.text}
          </span>
        );
      }
    } else if (matchItem.type === 'courtPosition') {
      if (matchItem.courtZone && onCourtZoneClick) {
        parts.push(
          <Tooltip key={`court-${matchItem.index}`} content={`Click to see ${matchItem.courtZone.name} on court`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCourtZoneClick(matchItem.courtZone!);
              }}
              className={styles.courtPositionHighlight}
              type="button"
              style={{ cursor: 'pointer' }}
            >
              {matchItem.text}
            </button>
          </Tooltip>
        );
      } else {
        parts.push(
          <span
            key={`court-${matchItem.index}`}
            className={styles.courtPositionHighlight}
          >
            {matchItem.text}
          </span>
        );
      }
    } else {
      // Metric with conversion support
      if (matchItem.value !== undefined && matchItem.unit && onMetricClick) {
        parts.push(
          <Tooltip key={`metric-${matchItem.index}`} content="Click to see conversions">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMetricClick(matchItem.value!, matchItem.unit!, matchItem.text);
              }}
              className={styles.metricHighlight}
              type="button"
            >
              {matchItem.text}
            </button>
          </Tooltip>
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
 * Custom text component that processes timestamps, metrics, swings, coordinates, ball sequences, and court zones
 */
const TextWithTimestamps: React.FC<{ 
  children?: React.ReactNode;
  onSwingClick?: (swing: SwingExplanation) => void;
  onMetricClick?: (value: number, unit: string, originalText: string) => void;
  highlightingPrefs?: HighlightingPreferences;
  onCoordinateClick?: (coordinate: CourtCoordinate) => void;
  onBallSequenceClick?: (ballSequence: BallSequenceClick) => void;
  onCourtZoneClick?: (zone: CourtZone) => void;
  onTimestampClick?: (timestamp: string) => void;
}> = ({ children, onSwingClick, onMetricClick, highlightingPrefs, onCoordinateClick, onBallSequenceClick, onCourtZoneClick, onTimestampClick }) => {
  if (typeof children === 'string') {
    return <>{processTextWithTimestampsAndMetrics(children, onSwingClick, onMetricClick, highlightingPrefs, onCoordinateClick, onBallSequenceClick, onCourtZoneClick, onTimestampClick)}</>;
  }
  
  if (Array.isArray(children)) {
    return <>{children.map((child, index) => {
      if (typeof child === 'string') {
        return <React.Fragment key={index}>{processTextWithTimestampsAndMetrics(child, onSwingClick, onMetricClick, highlightingPrefs, onCoordinateClick, onBallSequenceClick, onCourtZoneClick, onTimestampClick)}</React.Fragment>;
      }
      return <React.Fragment key={index}>{child}</React.Fragment>;
    })}</>;
  }
  
  return <>{children}</>;
};

// Factory function to create markdown components with swing, metric, coordinate, ball sequence, court zone, and timestamp click handlers
export const createMarkdownComponents = (
  onSwingClick?: (swing: SwingExplanation) => void,
  onMetricClick?: (value: number, unit: string, originalText: string) => void,
  highlightingPrefs?: HighlightingPreferences,
  onCoordinateClick?: (coordinate: CourtCoordinate) => void,
  onBallSequenceClick?: (ballSequence: BallSequenceClick) => void,
  onCourtZoneClick?: (zone: CourtZone) => void,
  onTimestampClick?: (timestamp: string) => void
) => ({
  h1: ({ node, ...props }: any) => (
    <h1
      className="text-2xl font-bold mt-6 mb-4"
      style={{ color: "var(--gray-12)" }}
      {...props}
    />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      className="text-xl font-bold mt-5 mb-3"
      style={{ color: "var(--gray-12)" }}
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="text-lg font-semibold mt-4 mb-2"
      style={{ color: "var(--gray-12)" }}
      {...props}
    />
  ),
  p: ({ node, children, ...props }: any) => (
    <p
      className="mb-4 text-base leading-relaxed"
      style={{ color: "var(--gray-12)" }}
      {...props}
    >
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick} highlightingPrefs={highlightingPrefs} onCoordinateClick={onCoordinateClick} onBallSequenceClick={onBallSequenceClick} onCourtZoneClick={onCourtZoneClick} onTimestampClick={onTimestampClick}>{children}</TextWithTimestamps>
    </p>
  ),
  ul: ({ node, ...props }: any) => (
    <ul
      className="markdown-ul mb-4 text-base"
      style={{ listStyle: "none", color: "var(--gray-12)" }}
      {...props}
    />
  ),
  ol: ({ node, ...props }: any) => (
    <ol
      className="markdown-ol mb-4 text-base"
      style={{ listStyle: "none", counterReset: "markdown-counter", color: "var(--gray-12)" }}
      {...props}
    />
  ),
  li: ({ node, children, ...props }: any) => (
    <li
      className="markdown-li"
      {...props}
    >
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick} highlightingPrefs={highlightingPrefs} onCoordinateClick={onCoordinateClick} onBallSequenceClick={onBallSequenceClick} onCourtZoneClick={onCourtZoneClick} onTimestampClick={onTimestampClick}>{children}</TextWithTimestamps>
    </li>
  ),
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code
        className="px-1.5 py-0.5 rounded text-base font-mono"
        style={{ backgroundColor: "var(--gray-3)", color: "var(--gray-12)" }}
        {...props}
      />
    ) : (
      <code
        className="block p-4 rounded-lg text-base font-mono overflow-x-auto mb-4"
        style={{ backgroundColor: "var(--gray-3)", color: "var(--gray-12)" }}
        {...props}
      />
    ),
  pre: ({ node, ...props }: any) => (
    <pre className="mb-4 overflow-x-auto" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 pl-4 italic my-4"
      style={{ borderColor: "var(--mint-6)", color: "var(--gray-11)" }}
      {...props}
    />
  ),
  strong: ({ node, children, ...props }: any) => (
    <strong className="font-semibold" style={{ color: "var(--gray-12)" }} {...props}>
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick} highlightingPrefs={highlightingPrefs} onCoordinateClick={onCoordinateClick} onBallSequenceClick={onBallSequenceClick} onCourtZoneClick={onCourtZoneClick} onTimestampClick={onTimestampClick}>{children}</TextWithTimestamps>
    </strong>
  ),
  em: ({ node, children, ...props }: any) => (
    <em className="italic" {...props}>
      <TextWithTimestamps onSwingClick={onSwingClick} onMetricClick={onMetricClick} highlightingPrefs={highlightingPrefs} onCoordinateClick={onCoordinateClick} onBallSequenceClick={onBallSequenceClick} onCourtZoneClick={onCourtZoneClick} onTimestampClick={onTimestampClick}>{children}</TextWithTimestamps>
    </em>
  ),
  a: ({ node, href, children, ...props }: any) => {
    // Check if this is a PRO-related link that should be styled as a button
    const isProLink = href && (
      href.includes('/pricing') || 
      href.includes('/contact') || 
      href.includes('sportai.com/contact') ||
      (typeof children === 'string' && children.toLowerCase().includes('pro'))
    );
    
    if (isProLink) {
      return (
        <a
          href="https://sportai.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles.actionButton}
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            textDecoration: 'none',
            fontSize: '14px',
            marginTop: '8px',
          }}
          {...props}
        >
          Contact us for PRO
        </a>
      );
    }
    
    return (
      <a
        href={href}
        className="hover:underline"
        style={{ color: "var(--mint-11)" }}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border-collapse"
        style={{ border: "1px solid var(--gray-6)" }}
        {...props}
      />
    </div>
  ),
  th: ({ node, ...props }: any) => (
    <th
      className="px-4 py-2 font-semibold text-left"
      style={{ border: "1px solid var(--gray-6)", backgroundColor: "var(--gray-3)", color: "var(--gray-12)" }}
      {...props}
    />
  ),
  td: ({ node, ...props }: any) => (
    <td
      className="px-4 py-2"
      style={{ border: "1px solid var(--gray-6)", color: "var(--gray-12)" }}
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

