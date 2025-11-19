import { NextRequest, NextResponse } from "next/server";
import { queryGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const videoFile = formData.get("video") as File | null;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let videoData: { data: Buffer; mimeType: string } | null = null;
    
    if (videoFile) {
      // Convert file to buffer
      const arrayBuffer = await videoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      videoData = {
        data: buffer,
        mimeType: videoFile.type,
      };
    }

    const response = await queryGemini(prompt, videoData);
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    
    // Return 429 for rate limiting, 500 for other errors
    const status = errorMessage.includes("Rate limit") ? 429 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

