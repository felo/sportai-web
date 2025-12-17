import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Auth callback route handler for OAuth providers (Google, Apple)
 * 
 * This route handles the callback from Supabase after OAuth sign-in.
 * With PKCE flow, the client-side Supabase client handles the code exchange
 * via `detectSessionInUrl: true`, but having this route ensures proper redirects.
 * 
 * The actual session establishment happens client-side via the auth state change listener.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors from the provider
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    // Redirect to home with error params so the app can display an error message
    const errorUrl = new URL("/", requestUrl.origin);
    errorUrl.searchParams.set("auth_error", error);
    if (errorDescription) {
      errorUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  // If we have a code, the client-side will handle the exchange via detectSessionInUrl
  // We can optionally do server-side exchange for faster session establishment
  if (code) {
    try {
      const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: "pkce",
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      // Exchange the authorization code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error("Error exchanging code for session:", exchangeError);
        // Don't fail - let the client-side try the exchange
      }
    } catch (err) {
      console.error("Exception during code exchange:", err);
      // Don't fail - let the client-side handle it
    }
  }

  // Redirect to home page - the client-side auth listener will pick up the session
  // Pass the code through so client-side can also process if server-side failed
  const redirectUrl = new URL("/", requestUrl.origin);
  if (code) {
    redirectUrl.searchParams.set("code", code);
  }
  
  return NextResponse.redirect(redirectUrl);
}

