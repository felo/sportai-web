/**
 * Shared video size limit messages
 * Used in both client (useAIApi) and server (API route) for consistency
 */

export const LARGE_VIDEO_LIMIT_MB = 100;
export const PRO_VIDEO_LIMIT_MB = 500;

/**
 * Generate a natural response for oversized videos
 * Includes PRO upsell and quick fixes
 */
export function getVideoSizeErrorMessage(sizeMB: number): string {
  return `## Video Size Limit

I can see you've uploaded a video that's **${sizeMB.toFixed(1)} MB** in size (approx 10 min). Unfortunately, that's quite large for me to process on the free tier - I work best with videos under **${LARGE_VIDEO_LIMIT_MB} MB**.

---

### Upgrade to PRO for Larger Videos

Analyze full matches and longer training sessions with **PRO**:

- 📹 Upload videos up to **${PRO_VIDEO_LIMIT_MB} MB**
- ⚡ Priority processing
- 🎯 Advanced technique analysis
- 📊 Detailed performance reports

[Upgrade to PRO](/contact)

*Enterprise plans available for clubs and academies with multi-GB support.*

---

<details>
<summary>💡 Quick Fixes for Free Tier</summary>

Here are a few ways to analyze your video now:

**1. Trim the video**
- Focus on the most important moments or rallies
- Even a 30-60 second clip provides valuable insights!

**2. Compress the video**
- Use HandBrake, Adobe Express, or CloudConvert
- Target a lower bitrate while keeping the resolution

**3. Split into clips**
- Break into shorter segments and submit separately
- Get focused feedback on each segment

</details>

---

I'm here to help you improve! Try again with a smaller file, or reach out about PRO for full video support. 🎾`;
}

