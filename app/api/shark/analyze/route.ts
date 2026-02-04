/**
 * Shark Technique Analysis API Route
 *
 * Proxies video uploads to the SportAI Shark technique analysis API.
 * Endpoint: POST /api/shark/analyze
 *
 * Request: multipart/form-data with:
 * - file: Video file (.mp4, .mov, .avi, .mkv) OR
 * - videoUrl: S3 URL to fetch video from (preferred for large files to avoid 413 errors)
 * - metadata: JSON string with analysis parameters
 *
 * Response: Streaming JSON with analysis results
 */

import { NextRequest, NextResponse } from "next/server";
import { getSportAIApiUrl, getSportAIApiKey } from "@/lib/sportai-api";

// Supported video formats
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska", // .mkv
];

// Required metadata fields
const REQUIRED_METADATA_FIELDS = [
  "uid",
  "sport",
  "swing_type",
  "dominant_hand",
  "player_height_mm",
];

interface SharkMetadata {
  uid: string;
  sport: "pickleball" | "tennis" | "padel";
  swing_type: string;
  dominant_hand: "left" | "right";
  player_height_mm: number;
  store_data?: boolean;
  ball_timestamp?: number;
  request_id?: string;
  timestamp?: string;
  form_session_id?: string;
}

/**
 * Fetch video from S3 URL and return as a Blob
 * Used when client sends videoUrl instead of file to avoid 413 body size limits
 */
async function fetchVideoFromUrl(url: string): Promise<{ blob: Blob; filename: string }> {
  console.log(`[Shark API] Fetching video from URL: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video from URL: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();

  // Extract filename from URL or use default
  const urlPath = new URL(url).pathname;
  const filename = urlPath.split('/').pop() || 'video.mp4';

  console.log(`[Shark API] Fetched video: ${filename} (${blob.size} bytes)`);

  return { blob, filename };
}

export async function POST(request: NextRequest) {
  try {
    // Get API configuration
    const apiUrl = getSportAIApiUrl();
    const apiKey = getSportAIApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: "SportAI API key not configured" },
        { status: 500 }
      );
    }

    // Parse the incoming form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const videoUrl = formData.get("videoUrl") as string | null;
    const metadataString = formData.get("metadata") as string | null;

    // Determine video source: prefer videoUrl (avoids 413), fallback to file
    let videoBlob: Blob;
    let videoFilename: string;

    if (videoUrl) {
      // Fetch video from S3 URL (server-side, avoids client upload size limits)
      try {
        const { blob, filename } = await fetchVideoFromUrl(videoUrl);
        videoBlob = blob;
        videoFilename = filename;
      } catch (error) {
        console.error("[Shark API] Failed to fetch video from URL:", error);
        return NextResponse.json(
          { error: "Failed to fetch video from URL", details: String(error) },
          { status: 400 }
        );
      }
    } else if (file) {
      // Use directly uploaded file (may fail with 413 for large files)
      if (!SUPPORTED_VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mkv)$/i)) {
        return NextResponse.json(
          { error: `Unsupported video format. Supported: .mp4, .mov, .avi, .mkv` },
          { status: 400 }
        );
      }
      videoBlob = file;
      videoFilename = file.name;
    } else {
      return NextResponse.json(
        { error: "No video file or videoUrl provided" },
        { status: 400 }
      );
    }

    // Validate metadata
    if (!metadataString) {
      return NextResponse.json(
        { error: "No metadata provided" },
        { status: 400 }
      );
    }

    let metadata: SharkMetadata;
    try {
      metadata = JSON.parse(metadataString);
    } catch {
      return NextResponse.json(
        { error: "Invalid metadata JSON" },
        { status: 400 }
      );
    }

    // Check required fields
    const missingFields = REQUIRED_METADATA_FIELDS.filter(
      (field) => !(field in metadata) || metadata[field as keyof SharkMetadata] === undefined
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required metadata fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Build the form data to forward to Shark API
    const forwardFormData = new FormData();
    forwardFormData.append("file", videoBlob, videoFilename);
    forwardFormData.append("metadata", metadataString);

    // Make the request to Shark API
    const sharkApiUrl = `${apiUrl}/api/technique_analysis/pickleball`;

    console.log(`[Shark API] Sending request to ${sharkApiUrl}`);
    console.log(`[Shark API] Video: ${videoFilename} (${videoBlob.size} bytes)${videoUrl ? ' (fetched from S3)' : ' (direct upload)'}`);
    console.log(`[Shark API] Metadata:`, metadata);

    const response = await fetch(sharkApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: forwardFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Shark API] Error response (${response.status}):`, errorText);

      return NextResponse.json(
        {
          error: `Shark API error: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    // Stream the response back to the client
    if (!response.body) {
      return NextResponse.json(
        { error: "No response body from Shark API" },
        { status: 502 }
      );
    }

    // Create a transform stream to pass through the response
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const reader = response.body.getReader();

    // Process the stream in the background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await writer.close();
            break;
          }
          await writer.write(value);
        }
      } catch (error) {
        console.error("[Shark API] Stream error:", error);
        await writer.abort(error);
      }
    })();

    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Shark API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// Note: App Router doesn't use Pages Router config format.
// For large video uploads, use videoUrl parameter to fetch from S3 server-side,
// which avoids the client->server body size limit (~4.5MB on Vercel).
