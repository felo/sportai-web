# Video Upload & Analysis API Specification

> Customer Facing (CF) API specification for video upload.

## Overview

This specification describes a simple two-step flow where:
1. Client requests upload credentials and receives both an upload URL and a download URL
2. Client uploads the video directly to S3
3. Client requests analysis by passing the download URL — the CF API forwards it to the ML service

**Important:** The download URL expires after 7 days. Both upload and analysis request must occur within this window.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIDEO UPLOAD & ANALYSIS FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   STEP 1: Request Upload URL                                                 │
│   ┌────────┐      POST /api/video/upload-url        ┌────────────┐          │
│   │ Client │ ─────────────────────────────────────▶│   CF API   │          │
│   │        │   { fileName, contentType }            │            │          │
│   │        │◀─────────────────────────────────────│            │          │
│   └────────┘   { uploadUrl, downloadUrl }           └────────────┘          │
│       │                                                                      │
│       │  Client stores downloadUrl                                           │
│       │                                                                      │
│   STEP 2: Direct Upload to S3                                                │
│       │          PUT (uploadUrl)                                             │
│       │          Content-Type: video/mp4                                     │
│       │          Body: <raw file bytes>                         ┌──────────┐│
│       └───────────────────────────────────────────────────────▶│ S3 Bucket││
│                                                                 └──────────┘│
│                                                                              │
│   STEP 3: Request Analysis (within 7 days)                                   │
│   ┌────────┐      POST /api/statistics/tennis       ┌────────────┐          │
│   │ Client │ ─────────────────────────────────────▶│   CF API   │          │
│   │        │   { videoUrl, ... }                    │            │          │
│   │        │◀─────────────────────────────────────│            │          │
│   └────────┘   { ... }                               └─────┬──────┘          │
│                                                           │                  │
│                                                           │                  │
│   STEP 4: CF API Forwards to ML Service                   │                  │
│                                                           │                  │
│                         ┌─────────────────────────────────┘                  │
│                         │  Forward videoUrl directly                         │
│                         │  to ML service                                     │
│                         ▼                                                    │
│                   ┌────────────┐     { videoUrl, callbackUrl }              │
│                   │ ML Service │◀────────────────────────────               │
│                   └─────┬──────┘                                            │
│                         │                                                    │
│                         │  Fetch video via presigned URL                     │
│                         ▼                                                    │
│                   ┌──────────┐                                              │
│                   │ S3 Bucket│                                              │
│                   └──────────┘                                              │

```

---

## API Endpoints

### Endpoint 1: Request Upload URL

#### `POST /api/video/upload-url`

Returns presigned URLs for upload and download.

#### Authentication

```
Authorization: Bearer …
```

#### Request

```typescript
interface UploadUrlRequest {
  fileName: string;      // Original filename
  contentType: string;   // MIME type (e.g., "video/mp4")
}
```

#### Response

```typescript
interface UploadUrlResponse {
  /** Presigned URL for uploading (PUT request, expires in 1 hour) */
  uploadUrl: string;

  /** Presigned URL for downloading (GET request, expires in 7 days) */
  downloadUrl: string;
}
```

#### Example

```json
// Request
POST /api/video/upload-url
Content-Type: application/json
Authorization: Bearer sk_live_...

{ "fileName": "forehand.mov", "contentType": "video/quicktime" }

// Response (200 OK)
{
  "uploadUrl": "https://bucket.s3.region.amazonaws.com/uploads/1736847600_abc123_forehand.mov?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&...",
  "downloadUrl": "https://bucket.s3.region.amazonaws.com/uploads/1736847600_abc123_forehand.mov?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=604800&..."
}
```

#### Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `fileName and contentType are required` | Missing required fields |
| `401` | `Invalid or missing API key` | Authentication failed |
| `403` | `Missing required permission` | API key lacks permission |
| `429` | `Rate limit exceeded` | Too many requests |
| `500` | `Failed to generate upload URL` | Server error |

---

### Step 2: Client Uploads to S3

Client uploads directly using the `uploadUrl` from Step 1:

```typescript
// Upload with progress tracking
async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status === 200 || xhr.status === 204) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
```

**Important:** The `Content-Type` header must match the `contentType` from Step 1.

---

### Endpoint 2: Request Analysis

#### `POST /api/statistics/tennis`

Client requests video analysis by providing the download URL received in Step 1.

#### Request

```typescript
interface AnalyzeVideoRequest {
  /** Presigned download URL from Step 1 (required) */
  videoUrl: string;

  /** Video duration in seconds (optional - for validation/billing) */
  durationSeconds?: number;

  /** Additional metadata for the analysis (optional) */
  metadata?: {
    playerLevel?: "beginner" | "intermediate" | "advanced";
    shotType?: string;
    [key: string]: unknown;
  };

  /** Webhook URL to receive results (optional - for async notification) */
  callbackUrl?: string;
}
```

#### Response

```typescript
interface AnalyzeVideoResponse {
  /** Unique job ID for tracking */
  jobId: string;

  /** Current status */
  status: "queued" | "processing" | "complete" | "failed";

