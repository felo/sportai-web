/**
 * Analytics Event Types and Definitions
 * 
 * This file defines all trackable events in the application.
 * Add new events here to maintain type safety across all analytics providers.
 */

// ============================================================================
// Core Event Types
// ============================================================================

/**
 * Base properties that all events can include
 */
export interface BaseEventProperties {
  /** User ID if authenticated */
  userId?: string;
  /** Session ID for anonymous tracking */
  sessionId?: string;
  /** Timestamp override (defaults to now) */
  timestamp?: number;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Video-related event properties
 */
export interface VideoEventProperties extends BaseEventProperties {
  sport?: 'tennis' | 'padel' | 'pickleball' | string;
  durationSeconds?: number;
  fileSizeMB?: number;
  videoId?: string;
  /** Source of the upload: 'file_picker', 'drag_drop', 'url' */
  source?: 'file_picker' | 'drag_drop' | 'url' | string;
  /** File type/MIME type */
  fileType?: string;
}

/**
 * Analysis event properties
 */
export interface AnalysisEventProperties extends VideoEventProperties {
  analysisType?: 'technique' | 'tactical' | 'pose' | 'frame' | string;
  processingTimeMs?: number;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Chat/AI event properties
 */
export interface ChatEventProperties extends BaseEventProperties {
  messageType?: 'user' | 'assistant' | 'system';
  chatId?: string;
  hasVideo?: boolean;
  sport?: string;
}

/**
 * Auth event properties
 */
export interface AuthEventProperties extends BaseEventProperties {
  method?: 'google' | 'email' | 'anonymous' | string;
  success?: boolean;
}

/**
 * Page view properties
 */
export interface PageViewProperties extends BaseEventProperties {
  path?: string;
  referrer?: string;
  title?: string;
}

/**
 * Conversion/business event properties
 */
export interface ConversionEventProperties extends BaseEventProperties {
  source?: string;
  plan?: string;
  value?: number;
  currency?: string;
}

// ============================================================================
// Event Map - All Trackable Events
// ============================================================================

/**
 * Complete map of all analytics events and their property types.
 * This ensures type safety when tracking events.
 */
export interface AnalyticsEventMap {
  // Page/Navigation Events
  'page_view': PageViewProperties;
  
  // Video Events
  'video_upload_intent': VideoEventProperties;
  'video_upload_started': VideoEventProperties;
  'video_uploaded': VideoEventProperties;
  'video_upload_failed': VideoEventProperties & { error?: string };
  'video_deleted': VideoEventProperties;
  'video_play_started': VideoEventProperties;
  'video_progress': VideoEventProperties & { percentComplete?: number };
  'video_completed': VideoEventProperties;
  
  // Analysis Events
  'analysis_started': AnalysisEventProperties;
  'analysis_completed': AnalysisEventProperties;
  'analysis_failed': AnalysisEventProperties;
  'pose_detection_started': AnalysisEventProperties;
  'pose_detection_completed': AnalysisEventProperties;
  'tactical_analysis_requested': AnalysisEventProperties;
  'frame_analysis_requested': AnalysisEventProperties;
  'technique_analysis_requested': AnalysisEventProperties;
  
  // Chat/AI Events
  'chat_started': ChatEventProperties;
  'chat_message_sent': ChatEventProperties;
  'chat_message_received': ChatEventProperties;
  'ai_response_generated': ChatEventProperties & { tokensUsed?: number };
  
  // Auth Events
  'auth_started': AuthEventProperties;
  'auth_completed': AuthEventProperties;
  'auth_failed': AuthEventProperties & { error?: string };
  'logout': BaseEventProperties;
  
  // Conversion Events
  'pricing_page_viewed': ConversionEventProperties;
  'waitlist_joined': ConversionEventProperties;
  'subscription_started': ConversionEventProperties;
  'feature_gated': ConversionEventProperties & { feature?: string };
  
  // Engagement Events
  'share_clicked': BaseEventProperties & { shareType?: string };
  'feedback_submitted': BaseEventProperties & { rating?: number; feedback?: string };
  'error_displayed': BaseEventProperties & { 
    errorType?: string; 
    errorMessage?: string;
    errorName?: string;
    errorStack?: string;
    errorFilename?: string;
    errorLine?: number;
    errorColumn?: number;
    errorSource?: 'global' | 'react' | 'promise' | 'console';
    url?: string;
    userAgent?: string;
  };
  
  // Custom/Generic Event (escape hatch for one-off events)
  'custom': BaseEventProperties & Record<string, unknown>;
}

/**
 * Union type of all event names
 */
export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * Get the property type for a specific event
 */
export type EventProperties<E extends AnalyticsEventName> = AnalyticsEventMap[E];

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Analytics provider interface - implement this to add new providers
 */
export interface IAnalyticsProvider {
  /** Unique identifier for this provider */
  name: string;
  
  /** Initialize the provider (called once on app load) */
  initialize(): Promise<void> | void;
  
  /** Track a named event with properties */
  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void;
  
  /** Track a page view */
  pageView(properties?: PageViewProperties): void;
  
  /** Identify a user (for providers that support user identification) */
  identify(userId: string, traits?: Record<string, unknown>): void;
  
  /** Reset/clear user identity (on logout) */
  reset(): void;
  
  /** Check if tracking is enabled (respects user consent) */
  isEnabled(): boolean;
  
  /** Enable or disable tracking */
  setEnabled(enabled: boolean): void;
}

/**
 * Analytics manager configuration
 */
export interface AnalyticsConfig {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Default properties to include with all events */
  defaultProperties?: BaseEventProperties;
  
  /** Respect Do Not Track browser setting */
  respectDoNotTrack?: boolean;
  
  /** Providers to use */
  providers?: IAnalyticsProvider[];
}

/**
 * Consent preferences for analytics
 */
export interface AnalyticsConsent {
  analytics: boolean;
  marketing: boolean;
}
