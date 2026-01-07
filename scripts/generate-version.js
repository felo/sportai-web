#!/usr/bin/env node

/**
 * Version Generation Script
 * 
 * Generates version info from git at build time.
 * Run as part of the build process to set environment variables.
 * 
 * Usage: node scripts/generate-version.js
 * 
 * Outputs JSON with version info that can be used by next.config.ts
 */

const { execSync } = require('child_process');

function getGitInfo() {
  try {
    // Get the total number of commits on main/master branch
    // This gives us an auto-incrementing build number
    let commitCount;
    try {
      // Try to get commit count from main
      commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      commitCount = '0';
    }

    // Get short SHA
    let shortSha;
    try {
      shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      shortSha = 'unknown';
    }

    // Get the current branch
    let branch;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      branch = 'unknown';
    }

    return { commitCount, shortSha, branch };
  } catch {
    return { commitCount: '0', shortSha: 'unknown', branch: 'unknown' };
  }
}

function generateVersion() {
  // Check for Vercel environment variables first (available during Vercel builds)
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF;
  
  // Base version (major.minor) - update these manually for breaking changes
  const MAJOR = 0;
  const MINOR = 6;
  
  let commitCount, shortSha, branch;
  
  if (vercelSha) {
    // Running on Vercel
    shortSha = vercelSha.substring(0, 7);
    branch = vercelBranch || 'main';
    // Vercel doesn't provide commit count, so we use timestamp-based patch
    // This ensures uniqueness and always increases
    const now = new Date();
    // Format: YYMMDDHH (e.g., 25121714 for Dec 17, 2025, 2pm)
    commitCount = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}`;
  } else {
    // Running locally - use git
    const gitInfo = getGitInfo();
    commitCount = gitInfo.commitCount;
    shortSha = gitInfo.shortSha;
    branch = gitInfo.branch;
  }
  
  // Version format: v{major}.{minor}.{patch}
  const version = `v${MAJOR}.${MINOR}.${commitCount}`;
  
  const buildDate = new Date().toISOString();
  
  const versionInfo = {
    version,
    shortSha,
    branch,
    buildDate,
    major: MAJOR,
    minor: MINOR,
    patch: commitCount,
  };
  
  // Output JSON that can be parsed by build tools
  console.log(JSON.stringify(versionInfo, null, 2));
  
  return versionInfo;
}

// Run if called directly
if (require.main === module) {
  generateVersion();
}

module.exports = { generateVersion, getGitInfo };








