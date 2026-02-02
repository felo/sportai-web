/**
 * Analytics Module
 *
 * Unified analytics tracking that dispatches events to multiple providers.
 *
 * Usage:
 * ```ts
 * import { track, analytics, initAnalytics } from '@/lib/analytics';
 *
 * // Initialize (call once in your app, e.g., in a client component)
 * await initAnalytics();
 *
 * // Track events anywhere
 * track('video_uploaded', { sport: 'tennis', durationSeconds: 45 });
 * track('analysis_started', { analysisType: 'technique' });
 * track('auth_completed', { method: 'google' });
 * ```
 */

// Core exports
export { analytics, track, pageView, identify } from './manager';
export { AnalyticsProvider, type AnalyticsProviderProps } from './AnalyticsProvider';
export type {
  AnalyticsEventMap,
  AnalyticsEventName,
  EventProperties,
  IAnalyticsProvider,
  AnalyticsConfig,
  AnalyticsConsent,
  // Event property types
  BaseEventProperties,
  VideoEventProperties,
  AnalysisEventProperties,
  ChatEventProperties,
  AuthEventProperties,
  PageViewProperties,
  ConversionEventProperties,
} from './types';

// Provider exports
export {
  VercelAnalyticsProvider,
  createVercelAnalyticsProvider,
} from './providers/vercel';

export {
  GoogleAnalyticsProvider,
  createGoogleAnalyticsProvider,
  createGoogleAnalyticsProviderFromEnv,
  type GoogleAnalyticsConfig,
} from './providers/google';

export {
  PostHogProvider,
  createPostHogProvider,
} from './providers/posthog';

export {
  HubSpotProvider,
  createHubSpotProvider,
  createHubSpotProviderFromEnv,
  type HubSpotConfig,
} from './providers/hubspot';

// ============================================================================
// Convenience Initialization
// ============================================================================

import { analytics } from './manager';
import { createVercelAnalyticsProvider } from './providers/vercel';
import { createGoogleAnalyticsProviderFromEnv } from './providers/google';
import { createPostHogProvider } from './providers/posthog';
import { createHubSpotProviderFromEnv } from './providers/hubspot';

/**
 * Initialize analytics with default configuration.
 * Call this once when your app loads (e.g., in a useEffect in your root layout).
 *
 * This automatically sets up:
 * - Vercel Analytics (always enabled)
 * - Google Analytics (if NEXT_PUBLIC_GA_MEASUREMENT_ID is set)
 */
export async function initAnalytics(options?: {
  debug?: boolean;
  enableVercel?: boolean;
  enableGoogle?: boolean;
  enablePostHog?: boolean;
  enableHubSpot?: boolean;
}): Promise<void> {
  const {
    debug = process.env.NODE_ENV === 'development',
    enableVercel = true,
    enableGoogle = true,
    enablePostHog = true,
    enableHubSpot = true,
  } = options ?? {};

  const providers = [];

  // Add Vercel Analytics
  if (enableVercel) {
    providers.push(createVercelAnalyticsProvider());
  }

  // Add Google Analytics if configured
  if (enableGoogle) {
    const gaProvider = createGoogleAnalyticsProviderFromEnv();
    if (gaProvider) {
      providers.push(gaProvider);
    }
  }

  // Add PostHog (already initialized in instrumentation-client.ts)
  if (enablePostHog && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    providers.push(createPostHogProvider({ debug }));
  }

  // Add HubSpot if configured
  if (enableHubSpot) {
    const hubspotProvider = createHubSpotProviderFromEnv();
    if (hubspotProvider) {
      providers.push(hubspotProvider);
    }
  }

  // Initialize the manager
  await analytics.initialize({
    debug,
    providers,
    respectDoNotTrack: true,
  });
}
