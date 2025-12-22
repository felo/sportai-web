/**
 * SportAI API Configuration
 * 
 * Environment Variables:
 * - SPORTAI_API_URL: Base URL for the SportAI API (defaults to production)
 * - SPORTAI_API_KEY: API key for production
 * - SPORTAI_API_KEY_STAGING: API key for staging (used when URL is staging)
 */

const PRODUCTION_URL = "https://api.sportai.com";
const STAGING_URL = "https://staging.api.sportai.com";

/**
 * Get the SportAI API URL from environment or default to production
 */
export function getSportAIApiUrl(): string {
  return process.env.SPORTAI_API_URL || PRODUCTION_URL;
}

/**
 * Get the appropriate API key based on the current environment
 * Uses staging key when URL points to staging, otherwise production key
 */
export function getSportAIApiKey(): string | undefined {
  const apiUrl = getSportAIApiUrl();
  
  if (apiUrl.includes("staging")) {
    return process.env.SPORTAI_API_KEY_STAGING;
  }
  
  return process.env.SPORTAI_API_KEY;
}

/**
 * Check if currently using staging environment
 */
export function isStaging(): boolean {
  return getSportAIApiUrl().includes("staging");
}

/**
 * Get environment label for logging
 */
export function getEnvironmentLabel(): string {
  return isStaging() ? "STAGING" : "PRODUCTION";
}

export const SportAIConfig = {
  PRODUCTION_URL,
  STAGING_URL,
  getUrl: getSportAIApiUrl,
  getApiKey: getSportAIApiKey,
  isStaging,
  getEnvironmentLabel,
} as const;










