/**
 * Vercel Analytics Provider
 * 
 * Integrates with @vercel/analytics for event tracking.
 * Vercel Analytics is lightweight (~1KB) and privacy-friendly.
 */

import { track as vercelTrack } from '@vercel/analytics';
import type {
  IAnalyticsProvider,
  AnalyticsEventName,
  EventProperties,
  PageViewProperties,
} from '../types';

// ============================================================================
// Vercel Analytics Provider
// ============================================================================

export class VercelAnalyticsProvider implements IAnalyticsProvider {
  name = 'vercel';
  private enabled = true;

  /**
   * Initialize Vercel Analytics
   * Note: The <Analytics /> component in layout.tsx handles the actual script loading.
   * This provider just wraps the track() function for our unified API.
   */
  initialize(): void {
    // Vercel Analytics is initialized via the <Analytics /> component
    // No additional setup needed here
  }

  /**
   * Track an event using Vercel Analytics
   */
  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void {
    if (!this.enabled) return;

    try {
      // Vercel Analytics has a flat property structure
      // Convert our typed properties to a simple record
      const flatProperties = this.flattenProperties(properties);
      
      vercelTrack(eventName, flatProperties);
    } catch (error) {
      // Silently fail - don't break the app for analytics
      console.warn('[Vercel Analytics] Track error:', error);
    }
  }

  /**
   * Track page view
   * Note: Vercel Analytics automatically tracks page views via the <Analytics /> component.
   * This is here for explicit page view tracking if needed.
   */
  pageView(properties?: PageViewProperties): void {
    if (!this.enabled) return;

    // Vercel Analytics handles page views automatically
    // But we can track it as a custom event if explicit tracking is needed
    if (properties && Object.keys(properties).length > 0) {
      this.track('page_view', properties);
    }
  }

  /**
   * Identify a user
   * Note: Vercel Analytics doesn't have built-in user identification.
   * We include userId in event properties instead.
   */
  identify(_userId: string, _traits?: Record<string, unknown>): void {
    // Vercel Analytics doesn't support user identification natively
    // User info should be passed via event properties
  }

  /**
   * Reset user identity
   */
  reset(): void {
    // No-op for Vercel Analytics
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Flatten properties for Vercel Analytics
   * Vercel Analytics works best with flat key-value pairs
   */
  private flattenProperties(
    properties?: Record<string, unknown>
  ): Record<string, string | number | boolean | null> {
    if (!properties) return {};

    const result: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip undefined values
      if (value === undefined) continue;

      // Handle different value types
      if (value === null) {
        result[key] = null;
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (typeof value === 'object') {
        // For nested objects, stringify them
        result[key] = JSON.stringify(value);
      } else {
        result[key] = String(value);
      }
    }

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Vercel Analytics provider instance
 */
export function createVercelAnalyticsProvider(): VercelAnalyticsProvider {
  return new VercelAnalyticsProvider();
}

