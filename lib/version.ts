/**
 * Application Version Configuration
 * 
 * Version is automatically generated at build time from git info.
 * Format: v{major}.{minor}.{commit_count}+{short_sha}
 * 
 * The version increments automatically on each commit to main.
 * - NEXT_PUBLIC_APP_VERSION: Full version string
 * - NEXT_PUBLIC_GIT_SHA: Short git commit SHA
 * - NEXT_PUBLIC_BUILD_DATE: ISO date of build
 */

// Version components from build-time environment variables
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA || 'local';
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString();

/**
 * Full version string (e.g., "v0.6.342")
 */
export const APP_VERSION = VERSION;

/**
 * Short git commit SHA (e.g., "abc1234")
 */
export const GIT_COMMIT_SHA = GIT_SHA;

/**
 * Build date in ISO format
 */
export const BUILD_TIMESTAMP = BUILD_DATE;

/**
 * Display version for UI (e.g., "v0.6.342")
 */
export function getDisplayVersion(): string {
  return APP_VERSION;
}

/**
 * Full version with commit SHA for tooltips (e.g., "v0.6.342 (abc1234)")
 */
export function getFullVersion(): string {
  if (GIT_SHA && GIT_SHA !== 'local') {
    return `${APP_VERSION} (${GIT_SHA})`;
  }
  return APP_VERSION;
}

/**
 * Build info for tooltips (includes date and time)
 */
export function getBuildInfo(): string {
  const date = new Date(BUILD_DATE);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `Built ${formattedDate} at ${formattedTime}`;
}

