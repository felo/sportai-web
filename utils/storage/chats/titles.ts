import { storageLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";

/**
 * Generate a simple placeholder title for a new chat.
 * The meaningful title is generated later by AI after analysis completes.
 */
export function generateChatTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  
  // If user sent a video (with or without text), use "Video Analysis"
  if (firstUserMessage?.videoFile || firstUserMessage?.videoUrl) {
    return "Video Analysis";
  }
  
  return "New Chat";
}

/**
 * Generate an AI-powered chat title after analysis completes.
 * Uses Gemini API to create a concise, descriptive title based on the conversation.
 * @param messages - The chat messages to generate a title from
 * @param accessToken - Optional JWT access token for higher rate limits
 */
export async function generateAIChatTitle(messages: Message[], accessToken?: string | null): Promise<string> {
  // Find the first substantial assistant response (the analysis)
  const analysisResponse = messages.find(
    (msg) => msg.role === "assistant" && 
             !msg.isGreeting && 
             msg.content.trim().length > 200
  );
  
  if (!analysisResponse) {
    return "Video Analysis";
  }
  
  try {
    // Use first 300 chars of the analysis to generate a meaningful title
    const analysisExcerpt = analysisResponse.content.trim().slice(0, 300);
    
    const titlePrompt = `Generate a concise, descriptive title (maximum 6 words) for this sports video analysis. The title should capture what was analyzed (sport, shot type, technique, etc.). Examples: "Tennis Forehand Technique Analysis", "Padel Serve Form Review", "Basketball Free Throw Breakdown".

Analysis excerpt:
${analysisExcerpt}

Title:`;
    
    const formData = new FormData();
    formData.append("prompt", titlePrompt);
    formData.append("thinkingMode", "fast");
    formData.append("mediaResolution", "low");
    
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch("/api/llm", {
      method: "POST",
      body: formData,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const title = data.response?.trim();
    
    if (!title) {
      return "Video Analysis";
    }
    
    // Ensure title is reasonable length
    return title.length > 60 ? title.slice(0, 57) + "..." : title;
  } catch (error) {
    storageLogger.error("Failed to generate AI title:", error);
    return "Video Analysis";
  }
}

