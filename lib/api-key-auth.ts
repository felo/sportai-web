/**
 * API Key Authentication
 *
 * Handles generation, validation, and usage tracking of API keys
 * for external developer access to SportAI APIs.
 *
 * Security:
 * - Keys are stored as SHA-256 hashes (never plaintext)
 * - Keys use `sk_live_` prefix for easy identification
 * - Validation happens server-side using service role
 */

import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-server";
import { logger } from "./logger";
import type { ApiKeyRecord, ValidatedApiKey } from "@/types/external-api";

// Key format: sk_live_<32 random hex chars>
const KEY_PREFIX = "sk_live_";
const KEY_RANDOM_BYTES = 16; // 32 hex characters

/**
 * Generate a new API key
 * Returns the raw key (to show once to user) and the hash (to store)
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(KEY_RANDOM_BYTES).toString("hex");
  const rawKey = `${KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12); // "sk_live_xxxx"

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Extract API key from request Authorization header
 * Expects: Authorization: Bearer sk_live_...
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  // Must be an API key (starts with sk_live_), not a Supabase JWT
  if (!token.startsWith(KEY_PREFIX)) {
    return null;
  }

  return token;
}

/**
 * Validate an API key from the request
 * Returns the validated key info or null if invalid
 */
export async function validateApiKey(request: NextRequest): Promise<ValidatedApiKey | null> {
  const rawKey = extractApiKey(request);

  if (!rawKey) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      logger.debug("API key validation failed:", error?.message || "Key not found");
      return null;
    }

    const keyRecord = data as ApiKeyRecord;

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      logger.debug("API key expired:", keyRecord.key_prefix);
      return null;
    }

    // Check monthly limit
    if (keyRecord.requests_this_month >= keyRecord.monthly_request_limit) {
      logger.warn("API key monthly limit exceeded:", keyRecord.key_prefix);
      return null;
    }

    return {
      id: keyRecord.id,
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      rateLimitTier: keyRecord.rate_limit_tier,
      monthlyLimit: keyRecord.monthly_request_limit,
      requestsThisMonth: keyRecord.requests_this_month,
    };
  } catch (error) {
    logger.error("API key validation error:", error);
    return null;
  }
}

/**
 * Track API key usage (call after successful request)
 */
export async function trackApiKeyUsage(keyId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // Get current values
    const { data } = await supabase
      .from("api_keys")
      .select("requests_this_month, total_requests")
      .eq("id", keyId)
      .single();

    if (data) {
      // Increment and update
      await supabase
        .from("api_keys")
        .update({
          requests_this_month: (data.requests_this_month || 0) + 1,
          total_requests: (data.total_requests || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", keyId);
    }
  } catch (error) {
    // Log but don't fail the request
    logger.error("Failed to track API key usage:", error);
  }
}

/**
 * Check if API key has a specific permission
 */
export function hasPermission(apiKey: ValidatedApiKey, permission: string): boolean {
  // Wildcard permission
  if (apiKey.permissions.includes("*")) {
    return true;
  }

  return apiKey.permissions.includes(permission);
}

/**
 * Create an unauthorized response for invalid API keys
 */
export function apiKeyUnauthorizedResponse(message = "Invalid or missing API key"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create a forbidden response for missing permissions
 */
export function apiKeyForbiddenResponse(message = "Insufficient permissions"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Create a monthly limit exceeded response
 */
export function monthlyLimitExceededResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Monthly request limit exceeded",
      message: "Your API key has reached its monthly request limit. Contact support to increase your limit.",
    },
    { status: 429 }
  );
}
