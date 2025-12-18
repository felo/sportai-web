/**
 * PostHog Analytics Provider
 * 
 * Integrates PostHog with the unified analytics manager.
 */

import type {
  IAnalyticsProvider,
  AnalyticsEventName,
  EventProperties,
  PageViewProperties,
} from '../types';

// ============================================================================
// TypeScript Declarations for PostHog
// ============================================================================

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
      opt_out_capturing: () => void;
      opt_in_capturing: () => void;
      has_opted_out_capturing: () => boolean;
    };
  }
}

// ============================================================================
// PostHog Provider
// ============================================================================

export class PostHogProvider implements IAnalyticsProvider {
  name = 'posthog';
  private enabled = true;
  private debug: boolean;

  constructor(config?: { debug?: boolean }) {
    this.debug = config?.debug ?? false;
  }

  initialize(): void {
    // PostHog is initialized separately in instrumentation-client.ts
    // This provider just wraps the existing instance
    if (this.debug) {
      console.log('[PostHog] Provider initialized (using existing instance)');
    }
  }

  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      window.posthog?.capture(eventName, properties as Record<string, unknown>);

      if (this.debug) {
        console.log('[PostHog] Event:', eventName, properties);
      }
    } catch (error) {
      console.warn('[PostHog] Track error:', error);
    }
  }

  pageView(properties?: PageViewProperties): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      window.posthog?.capture('$pageview', {
        $current_url: properties?.path ?? window.location.pathname,
        title: properties?.title ?? document.title,
        referrer: properties?.referrer ?? document.referrer,
      });

      if (this.debug) {
        console.log('[PostHog] Page View:', properties?.path ?? window.location.pathname);
      }
    } catch (error) {
      console.warn('[PostHog] Page view error:', error);
    }
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      window.posthog?.identify(userId, traits);

      if (this.debug) {
        console.log('[PostHog] Identify:', userId, traits);
      }
    } catch (error) {
      console.warn('[PostHog] Identify error:', error);
    }
  }

  reset(): void {
    if (!this.isAvailable()) return;

    try {
      window.posthog?.reset();

      if (this.debug) {
        console.log('[PostHog] Reset user identity');
      }
    } catch (error) {
      console.warn('[PostHog] Reset error:', error);
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.isAvailable();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.isAvailable()) {
      if (enabled) {
        window.posthog?.opt_in_capturing();
      } else {
        window.posthog?.opt_out_capturing();
      }
    }
  }

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.posthog;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPostHogProvider(config?: { debug?: boolean }): PostHogProvider {
  return new PostHogProvider(config);
}