  /** Estimated processing time in seconds (optional) */
  estimatedSeconds?: number;

  /** URL to poll for status updates */
  statusUrl: string;
}
```

#### Example

```json
// Request
POST /api/statistics/tennis
Content-Type: application/json
Authorization: Bearer sk_live_...

{
  "videoUrl": "https://bucket.s3.region.amazonaws.com/uploads/1736847600_abc123_forehand.mov?X-Amz-Algorithm=...",
  "metadata": {
    "playerLevel": "intermediate",
    "shotType": "forehand_drive"
  }
}

// Response (200 OK)
{
  "jobId": "job_a1b2c3d4e5f6",
  "status": "processing",
  "estimatedSeconds": 30,
  "statusUrl": "/api/jobs/job_a1b2c3d4e5f6/status"
}
```

#### Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `videoUrl is required` | Missing required field |
| `400` | `Invalid videoUrl format` | URL doesn't match expected S3 presigned URL format |
| `401` | `Invalid or missing API key` | Authentication failed |
| `403` | `Video URL has expired` | The 7-day download URL has expired |
| `429` | `Rate limit exceeded` | Too many requests |
| `502` | `Failed to start analysis` | ML service unavailable |

---

### Endpoint 3: Check Job Status

#### `GET /api/jobs/{jobId}/status`

Client polls this endpoint to check analysis progress.

#### Response

```typescript
interface JobStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "complete" | "failed";

  /** Progress percentage (0-100) */
  progress?: number;

  /** Results when complete */
  results?: AnalysisResults;

  /** Error message if failed */
  error?: string;

  /** Timestamps */
  createdAt: string;
  completedAt?: string;
}
```

#### Example

```json
// Request
GET /api/jobs/job_a1b2c3d4e5f6/status
Authorization: Bearer sk_live_...

// Response (200 OK) - Processing
{
  "jobId": "job_a1b2c3d4e5f6",
  "status": "processing",
  "progress": 45,
  "createdAt": "2026-01-14T12:00:00.000Z"
}

