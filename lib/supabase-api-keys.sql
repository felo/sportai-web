-- ============================================================================
-- External API Keys Table
-- ============================================================================
-- This table stores API keys for external developers to access SportAI APIs.
-- Keys are stored as SHA-256 hashes for security.
--
-- To run this migration:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file and run it
-- ============================================================================

-- Create the api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key identification (never store the actual key!)
  key_hash TEXT NOT NULL UNIQUE,           -- SHA-256 hash of the full key
  key_prefix TEXT NOT NULL,                -- First 12 chars for identification (e.g., "sk_live_abc1")
  
  -- Metadata
  name TEXT NOT NULL,                      -- Human-readable name (e.g., "Pickleball App Production")
  owner_email TEXT,                        -- Contact email for the key owner
  description TEXT,                        -- Optional description of what this key is for
  
  -- Permissions & limits
  permissions TEXT[] DEFAULT '{}',         -- Array of permission strings (e.g., ['pickleball:chat'])
  rate_limit_tier TEXT DEFAULT 'external_standard',
  monthly_request_limit INTEGER DEFAULT 10000,
  requests_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                  -- NULL = never expires
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  
  -- Extensibility
  metadata JSONB DEFAULT '{}'              -- Store custom data (client app name, etc.)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_email) WHERE owner_email IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE api_keys IS 'Stores hashed API keys for external developer access to SportAI APIs';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key - never store raw keys';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the key for identification in logs/UI';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permission strings like pickleball:chat, tennis:chat';
COMMENT ON COLUMN api_keys.rate_limit_tier IS 'Rate limit tier name from lib/rate-limit.ts';

-- ============================================================================
-- Helper function to reset monthly counters
-- ============================================================================
-- Run this as a scheduled job (e.g., via pg_cron or external scheduler)
-- on the 1st of each month

CREATE OR REPLACE FUNCTION reset_api_key_monthly_counters()
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET 
    requests_this_month = 0,
    month_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE month_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies (Row Level Security)
-- ============================================================================
-- API keys should only be accessible via service role (server-side)

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access (which is what we want)
-- The API key validation happens server-side using the service role key

-- ============================================================================
-- Example: Insert a test API key (for development)
-- ============================================================================
-- Uncomment and modify to create a test key:
--
-- INSERT INTO api_keys (key_hash, key_prefix, name, owner_email, permissions)
-- VALUES (
--   'abc123...', -- Replace with actual SHA-256 hash
--   'sk_live_test',
--   'Test Pickleball App',
--   'developer@example.com',
--   ARRAY['pickleball:chat']
-- );
