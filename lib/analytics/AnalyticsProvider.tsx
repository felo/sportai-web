'use client';

/**
 * Analytics Provider Component
 * 
 * Initializes analytics on the client side and provides
 * consent-aware tracking throughout the app.
 */

import { useEffect, useRef } from 'react';
import { initAnalytics, analytics } from './index';

export interface AnalyticsProviderProps {
  children: React.ReactNode;
  /** Enable debug logging (defaults to true in development) */
  debug?: boolean;
  /** Enable Vercel Analytics (defaults to true) */
  enableVercel?: boolean;
  /** Enable Google Analytics (defaults to true if env var is set) */
  enableGoogle?: boolean;
}

/**
 * Analytics Provider Component
 * 
 * Add this to your layout to initialize analytics:
 * ```tsx
 * <AnalyticsProvider>
 *   {children}
 * </AnalyticsProvider>
 * ```
 */
export function AnalyticsProvider({
  children,
  debug,
  enableVercel = true,
  enableGoogle = true,
}: AnalyticsProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initialized.current) return;
    initialized.current = true;

    // Check for existing consent
    const savedConsent = getSavedConsent();
    if (savedConsent) {
      analytics.setConsent(savedConsent);
    }

    // Initialize analytics
    initAnalytics({
      debug,
      enableVercel,
      enableGoogle,
    });

    // Listen for consent changes from CookieConsent component
    const handleConsentChange = (event: CustomEvent<{ analytics: boolean; marketing: boolean }>) => {
      analytics.setConsent({
        analytics: event.detail.analytics,
        marketing: event.detail.marketing,
      });
    };

    window.addEventListener('consentChanged', handleConsentChange as EventListener);

    return () => {
      window.removeEventListener('consentChanged', handleConsentChange as EventListener);
    };
  }, [debug, enableVercel, enableGoogle]);

  return <>{children}</>;
}

/**
 * Get saved consent from localStorage
 */
function getSavedConsent(): { analytics: boolean; marketing: boolean } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('cookie-consent');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  
  return null;
}

