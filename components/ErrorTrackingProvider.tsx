"use client";

import { ErrorBoundaryWithAuth } from "./ErrorBoundary";
import { useGlobalErrorTracking } from "@/hooks/useGlobalErrorTracking";

/**
 * Error Tracking Provider
 * 
 * Wraps the app with:
 * - React ErrorBoundary (catches React component errors)
 * - Global error tracking hook (catches window.onerror and unhandledrejection)
 * 
 * All errors are tracked through the unified analytics system.
 */
export function ErrorTrackingProvider({ children }: { children: React.ReactNode }) {
  // Set up global error handlers (window.onerror, unhandledrejection)
  useGlobalErrorTracking();

  return (
    <ErrorBoundaryWithAuth>
      {children}
    </ErrorBoundaryWithAuth>
  );
}

