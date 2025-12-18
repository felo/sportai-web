"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/components/auth/AuthProvider";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary Component
 * 
 * Catches React component errors and tracks them through the unified analytics system.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error through unified analytics
    // Note: We can't use hooks here, so we'll get user from window if available
    const userId = typeof window !== 'undefined' && (window as any).__auth_user_id__;

    track('error_displayed', {
      errorType: error.name,
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      errorSource: 'react',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      userId,
      // React-specific error info
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise show default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2>Something went wrong</h2>
          <p>We've been notified and are looking into it.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary wrapper
 * Makes it easier to use ErrorBoundary with user context
 */
export function ErrorBoundaryWithAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Store user ID in window for ErrorBoundary to access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__auth_user_id__ = user?.id;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__auth_user_id__;
      }
    };
  }, [user?.id]);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

