# Text-to-Speech Setup Guide

This guide explains how to set up Google Cloud Text-to-Speech for the SportAI application.

## Prerequisites

1. Google Cloud Project with Text-to-Speech API enabled
2. Service account key (JSON file) or API key

## Authentication Options

The application supports three authentication methods (in priority order):

### Option 1: Service Account JSON (Recommended for Production)

Best for: Vercel, Netlify, or any hosting platform that supports environment variables.

1. Save your service account JSON key file securely (e.g., `sportai-tts-key.json`)
2. Add the **entire JSON content** as a single-line environment variable:

```bash
# .env.local
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'
```

**For Vercel:**
- Go to Project Settings → Environment Variables
- Add `GOOGLE_CLOUD_CREDENTIALS`
- Paste the entire JSON content as the value (remove line breaks)

### Option 2: Service Account File Path (Recommended for Local Development)

Best for: Local development on your machine.

1. Save your service account JSON key file:
   ```bash
   mkdir -p ~/.config/gcloud
   mv sportai-tts-key.json ~/.config/gcloud/
   ```

2. Add the file path to your environment:
   ```bash
   # .env.local
   GOOGLE_APPLICATION_CREDENTIALS=/Users/yourusername/.config/gcloud/sportai-tts-key.json
   ```

### Option 3: API Key (Simplest, Less Secure)

Best for: Quick testing or simple deployments.

```bash
# .env.local
GOOGLE_CLOUD_TTS_API_KEY=your_api_key_here
# OR reuse your Gemini key if it has TTS permissions:
GEMINI_API_KEY=your_gemini_key
```

## Setting Up the Service Account

If you don't have a service account yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **+ CREATE SERVICE ACCOUNT**
5. Name it: `sportai-ai-services` or `sportai-tts-service`
6. Grant role: **Cloud Text-to-Speech User** (`roles/cloudtexttospeech.user`)
7. Click **Keys** → **Add Key** → **Create new key** → **JSON**
8. Download and save the JSON file securely

## Enable Text-to-Speech API

1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Text-to-Speech API"
3. Click **Enable**

## Voice Quality Options

The application supports multiple voice quality levels:

- **Standard**: Basic quality, $4.00 per 1M characters
- **WaveNet**: Good quality, $16.00 per 1M characters
- **Neural2**: High quality (default), $16.00 per 1M characters
- **Studio**: Premium quality, $100.00 per 1M characters
  - Limited availability (US and UK English only)
  - Automatically falls back to Neural2 for other languages

## Voice Availability

- **Standard, WaveNet, Neural2**: Available for all supported languages/accents
- **Studio**: Only available for:
  - English (US): Male, Female, Neutral
  - English (UK): Male, Female
  - Automatically falls back to Neural2 for Australian and Indian English

## Pricing

- **Standard voices**: $4.00 per 1M characters
- **WaveNet/Neural2 voices**: $16.00 per 1M characters (default)
- **Studio voices**: $100.00 per 1M characters (limited availability)
- **Free tier**: 1M characters per month for WaveNet/Neural2 voices
- A typical 1000-character response costs ~$0.016

## Testing

After setting up credentials:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Look for the initialization message in the console:
   ```
   [TTS] ✅ Client initialized with service account credentials (JSON)
   ```

3. In the app, click the speaker icon (🔊) next to any AI response

4. You should see:
   - Loading spinner while audio generates
   - Audio starts playing automatically
   - Red stop button appears in bottom-right corner

## Troubleshooting

### "No credentials configured" warning

Make sure you've set one of the environment variables and restarted your dev server.

### "Failed to synthesize speech" error

1. Check that the Text-to-Speech API is enabled in your Google Cloud project
2. Verify your service account has the **Cloud Text-to-Speech User** role
3. Check the browser console and server logs for detailed error messages

### Audio not playing

1. Check browser console for errors
2. Verify the `/api/tts` endpoint is accessible
3. Ensure your S3 bucket is configured correctly (if using S3 caching)

## Security Best Practices

✅ **DO:**
- Store service account keys in `.env.local` (already in `.gitignore`)
- Use environment variables for production deployments
- Rotate keys regularly
- Restrict service account permissions to only Text-to-Speech

❌ **DON'T:**
- Commit service account JSON files to git
- Share keys publicly
- Use the same key across multiple projects
- Give the service account more permissions than needed

## File Locations

- Service account key: Store outside the repo or in `~/.config/gcloud/`
- Environment variables: `.env.local` (local) or hosting platform (production)
- Implementation: `lib/text-to-speech.ts`
- API endpoint: `app/api/tts/route.ts`

## Support

If you encounter issues, check:
1. Server logs (terminal running `npm run dev`)
2. Browser console (F12 → Console)
3. Network tab (F12 → Network) to see API requests

