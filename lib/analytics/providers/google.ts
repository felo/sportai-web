/**
 * Google Analytics (GA4) Provider
 * 
 * Placeholder implementation for Google Analytics integration.
 * To enable, install the gtag script and configure with your GA4 Measurement ID.
 * 
 * Setup:
 * 1. Add your GA4 Measurement ID to .env: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 * 2. Add the gtag script to your layout (see comments below)
 * 3. Enable this provider in your analytics config
 */

import type {
  IAnalyticsProvider,
  AnalyticsEventName,
  EventProperties,
  PageViewProperties,
} from '../types';

// ============================================================================
// TypeScript Declarations for gtag
// ============================================================================

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

// ============================================================================
// Google Analytics Provider
// ============================================================================

export interface GoogleAnalyticsConfig {
  /** GA4 Measurement ID (e.g., G-XXXXXXXXXX) */
  measurementId: string;
  /** Enable debug mode */
  debug?: boolean;
}

export class GoogleAnalyticsProvider implements IAnalyticsProvider {
  name = 'google-analytics';
  private enabled = true;
  private initialized = false;
  private measurementId: string;
  private debug: boolean;

  constructor(config: GoogleAnalyticsConfig) {
    this.measurementId = config.measurementId;
    this.debug = config.debug ?? false;
  }

  /**
   * Initialize Google Analytics
   * Note: The gtag script should be added to your layout separately.
   * 
   * Add this to your layout.tsx <head> section:
   * ```tsx
   * <Script
   *   src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
   *   strategy="afterInteractive"
   * />
   * <Script id="google-analytics" strategy="afterInteractive">
   *   {`
   *     window.dataLayer = window.dataLayer || [];
   *     function gtag(){dataLayer.push(arguments);}
   *     gtag('js', new Date());
   *     gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
   *   `}
   * </Script>
   * ```
   */
  initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if gtag is available
    if (!window.gtag) {
      if (this.debug) {
        console.warn('[Google Analytics] gtag not found. Make sure the GA script is loaded.');
      }
      return;
    }

    // Configure with our measurement ID
    window.gtag('config', this.measurementId, {
      send_page_view: false, // We'll handle page views manually
      debug_mode: this.debug,
    });

    this.initialized = true;
    
    if (this.debug) {
      console.log('[Google Analytics] Initialized with ID:', this.measurementId);
    }
  }

  /**
   * Track an event using GA4
   */
  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      // GA4 event names should be snake_case and max 40 chars
      const ga4EventName = this.sanitizeEventName(eventName);
      const ga4Properties = this.convertProperties(properties);

      window.gtag?.('event', ga4EventName, ga4Properties);

      if (this.debug) {
        console.log('[Google Analytics] Event:', ga4EventName, ga4Properties);
      }
    } catch (error) {
      console.warn('[Google Analytics] Track error:', error);
    }
  }

  /**
   * Track a page view
   */
  pageView(properties?: PageViewProperties): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      window.gtag?.('event', 'page_view', {
        page_path: properties?.path ?? window.location.pathname,
        page_title: properties?.title ?? document.title,
        page_referrer: properties?.referrer ?? document.referrer,
      });

      if (this.debug) {
        console.log('[Google Analytics] Page View:', properties?.path ?? window.location.pathname);
      }
    } catch (error) {
      console.warn('[Google Analytics] Page view error:', error);
    }
  }

  /**
   * Identify a user
   * GA4 uses user_id parameter for cross-device tracking
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      // Set user ID for cross-device tracking
      window.gtag?.('config', this.measurementId, {
        user_id: userId,
      });

      // Set user properties
      if (traits) {
        window.gtag?.('set', 'user_properties', traits);
      }

      if (this.debug) {
        console.log('[Google Analytics] Identify:', userId, traits);
      }
    } catch (error) {
      console.warn('[Google Analytics] Identify error:', error);
    }
  }

  /**
   * Reset user identity
   */
  reset(): void {
    if (!this.isAvailable()) return;

    try {
      // Clear user ID
      window.gtag?.('config', this.measurementId, {
        user_id: null,
      });

      if (this.debug) {
        console.log('[Google Analytics] Reset user identity');
      }
    } catch (error) {
      console.warn('[Google Analytics] Reset error:', error);
    }
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.isAvailable();
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    // GA4 supports consent mode
    if (this.isAvailable()) {
      window.gtag?.('set', this.measurementId, {
        'analytics_storage': enabled ? 'granted' : 'denied',
      });
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.gtag;
  }

  /**
   * Sanitize event name for GA4
   * - Max 40 characters
   * - Only letters, numbers, underscores
   * - Must start with a letter
   */
  private sanitizeEventName(eventName: string): string {
    return eventName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40);
  }

  /**
   * Convert properties to GA4 format
   * GA4 has specific naming conventions and limits
   */
  private convertProperties(
    properties?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!properties) return {};

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined) continue;

      // GA4 parameter names: max 40 chars, snake_case
      const ga4Key = key.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);

      // GA4 string values: max 100 chars
      if (typeof value === 'string') {
        result[ga4Key] = value.slice(0, 100);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[ga4Key] = value;
      } else if (value === null) {
        result[ga4Key] = null;
      } else {
        result[ga4Key] = JSON.stringify(value).slice(0, 100);
      }
    }

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Google Analytics provider instance
 */
export function createGoogleAnalyticsProvider(
  config: GoogleAnalyticsConfig
): GoogleAnalyticsProvider {
  return new GoogleAnalyticsProvider(config);
}

/**
 * Create a Google Analytics provider from environment variables
 */
export function createGoogleAnalyticsProviderFromEnv(): GoogleAnalyticsProvider | null {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  
  if (!measurementId) {
    console.warn('[Google Analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID not set');
    return null;
  }

  return createGoogleAnalyticsProvider({
    measurementId,
    debug: process.env.NODE_ENV === 'development',
  });
}

