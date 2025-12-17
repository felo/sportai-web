# sportai-web

A Next.js application with minimal UI, Radix UI components, server-side rendering, and Gemini 3 integration.

## Features

- ⚡ Next.js 15 with App Router
- 🎨 Radix UI components for accessible UI
- 🔄 Server-side rendering
- 🤖 Gemini 3 API integration
- 📹 Video and image upload support with S3 integration
- 💅 Tailwind CSS for styling
- 📝 TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- (Optional) AWS S3 bucket for video uploads - see [S3 Configuration](#s3-configuration) below

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory and add your environment variables:
```
GEMINI_API_KEY=your_api_key_here

# Optional: AWS S3 configuration for video uploads
# If not configured, the app will fall back to direct uploads (limited to 4.5MB on Vercel)
# Default region is eu-north-1 (Europe). Set this in Vercel to force Europe region.
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=sportai-llm-uploads
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# Optional: Upstash Redis for rate limiting (recommended for production)
# Without these, rate limiting uses in-memory storage (doesn't work across serverless instances)
# Get these from https://console.upstash.com/
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── gemini/
│   │       └── route.ts      # API route for Gemini queries
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   └── gemini-query-form.tsx # Gemini query form component
├── lib/
│   └── gemini.ts             # Gemini API utilities
└── package.json
```

## Usage

The app includes a simple form where you can query Gemini 3. The queries are processed server-side through the API route at `/api/gemini`.

### Video Uploads

The app supports uploading videos and images for analysis. There are two upload methods:

1. **S3 Upload (Recommended)**: Videos are uploaded directly to AWS S3 using presigned URLs, bypassing server size limits. This allows for larger file uploads (up to 20MB by default).

2. **Direct Upload (Fallback)**: If S3 is not configured, videos are uploaded directly to the API route. This is limited to 4.5MB on Vercel deployments.

### S3 Configuration

To enable S3 uploads, you need to:

1. **Create an S3 bucket** in AWS (or use an existing one)
   - Bucket name: `sportai-llm-uploads` (or configure via `AWS_S3_BUCKET_NAME`)
   - Region: `eu-north-1` (default, Europe). Set `AWS_REGION=eu-north-1` in Vercel to force Europe region.
   - Make the bucket public or configure CORS appropriately

2. **Create an IAM user** with S3 permissions:
   - Create a new IAM user in AWS Console
   - Attach a policy with `s3:PutObject` permission for your bucket
   - Generate access keys for the user

3. **Configure bucket CORS** (REQUIRED for browser uploads):
   
   **Step-by-step instructions:**
   
   a. Go to AWS Console → S3 → Click on your bucket (`sportai-llm-uploads`)
   
   b. Click on the **Permissions** tab (at the top)
   
   c. Scroll down to find **Cross-origin resource sharing (CORS)** section
   
   d. Click **Edit** button
   
   e. Delete any existing CORS configuration and paste this (includes localhost for development and production):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
       "AllowedOrigins": [
         "http://localhost:3000",
         "https://sportai-web-llm-git-main-sport-ai.vercel.app",
         "https://*.vercel.app",
         "https://llm.sportai.com"
       ],
       "ExposeHeaders": ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   
   **Important**: If you're using Vercel preview deployments, you may need to add `"https://*.vercel.app"` or be more specific with your production domain. The wildcard `*.vercel.app` covers all Vercel preview deployments.
   
   f. Click **Save changes**
   
   **Note**: The `AllowedOrigins: ["*"]` allows all origins. For production, you should restrict this to your domain (e.g., `["https://yourdomain.com"]`). For local development, you can also add `["*", "http://localhost:3000"]` to be explicit.
   
   **If you get an error**, try this more permissive configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET", "HEAD", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Set bucket policy** to allow public reads (if bucket is public):
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

5. **Add environment variables** to your `.env.local` (and **set them in Vercel for production**):
   ```
   AWS_REGION=eu-north-1
   AWS_S3_BUCKET_NAME=sportai-llm-uploads
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   ```
   
   **⚠️ CRITICAL**: Set `AWS_REGION=eu-north-1` in Vercel environment variables to force the Europe region. This ensures all S3 operations use the European bucket.

**Note**: Make sure your `AWS_REGION` environment variable matches your bucket's actual region. You can check your bucket's region in the AWS Console. The bucket URL format is `https://bucket-name.s3.region.amazonaws.com/`.

### Troubleshooting S3 Uploads

If you get "Upload failed due to network error" or CORS errors:

1. **Check CORS configuration**: Make sure CORS is properly configured (see step 3 above). The error usually means CORS is missing or incorrect.
   
   **Common CORS Error**: If you see `"No 'Access-Control-Allow-Origin' header is present"`:
   - Your production domain must be in the `AllowedOrigins` array
   - For Vercel deployments, add `"https://*.vercel.app"` or your specific domain
   - Make sure `AllowedMethods` includes `"PUT"`
   - Make sure `AllowedHeaders` includes `"*"` or at least `"Content-Type"`

2. **Check IAM permissions**: Your IAM user needs both `s3:PutObject` (for uploads) and `s3:GetObject` (for downloads). The policy should look like:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject"
         ],
         "Resource": "arn:aws:s3:::sportai-llm-uploads/*"
       }
     ]
   }
   ```
   
   **To fix the current error:**
   - Go to AWS Console → IAM → Users → `WebLLM`
   - Click on the policy attached to this user
   - Edit the policy and add `s3:GetObject` to the Action array
   - Save the changes

3. **Check browser console**: Open browser DevTools (F12) → Console tab. Look for CORS errors or detailed error messages.

4. **Verify bucket region**: Make sure `AWS_REGION` matches your bucket's actual region.

5. **Test presigned URL**: The console logs will show if the presigned URL is generated successfully. If it fails at that step, check your AWS credentials.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Google Generative AI** - Gemini 3 API client

## License

MIT
