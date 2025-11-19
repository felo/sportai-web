import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function queryGemini(
  prompt: string,
  videoData?: { data: Buffer; mimeType: string } | null
): Promise<string> {
  try {
    // Using Gemini 3 Pro - uses dynamic thinking (high) by default
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });
    
    // Build content parts
    const parts: any[] = [{ text: prompt }];
    
    // Add video if provided
    if (videoData) {
      parts.push({
        inlineData: {
          data: videoData.data.toString("base64"),
          mimeType: videoData.mimeType,
        },
      });
    }
    
    // Use type assertion to work with SDK types
    const result = await model.generateContent(parts as any);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Error querying Gemini:", error);
    
    // Handle rate limiting (429) - check both direct and nested status
    const status = error?.status || error?.response?.status;
    if (status === 429) {
      const retryDelay = error?.errorDetails?.[0]?.retryDelay || "a moment";
      throw new Error(`Rate limit exceeded. Please wait ${retryDelay} before trying again.`);
    }
    
    // Handle other API errors with status codes
    if (error?.status) {
      const statusText = error?.statusText || error?.message || "Unknown error";
      throw new Error(`Gemini API error (${error.status}): ${statusText}`);
    }
    
    // Handle errors with errorDetails array
    if (error?.errorDetails && Array.isArray(error.errorDetails) && error.errorDetails.length > 0) {
      const firstError = error.errorDetails[0];
      const errorMsg = firstError?.message || firstError?.reason || "API error";
      throw new Error(`Gemini API error: ${errorMsg}`);
    }
    
    // Handle generic errors
    const errorMessage = error?.message || error?.toString() || "Failed to query Gemini API";
    throw new Error(errorMessage);
  }
}

