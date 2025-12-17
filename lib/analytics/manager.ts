/**
 * Analytics Manager
 * 
 * A centralized, provider-agnostic analytics system that dispatches
 * events to multiple analytics providers (Vercel, Google Analytics, etc.)
 */

import type {
  IAnalyticsProvider,
  AnalyticsConfig,
  AnalyticsEventName,
  EventProperties,
  PageViewProperties,
  AnalyticsConsent,
} from './types';

// ============================================================================
// Analytics Manager Class
// ============================================================================

class AnalyticsManager {
  private providers: IAnalyticsProvider[] = [];
  private initialized = false;
  private debug = false;
  private defaultProperties: Record<string, unknown> = {};
  private respectDoNotTrack = true;
  private consent: AnalyticsConsent = { analytics: true, marketing: true };

  /**
   * Initialize the analytics manager with configuration
   */
  async initialize(config: AnalyticsConfig = {}): Promise<void> {
    if (this.initialized) {
      this.log('Analytics already initialized');
      return;
    }

    this.debug = config.debug ?? false;
    this.defaultProperties = config.defaultProperties ?? {};
    this.respectDoNotTrack = config.respectDoNotTrack ?? true;

    // Check Do Not Track
    if (this.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      this.log('Do Not Track is enabled, analytics disabled');
      return;
    }

    // Initialize all providers
    if (config.providers) {
      for (const provider of config.providers) {
        await this.addProvider(provider);
      }
    }

    this.initialized = true;
    this.log('Analytics initialized with providers:', this.providers.map(p => p.name));
  }

  /**
   * Add a new analytics provider
   */
  async addProvider(provider: IAnalyticsProvider): Promise<void> {
    try {
      await provider.initialize();
      this.providers.push(provider);
      this.log(`Provider "${provider.name}" added`);
    } catch (error) {
      console.error(`Failed to initialize analytics provider "${provider.name}":`, error);
    }
  }

  /**
   * Remove a provider by name
   */
  removeProvider(name: string): void {
    this.providers = this.providers.filter(p => p.name !== name);
    this.log(`Provider "${name}" removed`);
  }

  /**
   * Track an event across all providers
   */
  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void {
    if (!this.shouldTrack()) return;

    const enrichedProperties = this.enrichProperties(properties);
    this.log(`Track: ${eventName}`, enrichedProperties);

    for (const provider of this.getEnabledProviders()) {
      try {
        provider.track(eventName, enrichedProperties as EventProperties<E>);
      } catch (error) {
        console.error(`Error tracking "${eventName}" with provider "${provider.name}":`, error);
      }
    }
  }

  /**
   * Track a page view
   */
  pageView(properties?: PageViewProperties): void {
    if (!this.shouldTrack()) return;

    const enrichedProperties = this.enrichProperties({
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      title: typeof document !== 'undefined' ? document.title : undefined,
      ...properties,
    });

    this.log('Page View:', enrichedProperties);

    for (const provider of this.getEnabledProviders()) {
      try {
        provider.pageView(enrichedProperties);
      } catch (error) {
        console.error(`Error tracking page view with provider "${provider.name}":`, error);
      }
    }
  }

  /**
   * Identify a user across all providers
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.shouldTrack()) return;

    this.log('Identify:', userId, traits);

    for (const provider of this.getEnabledProviders()) {
      try {
        provider.identify(userId, traits);
      } catch (error) {
        console.error(`Error identifying user with provider "${provider.name}":`, error);
      }
    }
  }

  /**
   * Reset user identity (call on logout)
   */
  reset(): void {
    this.log('Reset user identity');

    for (const provider of this.providers) {
      try {
        provider.reset();
      } catch (error) {
        console.error(`Error resetting provider "${provider.name}":`, error);
      }
    }
  }

  /**
   * Update consent preferences
   */
  setConsent(consent: Partial<AnalyticsConsent>): void {
    this.consent = { ...this.consent, ...consent };
    this.log('Consent updated:', this.consent);

    // Update all providers
    for (const provider of this.providers) {
      provider.setEnabled(this.consent.analytics);
    }
  }

  /**
   * Get current consent state
   */
  getConsent(): AnalyticsConsent {
    return { ...this.consent };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private shouldTrack(): boolean {
    if (!this.initialized) {
      this.log('Analytics not initialized, skipping track');
      return false;
    }

    if (!this.consent.analytics) {
      this.log('Analytics consent not given, skipping track');
      return false;
    }

    if (this.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      return false;
    }

    return true;
  }

  private getEnabledProviders(): IAnalyticsProvider[] {
    return this.providers.filter(p => p.isEnabled());
  }

  private enrichProperties(properties?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.defaultProperties,
      ...properties,
      timestamp: properties?.timestamp ?? Date.now(),
    };
  }

  private isDoNotTrackEnabled(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: string }).globalPrivacyControl === '1';
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[Analytics]', ...args);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Global analytics manager instance
 */
export const analytics = new AnalyticsManager();

/**
 * Convenience function to track events
 */
export function track<E extends AnalyticsEventName>(
  eventName: E,
  properties?: EventProperties<E>
): void {
  analytics.track(eventName, properties);
}

/**
 * Convenience function to track page views
 */
export function pageView(properties?: PageViewProperties): void {
  analytics.pageView(properties);
}

/**
 * Convenience function to identify users
 */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  analytics.identify(userId, traits);
}

