import { createClient } from "@supabase/supabase-js";
import { authLogger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * Supabase client for browser usage
 * Uses singleton pattern to ensure only one client instance exists
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce", // Use PKCE flow for better security
  },
});

/**
 * Helper to get the current user session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Check for refresh token errors - these are expected when token is invalid
    const isRefreshTokenError = 
      error.message?.includes("Refresh Token Not Found") ||
      error.message?.includes("Invalid Refresh Token") ||
      error.message?.includes("refresh_token_not_found");
    
    if (isRefreshTokenError) {
      authLogger.warn("Invalid refresh token - session cleared:", error.message);
      // Clear the invalid session
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        authLogger.error("Error signing out after invalid refresh token:", signOutError);
      }
    } else {
      authLogger.error("Error getting session:", error);
    }
    return null;
  }
  return data.session;
}

/**
 * Helper to get the current user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Suppress "Auth session missing" error - it's expected when not logged in
    if (error.message === "Auth session missing!") {
      return null;
    }
    
    // Check for refresh token errors - these are expected when token is invalid
    const isRefreshTokenError = 
      error.message?.includes("Refresh Token Not Found") ||
      error.message?.includes("Invalid Refresh Token") ||
      error.message?.includes("refresh_token_not_found");
    
    if (isRefreshTokenError) {
      authLogger.warn("Invalid refresh token - session cleared:", error.message);
      // Clear the invalid session
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        authLogger.error("Error signing out after invalid refresh token:", signOutError);
      }
    } else {
      authLogger.error("Error getting user:", error);
    }
    return null;
  }
  return data.user;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: "google" | "apple") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/`,
      skipBrowserRedirect: false,
    },
  });
  
  if (error) {
    authLogger.error(`Error signing in with ${provider}:`, error);
    throw error;
  }
  
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    authLogger.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

