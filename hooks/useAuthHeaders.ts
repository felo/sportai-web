"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCallback, useMemo } from "react";

/**
 * Hook to get properly authenticated headers for API calls
 * Uses the session access token (JWT), not the user ID
 * 
 * SECURITY: This replaces the insecure pattern of sending user.id directly
 */
export function useAuthHeaders() {
  const { session, user } = useAuth();

  /**
   * Get authentication headers for API calls
   * Throws if not authenticated
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session]);

  /**
   * Get authentication headers with Content-Type: application/json
   * Throws if not authenticated
   */
  const getAuthHeadersWithJson = useCallback((): HeadersInit => {
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }, [session]);

  /**
   * Get authentication headers if available, or null if not authenticated
   * Does not throw - useful for optional auth scenarios
   */
  const getAuthHeadersIfAvailable = useCallback((): HeadersInit | null => {
    if (!session?.access_token) {
      return null;
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session]);

  const isAuthenticated = useMemo(
    () => !!session?.access_token && !!user,
    [session, user]
  );

  return {
    getAuthHeaders,
    getAuthHeadersWithJson,
    getAuthHeadersIfAvailable,
    isAuthenticated,
    accessToken: session?.access_token ?? null,
    userId: user?.id ?? null,
  };
}