// Response (200 OK) - Complete
{
  "jobId": "job_a1b2c3d4e5f6",
  "status": "complete",
  "progress": 100,
  "results": {
    "overallScore": 72,
    "categories": [
      { "name": "power", "score": 68 },
      { "name": "stability", "score": 75 },
      { "name": "balance", "score": 73 }
    ],
    "recommendations": [
      "Focus on hip rotation to generate more power",
      "Good follow-through on your swing"
    ]
  },
  "createdAt": "2026-01-14T12:00:00.000Z",
  "completedAt": "2026-01-14T12:00:28.000Z"
}
```

---

## Internal: ML Service Integration

### CF API Forwards to ML Service

When `/api/statistics/tennis` is called, the CF API:

1. Validates the `videoUrl` format (optional)
2. Creates a job record
3. Forwards the `videoUrl` directly to the ML service
4. Returns the job ID to the client

```typescript
// Inside POST /api/statistics/tennis handler
export async function POST(request: NextRequest) {
  const apiKey = await validateApiKey(request);
  if (!apiKey) return apiKeyUnauthorizedResponse();

  const body: AnalyzeVideoRequest = await request.json();

  // Validate required fields
  if (!body.videoUrl) {
    return NextResponse.json(
      { error: "videoUrl is required" },
      { status: 400 }
    );
  }

  // Create job record in database
  const jobId = `job_${generateId()}`;
  await createAnalysisJob({
    jobId,
    apiKeyId: apiKey.id,
    videoUrl: body.videoUrl,
    status: "processing",
    createdAt: new Date(),
  });

  // Forward videoUrl directly to ML service
  const mlResponse = await fetch(ML_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ML_SERVICE_API_KEY}`,
    },
    body: JSON.stringify({
      jobId: jobId,
      videoUrl: body.videoUrl,    // Forward the presigned URL directly
      metadata: body.metadata,
      callbackUrl: `${process.env.API_BASE_URL}/webhooks/ml-complete`,
    }),
  });

  if (!mlResponse.ok) {
    await updateJobStatus(jobId, "failed");
    return NextResponse.json(
      { error: "Failed to start analysis" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    jobId,
    status: "processing",
    estimatedSeconds: 30,
    statusUrl: `/api/jobs/${jobId}/status`,
  });
}
```

### Payload Sent to ML Service

```typescript
interface MLAnalysisRequest {
  jobId: string;
  videoUrl: string;           // Presigned download URL (from client)
  metadata?: Record<string, unknown>;
  callbackUrl: string;        // CF API webhook URL
}
```

### ML Service Webhook

#### `POST /webhooks/ml-complete`

The ML service calls this endpoint when analysis is complete.

```typescript
interface MLWebhookPayload {
  jobId: string;
  status: "complete" | "failed";
  results?: AnalysisResults;
  error?: string;
  processingTimeMs?: number;
}

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get("X-Webhook-Signature");
  const body = await request.json();

  if (!verifyWebhookSignature(body, signature, process.env.ML_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { jobId, status, results, error } = body as MLWebhookPayload;

  // Update job in database
  await updateAnalysisJob(jobId, {
    status,
    results,
    error,
    completedAt: new Date(),
  });

  // Optionally notify client via their callback URL
  const job = await getAnalysisJob(jobId);
  if (job.callbackUrl) {
    await fetch(job.callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status, results }),
    });
  }

  return NextResponse.json({ received: true });
}
```

---

## Type Definitions

```typescript
// ============================================================================
// API Request/Response Types
// ============================================================================

/** Step 1: Request upload URL */
export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;     // Expires in 1 hour
  downloadUrl: string;   // Expires in 7 days
}

/** Step 3: Request analysis */
export interface AnalyzeVideoRequest {
  videoUrl: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface AnalyzeVideoResponse {
  jobId: string;
  status: JobStatus;
  estimatedSeconds?: number;
  statusUrl: string;
}

/** Job status polling */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress?: number;
  results?: AnalysisResults;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/** Analysis results (structure varies by endpoint) */
export interface AnalysisResults {
  overallScore?: number;
  categories?: Array<{
    name: string;
    score: number;
  }>;
  recommendations?: string[];
  [key: string]: unknown;
}

/** Enums */
export type JobStatus = "queued" | "processing" | "complete" | "failed";

/** Error response */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

// ============================================================================
// Internal Types (ML Service Communication)
// ============================================================================

/** Payload sent TO the ML service */
export interface MLAnalysisRequest {
  jobId: string;
  videoUrl: string;
  metadata?: Record<string, unknown>;
  callbackUrl: string;
}

/** Payload received FROM the ML service (webhook) */
export interface MLWebhookPayload {
  jobId: string;
  status: "complete" | "failed";
  results?: AnalysisResults;
  error?: string;
  processingTimeMs?: number;
}
```

---

## Client Integration Example

```typescript
async function uploadAndAnalyzeVideo(file: File) {
  const apiKey = "sk_live_...";
  const baseUrl = "https://api.example.com";

  // Step 1: Get upload and download URLs
  const uploadRes = await fetch(`${baseUrl}/api/video/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });
  const { uploadUrl, downloadUrl } = await uploadRes.json();

  // Step 2: Upload to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  // Step 3: Request analysis (pass the downloadUrl)
  const analyzeRes = await fetch(`${baseUrl}/api/statistics/tennis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      videoUrl: downloadUrl,
    }),
  });
  const { jobId, statusUrl } = await analyzeRes.json();

  // Step 4: Poll for results
  let result;
  while (true) {
    const statusRes = await fetch(`${baseUrl}${statusUrl}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    result = await statusRes.json();

    if (result.status === "complete" || result.status === "failed") {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
  }

  return result;
}
```

---

## API Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/video/upload-url` | POST | Get presigned upload & download URLs | API Key |
| `/api/statistics/tennis` | POST | Request video analysis | API Key |
| `/api/jobs/{jobId}/status` | GET | Check job status | API Key |
| `/webhooks/ml-complete` | POST | Receive ML results (internal) | Webhook Signature |

---

## Configuration

### Required Environment Variables

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=your-bucket-name

# ML Service Configuration
ML_SERVICE_URL=https://ml-service.example.com/analyze
ML_SERVICE_API_KEY=your_ml_service_key
ML_WEBHOOK_SECRET=your_webhook_secret

# API Configuration
API_BASE_URL=https://api.example.com
```

### S3 Bucket CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Required AWS IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

---

## Validation & Limits

| Constraint | Value | Notes |
|------------|-------|-------|
| Max file size | 100 MB | Validate client-side before upload |
| Supported types | `video/mp4`, `video/quicktime`, `video/webm` | Check `contentType` |
| Upload URL expiry | 1 hour | Client must upload promptly |
| Download URL expiry | **7 days** | Analysis must be requested within this window |
| Filename sanitization | `[^a-zA-Z0-9.-]` → `_` | Prevents path traversal |

---

## Security Considerations

1. **Never expose AWS credentials to clients** - All presigned URL generation happens server-side
2. **Validate content type** - Ensure `contentType` is an allowed video MIME type
3. **Rate limit endpoints** - Recommend 30 req/min per API key
4. **7-day expiry window** - Download URLs expire; client must complete flow within this time
5. **Track usage per API key** - For billing and abuse detection
6. **Verify webhook signatures** - Ensure ML service responses are authentic
7. **Consider virus scanning** - Scan uploaded files asynchronously with S3 triggers

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Return downloadUrl with uploadUrl | Simpler flow; client just stores and forwards the URL |
| No URL refresh mechanism | Keeps implementation simple; 7 days is sufficient for typical use |
| Client passes videoUrl directly | CF API just forwards to ML service; no server-side URL generation needed |
| 7-day download URL expiry | Provides ample time for upload → analysis while limiting exposure |
| Webhook-based completion | Supports long-running analysis without client timeouts |
| Status polling as backup | Clients can poll if webhooks aren't suitable |
| Direct S3 upload | No server bandwidth costs; no upload timeouts |
