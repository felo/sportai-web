import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";
import { logger } from "./logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Get a Supabase admin client (for database operations with service role)
 * This bypasses RLS and should only be used server-side after validating the user
 */
export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Missing Supabase environment variables: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""}`
    );
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Validate the Authorization header JWT and extract the authenticated user
 * Uses service role to verify the token server-side
 * 
 * @param request - The NextRequest object
 * @returns The authenticated user or null if not authenticated
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ id: string; email?: string } | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  // Empty token check
  if (!token || token.length < 10) {
    logger.debug("Auth validation failed: Invalid token format");
    return null;
  }

  try {
    // Validate token with Supabase using service role
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.debug("Auth validation failed:", error?.message || "No user returned");
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (error) {
    logger.error("Auth validation exception:", error);
    return null;
  }
}

/**
 * Helper to return a standardized 401 response
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

