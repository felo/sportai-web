# SportAI Analytics & Tracking Overview

> **For Marketing Team** — Last Updated: December 2025

This document explains what user data is tracked in SportAI, which platforms receive this data, and what events you can use for reporting and campaigns.

---

## 📊 Analytics Platforms Used

SportAI uses **three analytics platforms** that work together:

| Platform | Purpose | Dashboard Access |
|----------|---------|------------------|
| **PostHog** | Main analytics – user behavior, events, funnels | [eu.posthog.com](https://eu.posthog.com) |
| **Google Analytics 4** | Traffic analysis, acquisition, demographics | [analytics.google.com](https://analytics.google.com) |
| **Vercel Analytics** | Page performance & Core Web Vitals | Vercel Dashboard |

### How They Work Together

```
User Action → SportAI App → All 3 Platforms receive the same event data
```

All events are sent to all platforms simultaneously, so you'll see consistent data across dashboards.

---

## 🎯 Events We Track

### Video Events

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `video_uploaded` | User successfully uploads a video | `fileSizeMB`, `sport` |
| `video_upload_failed` | Upload fails (too large, wrong format, etc.) | `error`, `fileSizeMB` |
| `video_play_started` | User plays a video | `durationSeconds` |

**Marketing Use:** Track video upload conversion funnel, identify drop-off points.

---

### Analysis Events

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `pose_detection_started` | AI pose detection begins | `analysisType`, `processingTimeMs` |
| `tactical_analysis_requested` | User requests tactical analysis | `sport` |
| `frame_analysis_requested` | User requests frame-by-frame analysis | `sport`, `analysisType` |
| `analysis_completed` | Any analysis finishes successfully | `analysisType`, `sport`, `processingTimeMs` |
| `analysis_failed` | Analysis encounters an error | `analysisType`, `sport`, `errorMessage` |

**Marketing Use:** Understand which analysis types are most popular, track AI feature engagement.

---

### Chat & AI Events

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `chat_started` | User starts a new conversation | `messageType` |
| `chat_message_sent` | User sends a message | `hasVideo` (true/false) |

**Marketing Use:** Measure AI coach engagement, video vs. text-only conversations.

---

### Authentication Events

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `auth_started` | User clicks sign-in button | `method` (google, email, etc.) |
| `auth_completed` | User successfully logs in | `method`, `success` |
| `auth_failed` | Login attempt fails | `method`, `error` |
| `logout` | User logs out | — |

**Marketing Use:** Track sign-up conversion rates, popular auth methods.

---

### Conversion Events ⭐

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `pricing_page_viewed` | User visits the pricing page | `source` |
| `waitlist_joined` | User signs up for waitlist | `plan`, `source` |
| `feature_gated` | User hits a premium feature limit | `feature`, `source` |

**Marketing Use:** 
- **`pricing_page_viewed`** — Top of purchase funnel
- **`waitlist_joined`** — Lead generation metric
- **`feature_gated`** — Identifies upgrade opportunities

---

### Error Events

| Event Name | When It Fires | Key Properties |
|------------|---------------|----------------|
| `error_displayed` | An error occurs in the app | `errorType`, `errorMessage`, `errorSource` |

**Marketing Use:** Monitor user experience quality, identify problematic flows.

---

## 👤 User Identification

When a user **logs in**, we identify them across all platforms with:

| Property | Description |
|----------|-------------|
| `userId` | Unique user ID (from Supabase Auth) |
| `email` | User's email address |
| `name` | User's display name (from Google/social login) |

This allows you to:
- Track the same user across devices
- Build user segments (e.g., "users who uploaded 3+ videos")
- Attribute conversions to specific users

**Note:** Anonymous users are tracked with a device-based ID until they sign in.

---

## 🔒 Privacy & GDPR Compliance

### Cookie Consent

SportAI shows a **cookie consent banner** to all new visitors. Users can:
- ✅ **Accept All** — Enables analytics + marketing tracking
- ⚙️ **Customize** — Choose which cookies to allow
- ❌ **Necessary Only** — Blocks analytics and marketing tracking

### What Happens Based on Consent

| User Choice | Analytics Tracking | Google Ads | PostHog |
|-------------|-------------------|------------|---------|
| Accept All | ✅ Enabled | ✅ Enabled | ✅ Enabled |
| Analytics Only | ✅ Enabled | ❌ Blocked | ✅ Enabled |
| Necessary Only | ❌ Blocked | ❌ Blocked | ❌ Blocked |

### Do Not Track

If a user has **"Do Not Track"** enabled in their browser, no analytics are collected regardless of consent.

---

## 📈 Key Metrics for Marketing

### User Engagement Funnel

```
Page Visit → Video Upload → Analysis Run → Return Visit
```

Track with:
1. `page_view` (automatic)
2. `video_uploaded`
3. `analysis_completed`
4. Returning user segments in PostHog

### Conversion Funnel

```
Page Visit → Pricing Page → Waitlist Signup
```

Track with:
1. `page_view`
2. `pricing_page_viewed`
3. `waitlist_joined`

### Feature Adoption

Track which sports and analysis types are most popular:
- Filter `analysis_completed` by `sport` property
- Filter by `analysisType` (technique, tactical, pose, frame)

---

## 🔍 Where to Find This Data

### PostHog (Primary)

1. Go to [eu.posthog.com](https://eu.posthog.com)
2. **Events** — See all events in real-time
3. **Dashboards** — Create custom marketing dashboards
4. **Funnels** — Build conversion funnels
5. **Cohorts** — Create user segments

### Google Analytics 4

1. Go to [analytics.google.com](https://analytics.google.com)
2. **Reports** → **Engagement** → **Events** — See all events
3. **Explore** — Build custom reports
4. **Advertising** — Connect to Google Ads for remarketing

### Vercel Analytics

1. Go to your Vercel project dashboard
2. **Analytics** tab — Page performance metrics
3. Use for Core Web Vitals and page load times

---

## 📝 Event Properties Reference

### Common Properties (Available on Most Events)

| Property | Type | Description |
|----------|------|-------------|
| `userId` | string | Logged-in user's ID |
| `timestamp` | number | Unix timestamp of the event |
| `sport` | string | `tennis`, `padel`, or `pickleball` |

### Video Properties

| Property | Type | Description |
|----------|------|-------------|
| `fileSizeMB` | number | Video file size in megabytes |
| `durationSeconds` | number | Video duration in seconds |
| `videoId` | string | Unique video identifier |

### Analysis Properties

| Property | Type | Description |
|----------|------|-------------|
| `analysisType` | string | `technique`, `tactical`, `pose`, or `frame` |
| `processingTimeMs` | number | How long the analysis took |
| `success` | boolean | Whether analysis completed successfully |

### Auth Properties

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | `google`, `email`, or `anonymous` |
| `success` | boolean | Whether auth succeeded |

---

## ❓ Questions?

For questions about analytics data or custom tracking needs, contact the development team.

**Useful Links:**
- PostHog Docs: [posthog.com/docs](https://posthog.com/docs)
- GA4 Docs: [support.google.com/analytics](https://support.google.com/analytics)

