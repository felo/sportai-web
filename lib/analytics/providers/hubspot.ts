/**
 * HubSpot Provider
 *
 * Manages HubSpot tracking script integration including:
 * - Chat widget
 * - Form tracking
 * - Lead tracking
 * - Visitor identification
 *
 * Setup:
 * 1. Add your HubSpot Portal ID to .env: NEXT_PUBLIC_HUBSPOT_PORTAL_ID=144170638
 * 2. The script is loaded in layout.tsx
 * 3. This provider manages consent and identification
 */

import type {
  IAnalyticsProvider,
  AnalyticsEventName,
  EventProperties,
  PageViewProperties,
} from '../types';

// ============================================================================
// TypeScript Declarations for HubSpot
// ============================================================================

declare global {
  interface Window {
    _hsq?: Array<unknown[]>;
    HubSpotConversations?: {
      widget: {
        load: () => void;
        remove: () => void;
        open: () => void;
        close: () => void;
        status: () => { loaded: boolean; pending: boolean };
      };
      on: (event: string, callback: () => void) => void;
    };
    hsConversationsSettings?: {
      loadImmediately?: boolean;
      inlineEmbedSelector?: string;
    };
    hsConversationsOnReady?: Array<() => void>;
  }
}

// ============================================================================
// HubSpot Provider
// ============================================================================

export interface HubSpotConfig {
  /** HubSpot Portal ID */
  portalId: string;
  /** Enable debug mode */
  debug?: boolean;
  /** Load chat widget immediately (default: true) */
  loadChatImmediately?: boolean;
}

export class HubSpotProvider implements IAnalyticsProvider {
  name = 'hubspot';
  private enabled = true;
  private initialized = false;
  private portalId: string;
  private debug: boolean;
  private loadChatImmediately: boolean;

  constructor(config: HubSpotConfig) {
    this.portalId = config.portalId;
    this.debug = config.debug ?? false;
    this.loadChatImmediately = config.loadChatImmediately ?? true;
  }

  /**
   * Initialize HubSpot tracking
   * Note: The HubSpot script should be added to your layout separately.
   */
  initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize the HubSpot tracking queue
    window._hsq = window._hsq || [];

    // Configure chat widget loading behavior
    if (!this.loadChatImmediately) {
      window.hsConversationsSettings = {
        loadImmediately: false,
      };
    }

    this.initialized = true;

    if (this.debug) {
      console.log('[HubSpot] Initialized with Portal ID:', this.portalId);
    }
  }

  /**
   * Track a custom event
   * HubSpot uses trackCustomBehavioralEvent for custom tracking
   */
  track<E extends AnalyticsEventName>(
    eventName: E,
    properties?: EventProperties<E>
  ): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      // HubSpot custom behavioral events
      window._hsq?.push([
        'trackCustomBehavioralEvent',
        {
          name: eventName,
          properties: properties || {},
        },
      ]);

      if (this.debug) {
        console.log('[HubSpot] Event:', eventName, properties);
      }
    } catch (error) {
      console.warn('[HubSpot] Track error:', error);
    }
  }

  /**
   * Track a page view
   * HubSpot automatically tracks page views, but we can trigger manual ones
   */
  pageView(properties?: PageViewProperties): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      const path = properties?.path ?? window.location.pathname;

      // Set the path and trigger page view
      window._hsq?.push(['setPath', path]);
      window._hsq?.push(['trackPageView']);

      if (this.debug) {
        console.log('[HubSpot] Page View:', path);
      }
    } catch (error) {
      console.warn('[HubSpot] Page view error:', error);
    }
  }

  /**
   * Identify a user/contact in HubSpot
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      // HubSpot uses email as the primary identifier
      // If traits include email, use that; otherwise use userId as email
      const email = (traits?.email as string) || userId;

      const identifyData: Record<string, unknown> = {
        email,
        ...traits,
      };

      // Remove email from traits to avoid duplication
      delete identifyData.email;

      window._hsq?.push(['identify', { email, ...identifyData }]);

      if (this.debug) {
        console.log('[HubSpot] Identify:', email, identifyData);
      }
    } catch (error) {
      console.warn('[HubSpot] Identify error:', error);
    }
  }

  /**
   * Reset user identity
   */
  reset(): void {
    if (!this.isAvailable()) return;

    try {
      // HubSpot doesn't have a direct reset, but we can revoke consent
      // which will clear the tracking cookie
      window._hsq?.push(['revokeCookieConsent']);

      if (this.debug) {
        console.log('[HubSpot] Reset user identity');
      }
    } catch (error) {
      console.warn('[HubSpot] Reset error:', error);
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

    if (this.isAvailable()) {
      if (enabled) {
        // Grant cookie consent
        window._hsq?.push(['doNotTrack', { track: true }]);
      } else {
        // Revoke cookie consent
        window._hsq?.push(['doNotTrack', { track: false }]);
      }

      if (this.debug) {
        console.log('[HubSpot] Tracking:', enabled ? 'enabled' : 'disabled');
      }
    }

    // Control chat widget visibility based on consent
    this.updateChatWidgetVisibility(enabled);
  }

  // ============================================================================
  // HubSpot-specific Methods
  // ============================================================================

  /**
   * Show the HubSpot chat widget
   */
  showChatWidget(): void {
    if (!this.isAvailable()) return;

    try {
      if (window.HubSpotConversations?.widget) {
        window.HubSpotConversations.widget.load();
      } else {
        // Widget not loaded yet, queue the action
        window.hsConversationsOnReady = window.hsConversationsOnReady || [];
        window.hsConversationsOnReady.push(() => {
          window.HubSpotConversations?.widget.load();
        });
      }
    } catch (error) {
      console.warn('[HubSpot] Show chat widget error:', error);
    }
  }

  /**
   * Hide the HubSpot chat widget
   */
  hideChatWidget(): void {
    if (!this.isAvailable()) return;

    try {
      window.HubSpotConversations?.widget.remove();
    } catch (error) {
      console.warn('[HubSpot] Hide chat widget error:', error);
    }
  }

  /**
   * Open the HubSpot chat widget
   */
  openChatWidget(): void {
    if (!this.isAvailable()) return;

    try {
      window.HubSpotConversations?.widget.open();
    } catch (error) {
      console.warn('[HubSpot] Open chat widget error:', error);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && Array.isArray(window._hsq);
  }

  private updateChatWidgetVisibility(enabled: boolean): void {
    if (!this.isAvailable()) return;

    try {
      if (enabled) {
        this.showChatWidget();
      } else {
        this.hideChatWidget();
      }
    } catch (error) {
      // Silently ignore - chat widget may not be configured
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a HubSpot provider instance
 */
export function createHubSpotProvider(config: HubSpotConfig): HubSpotProvider {
  return new HubSpotProvider(config);
}

/**
 * Create a HubSpot provider from environment variables
 */
export function createHubSpotProviderFromEnv(): HubSpotProvider | null {
  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;

  if (!portalId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[HubSpot] NEXT_PUBLIC_HUBSPOT_PORTAL_ID not set');
    }
    return null;
  }

  return createHubSpotProvider({
    portalId,
    debug: process.env.NODE_ENV === 'development',
  });
}
