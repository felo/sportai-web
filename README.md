# SportAI Open

AI-powered sports video analysis for **tennis**, **pickleball**, and **padel**. Upload your gameplay videos and get expert coaching insights, technique breakdowns, and personalized improvement recommendations.

🌐 **Live**: [open.sportai.com](https://open.sportai.com)

---

## ⚠️ CRITICAL: Apple Sign In Secret Rotation

> **🍎 Apple OAuth secrets expire every 6 months!**
> 
> If users can't sign in with Apple, the secret has probably expired.

### Automatic Rotation Setup

Add these **GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `APPLE_TEAM_ID` | `G32F34A58U` |
| `APPLE_CLIENT_ID` | `com.sportai.web.auth` |
| `APPLE_KEY_ID` | `PVNFLYW3W9` |
| `APPLE_PRIVATE_KEY` | Contents of the `.p8` key file |
| `SUPABASE_PROJECT_REF` | `voneabjokpqksnermeub` |
| `SUPABASE_ACCESS_TOKEN` | From [Supabase → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |

The workflow `.github/workflows/rotate-apple-secret.yml` runs automatically on **Jan 1** and **June 1**.

### Manual Rotation

```bash
node scripts/generate-apple-secret.js
```

Then paste the output into Supabase Dashboard → Auth → Providers → Apple → Secret Key.

---

## Features

- 🎾 **Multi-Sport Support** - Tennis, pickleball, and padel analysis
- 📹 **Video Analysis** - Upload videos for AI-powered technique breakdown
- 🤖 **AI Coaching** - Powered by Google Gemini for natural language insights
- 🦴 **Pose Detection** - Real-time body tracking with TensorFlow.js & MediaPipe
- 🎯 **Swing Detection** - Automatic identification of serves, forehands, backhands, volleys
- 🗣️ **Text-to-Speech** - Listen to coaching feedback
- 📊 **Performance Analytics** - Track progress with Nivo charts
- 🔐 **Authentication** - Google & Apple Sign In via Supabase
- 📱 **Mobile Friendly** - Installable as home screen app

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI | Radix UI, Tailwind CSS |
| Auth | Supabase (Google OAuth, Apple Sign In) |
| AI/ML | Google Gemini API, TensorFlow.js, MediaPipe |
| Storage | AWS S3 |
| Database | Supabase (PostgreSQL) |
| Rate Limiting | Upstash Redis |
| Analytics | PostHog, Vercel Analytics |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Accounts for: [Supabase](https://supabase.com), [Google AI Studio](https://makersuite.google.com), [AWS](https://aws.amazon.com), [Upstash](https://upstash.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/felo/sportai-web.git
cd sportai-web

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `.env.local` with:

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AWS S3 (for video uploads)
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=sportai-llm-uploads
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Google Cloud (text-to-speech)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# PostHog Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── analyze-frame/      # Frame-by-frame analysis
│   │   ├── detect-sport/       # Sport detection
│   │   ├── llm/                # Gemini AI endpoint
│   │   ├── pose-data/          # Pose detection data
│   │   ├── profile/            # User profile management
│   │   ├── tactical-analysis/  # Game strategy analysis
│   │   ├── tasks/              # Background task processing
│   │   └── tts/                # Text-to-speech
│   ├── auth/callback/          # OAuth callback handler
│   ├── library/                # User's saved analyses
│   ├── pricing/                # Pricing page
│   └── profile/                # User profile page
├── components/
│   ├── ai-chat/                # AI chat interface
│   ├── auth/                   # Authentication components
│   ├── chat/                   # Chat UI components
│   ├── sidebar/                # Navigation sidebar
│   └── videoPoseViewerV2/      # Video player with pose overlay
├── database/                   # Sport-specific knowledge bases
│   ├── tennis/
│   ├── pickleball/
│   └── padel/
├── hooks/                      # React hooks
├── lib/                        # Utilities and configs
└── scripts/
    └── generate-apple-secret.js  # Apple OAuth secret generator
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm run analyze      # Bundle analyzer
```

## Authentication Setup

### Google OAuth

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Auth → Providers → Google

### Apple Sign In

1. Create App ID with Sign in with Apple in [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Create Services ID linked to the App ID
3. Create a Key for Sign in with Apple
4. Generate client secret: `node scripts/generate-apple-secret.js`
5. Configure in Supabase Dashboard → Auth → Providers → Apple

See the [Apple Sign In Secret Rotation](#-critical-apple-sign-in-secret-rotation) section above.

## S3 Configuration

### CORS Settings

Add to your S3 bucket's CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://open.sportai.com",
      "https://*.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sportai-llm-uploads/*"
    }
  ]
}
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add all environment variables
3. Deploy

### Environment Variables in Vercel

Make sure to set `AWS_REGION=eu-north-1` to force the European S3 bucket.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT

---

Built with ❤️ by the SportAI team
