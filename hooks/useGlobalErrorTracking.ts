"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Global error tracking hook
 * 
 * Sets up global error handlers to catch:
 * - window.onerror (synchronous errors)
 * - unhandledrejection (promise rejections)
 * - console.error (optional, for completeness)
 * 
 * All errors are tracked through the unified analytics system.
 */
export function useGlobalErrorTracking() {
  const { user } = useAuth();

  useEffect(() => {
    // Track synchronous errors via addEventListener (ErrorEvent)
    const handleError = (event: ErrorEvent): void => {
      const errorObj = event.error;
      const errorMessage = errorObj?.message || event.message || 'Unknown error';
      const errorName = errorObj?.name || 'Error';
      const errorStack = errorObj?.stack || '';
      const filename = event.filename || 'unknown';
      const line = event.lineno;
      const column = event.colno;

      // Track error through unified analytics
      track('error_displayed', {
        errorType: errorName,
        errorMessage,
        errorName,
        errorStack,
        errorFilename: filename,
        errorLine: line,
        errorColumn: column,
        errorSource: 'global',
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: user?.id,
      });
    };

    // Track unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const errorMessage = reason instanceof Error 
        ? reason.message 
        : String(reason);
      const errorName = reason instanceof Error ? reason.name : 'UnhandledRejection';
      const errorStack = reason instanceof Error ? reason.stack : '';

      // Track error through unified analytics
      track('error_displayed', {
        errorType: errorName,
        errorMessage,
        errorName,
        errorStack,
        errorSource: 'promise',
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: user?.id,
      });
    };

    // Set up global error handlers
    window.addEventListener('error', handleError as EventListener);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError as EventListener);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);
}

