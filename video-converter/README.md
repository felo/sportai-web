# SportAI Video Converter

FFmpeg-based video conversion service for converting Apple QuickTime MOV files to H.264 MP4 for Gemini API compatibility.

## Deployment to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect this repository (or copy these files to a new repo)
3. Set environment variables:

```
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET_NAME=sportai-llm-uploads
AWS_REGION=eu-north-1
API_SECRET=your-shared-secret
```

4. Deploy!

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables (create a .env file or export directly)
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_S3_BUCKET_NAME=sportai-llm-uploads
export AWS_REGION=eu-north-1
export API_SECRET=test-secret
export PORT=3001

# Run server
npm start
```

## Next.js App Configuration

Add these to your Next.js app's environment variables:

```
CONVERSION_API_URL=https://your-railway-app.up.railway.app
CONVERSION_API_SECRET=same-api-secret-as-above
```

## API Endpoints

### GET /health
Health check endpoint.

### POST /convert
Convert a video from S3.

**Headers:**
- `Authorization: Bearer <API_SECRET>`
- `Content-Type: application/json`

**Body:**
```json
{
  "key": "test/123_video.mov"
}
```

**Response:**
```json
{
  "success": true,
  "originalKey": "test/123_video.mov",
  "convertedKey": "test/123_video_converted.mp4",
  "publicUrl": "https://bucket.s3.region.amazonaws.com/test/123_video_converted.mp4",
  "downloadUrl": "https://presigned-url...",
  "size": 12345678
}
```

## Architecture

```
Client -> S3 (upload MOV) -> Converter Service -> S3 (upload MP4) -> Gemini API
```

