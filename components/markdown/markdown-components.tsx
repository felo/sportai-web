import React from "react";

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
        className="timestamp-link"
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
 * Custom text component that processes timestamps
 */
const TextWithTimestamps: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  if (typeof children === 'string') {
    return <>{processTextWithTimestamps(children)}</>;
  }
  
  if (Array.isArray(children)) {
    return <>{children.map((child, index) => {
      if (typeof child === 'string') {
        return <React.Fragment key={index}>{processTextWithTimestamps(child)}</React.Fragment>;
      }
      return <React.Fragment key={index}>{child}</React.Fragment>;
    })}</>;
  }
  
  return <>{children}</>;
};

export const markdownComponents = {
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
      <TextWithTimestamps>{children}</TextWithTimestamps>
    </p>
  ),
  ul: ({ node, ...props }: any) => (
    <ul
      className="list-disc list-inside mb-4 space-y-2 text-base text-gray-700 dark:text-gray-300"
      {...props}
    />
  ),
  ol: ({ node, ...props }: any) => (
    <ol
      className="list-decimal list-inside mb-4 space-y-2 text-base text-gray-700 dark:text-gray-300"
      {...props}
    />
  ),
  li: ({ node, children, ...props }: any) => (
    <li className="ml-4 mb-1" {...props}>
      <TextWithTimestamps>{children}</TextWithTimestamps>
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
      <TextWithTimestamps>{children}</TextWithTimestamps>
    </strong>
  ),
  em: ({ node, children, ...props }: any) => (
    <em className="italic" {...props}>
      <TextWithTimestamps>{children}</TextWithTimestamps>
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
    <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
  ),
  details: ({ node, ...props }: any) => (
    <details
      className="collapsible-section"
      {...props}
    />
  ),
  summary: ({ node, ...props }: any) => (
    <summary
      className="collapsible-summary"
      {...props}
    />
  ),
};

