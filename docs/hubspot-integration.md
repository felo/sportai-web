# HubSpot Integration

This document describes the HubSpot tracking integration added to SportAI.

## Overview

HubSpot tracking has been integrated into the SportAI website. Once activated, it enables:

- **Visitor Tracking** — All website visitors are tracked and their behavior is sent to HubSpot CRM
- **Live Chat Widget** — The HubSpot chat widget will appear on the site (if configured in HubSpot)
- **Form Tracking** — Form submissions are automatically captured
- **Lead Intelligence** — Returning visitors are identified and their browsing history is recorded
- **Contact Identification** — When users sign in, they are linked to their HubSpot contact record

## Activation

To activate HubSpot tracking, add the following environment variable:

```
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=144170638
```

This needs to be added to the production environment variables (e.g., in Vercel dashboard or the deployment platform).

**Note:** The tracking script only loads in production, not in local development environments.

## What Gets Tracked

Once active, HubSpot will automatically receive:

| Data | Description |
|------|-------------|
| Page Views | Every page a visitor views |
| Session Duration | How long visitors spend on the site |
| Traffic Source | Where visitors came from (Google, social media, direct, etc.) |
| Device Info | Browser, device type, location |
| Return Visits | When the same visitor comes back |

## Chat Widget

If you configure a chat flow in HubSpot (under Conversations > Chatflows), the chat widget will automatically appear on the website. This allows:

- Live chat with visitors
- Chatbot automation
- Meeting scheduling
- Lead qualification

To configure the chat widget, go to your HubSpot account:
1. Navigate to **Conversations** → **Chatflows**
2. Create or edit a chatflow
3. Set targeting rules for which pages show the chat
4. Publish the chatflow

## Cookie Consent

The integration respects user privacy choices:

- Tracking only activates after users accept cookies via the cookie consent banner
- Users who decline cookies will not be tracked
- This ensures GDPR/privacy compliance

## HubSpot Dashboard

All tracked data appears in your HubSpot account at https://app.hubspot.com

Key areas to explore:
- **Contacts** — View individual contact profiles and activity
- **Reports** → **Analytics Tools** → **Traffic Analytics** — Website traffic overview
- **Conversations** — Manage chat interactions

## Technical Details

- **Portal ID:** 144170638
- **Region:** EU (js-eu1.hs-scripts.com)
- **Loading:** Asynchronous (doesn't slow down page load)
- **Consent:** Integrated with existing cookie consent system

## Questions?

For HubSpot configuration questions, refer to the [HubSpot Knowledge Base](https://knowledge.hubspot.com/).

For technical implementation questions, contact the development team.
