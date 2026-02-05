/**
 * LLM Error Mapper
 *
 * Converts raw LLM/AI service errors into user-friendly messages.
 * Removes all technical details (API names, status codes, service names)
 * and provides actionable guidance based on error type.
 */

import { logger } from "./logger";

/**
 * Error categories for mapping
 */
export type ErrorCategory =
  | "rate_limit"
  | "timeout"
  | "server_error"
  | "bad_request"
  | "auth_error"
  | "content_policy"
  | "video_processing"
  | "conversation_error"
  | "generic";

/**
 * User-friendly error messages by category
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  rate_limit: "We're experiencing high demand. Please wait a moment and try again.",
  timeout: "The request took too long to process. Please try again with a shorter video or simpler question.",
  server_error: "Something went wrong on our end. Please try again in a few moments.",
  bad_request: "There was an issue with your request. Please check your input and try again.",
  auth_error: "There was an authentication issue. Please refresh the page and try again.",
  content_policy: "Your content couldn't be processed. Please try a different video or question.",
  video_processing: "There was an issue processing your video. Try: (1) Using a shorter clip, (2) Compressing the video, or (3) Switching to 'Low' media resolution in settings.",
  conversation_error: "Something went wrong with the conversation. Please try again.",
  generic: "Something unexpected happened. Please try again.",
};

/**
 * Patterns to detect specific error types from error messages
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp | string; category: ErrorCategory }> = [
  // Rate limiting
  { pattern: /rate.?limit/i, category: "rate_limit" },
  { pattern: /too many requests/i, category: "rate_limit" },
  { pattern: /quota/i, category: "rate_limit" },
  
  // Timeout
  { pattern: /timed?.?out/i, category: "timeout" },
  { pattern: /timeout/i, category: "timeout" },
  { pattern: /deadline/i, category: "timeout" },
  
  // Content policy / safety
  { pattern: /content.?policy/i, category: "content_policy" },
  { pattern: /safety/i, category: "content_policy" },
  { pattern: /blocked/i, category: "content_policy" },
  { pattern: /harmful/i, category: "content_policy" },
  { pattern: /inappropriate/i, category: "content_policy" },
  
  // Conversation errors
  { pattern: /first content should be with role/i, category: "conversation_error" },
  { pattern: /conversation/i, category: "conversation_error" },
  
  // Authentication
  { pattern: /unauthorized/i, category: "auth_error" },
  { pattern: /authentication/i, category: "auth_error" },
  { pattern: /api.?key/i, category: "auth_error" },
  { pattern: /permission/i, category: "auth_error" },
  
  // Bad request
  { pattern: /invalid/i, category: "bad_request" },
  { pattern: /malformed/i, category: "bad_request" },
];

/**
 * HTTP status codes to error categories
 */
const STATUS_CODE_MAPPING: Record<number, ErrorCategory> = {
  400: "bad_request",
  401: "auth_error",
  403: "auth_error",
  408: "timeout",
  429: "rate_limit",
  500: "server_error",
  502: "server_error",
  503: "server_error",
  504: "timeout",
};

/**
 * Options for error mapping
 */
export interface MapErrorOptions {
  /** HTTP status code if available */
  status?: number;
  /** HTTP status text if available */
  statusText?: string;
  /** Whether the request involved video processing */
  hasVideo?: boolean;
  /** Request ID for logging */
  requestId?: string;
}

/**
 * Detects the error category from an error object
 */
function detectErrorCategory(
  error: unknown,
  options: MapErrorOptions = {}
): ErrorCategory {
  const { status, statusText, hasVideo } = options;
  
  // Check status code first
  if (status && STATUS_CODE_MAPPING[status]) {
    // For server errors with video, use video_processing category
    if (status === 500 && hasVideo) {
      return "video_processing";
    }
    return STATUS_CODE_MAPPING[status];
  }
  
  // Check status text
  if (statusText === "Internal Server Error") {
    return hasVideo ? "video_processing" : "server_error";
  }
  
  // Get error message
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === "string" 
      ? error 
      : String(error);
  
  // Check for pattern matches
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (typeof pattern === "string") {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return category;
      }
    } else if (pattern.test(errorMessage)) {
      return category;
    }
  }
  
  // Check for Google/Gemini specific errors (these should be genericized)
  if (errorMessage.includes("[GoogleGenerativeAI Error]")) {
    // Check for specific sub-patterns within Google errors
    for (const { pattern, category } of ERROR_PATTERNS) {
      if (typeof pattern === "string") {
        if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
          return category;
        }
      } else if (pattern.test(errorMessage)) {
        return category;
      }
    }
    return "server_error";
  }
  
  // Default to generic
  return "generic";
}

/**
 * Maps a raw error to a user-friendly message.
 * 
 * This function:
 * 1. Logs the full technical error for debugging (server-side)
 * 2. Categorizes the error based on patterns and status codes
 * 3. Returns a user-friendly message without technical details
 * 
 * @param error - The raw error object
 * @param options - Additional context for error mapping
 * @returns A user-friendly error message
 */
export function mapErrorToUserFriendly(
  error: unknown,
  options: MapErrorOptions = {}
): string {
  const { requestId } = options;
  
  // Log the full error for debugging (only on server)
  if (requestId) {
    logger.debug(`[${requestId}] Mapping error to user-friendly message:`, {
      originalError: error instanceof Error ? error.message : String(error),
      status: options.status,
      statusText: options.statusText,
      hasVideo: options.hasVideo,
    });
  }
  
  // Detect category and return user-friendly message
  const category = detectErrorCategory(error, options);
  
  if (requestId) {
    logger.debug(`[${requestId}] Error category: ${category}`);
  }
  
  return USER_FRIENDLY_MESSAGES[category];
}

/**
 * Creates a user-friendly Error object from a raw error.
 * Use this when you need to throw an error with a sanitized message.
 * 
 * @param error - The raw error object
 * @param options - Additional context for error mapping
 * @returns A new Error with a user-friendly message
 */
export function createUserFriendlyError(
  error: unknown,
  options: MapErrorOptions = {}
): Error {
  const message = mapErrorToUserFriendly(error, options);
  return new Error(message);
}

/**
 * Checks if an error message contains any technical details that should be hidden.
 * Used as a safety check before sending errors to clients.
 */
export function containsTechnicalDetails(message: string): boolean {
  const technicalPatterns = [
    /\bLLM\b/i,
    /\bAPI\b/i,
    /\bGemini\b/i,
    /\bGoogle\b/i,
    /\bOpenAI\b/i,
    /\bAnthropic\b/i,
    /\bClaude\b/i,
    /\bGPT\b/i,
    /\b\d{3}\b/, // Status codes like 500, 429
    /\berror code\b/i,
    /\bstatus\b.*\b\d+\b/i,
    /\[.*Error\]/i, // Error brackets like [GoogleGenerativeAI Error]
  ];
  
  return technicalPatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitizes an error message, replacing any technical details with a generic message.
 * Use this as a last-resort safety net before sending errors to clients.
 * 
 * @param message - The error message to sanitize
 * @param fallbackMessage - Optional custom fallback message
 * @returns A sanitized message safe for users
 */
export function sanitizeErrorMessage(
  message: string,
  fallbackMessage?: string
): string {
  if (containsTechnicalDetails(message)) {
    return fallbackMessage || USER_FRIENDLY_MESSAGES.generic;
  }
  return message;
}
