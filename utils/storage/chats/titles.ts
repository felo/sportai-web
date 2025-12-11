import { storageLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";

/**
 * Generate a chat title from the first user message
 * Improved version with better text extraction
 */
export function generateChatTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (firstUserMessage) {
    // If message has video but no text, use a video-specific title
    if ((firstUserMessage.videoFile || firstUserMessage.videoUrl) && 
        !firstUserMessage.content.trim()) {
      return "Video Analysis";
    }
    
    const content = firstUserMessage.content.trim();
    if (content.length === 0) return "New Chat";
    
    // Try to extract first sentence (up to 50 chars)
    const firstSentence = content.match(/^[^.!?]+[.!?]?/)?.[0];
    if (firstSentence && firstSentence.length <= 50) {
      return firstSentence;
    }
    
    // Otherwise, truncate at word boundary near 50 chars
    if (content.length > 50) {
      const truncated = content.slice(0, 47);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 20 
        ? truncated.slice(0, lastSpace) + '...'
        : truncated + '...';
    }
    
    return content;
  }
  return "New Chat";
}

/**
 * Generate an AI-powered chat title from the first exchange
 * Uses Gemini API to create a concise, descriptive title
 */
export async function generateAIChatTitle(messages: Message[]): Promise<string> {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  const firstAssistantMessage = messages.find((msg) => msg.role === "assistant");
  
  if (!firstUserMessage) return "New Chat";
  
  // If we have both user and assistant messages, generate a smart title
  if (firstAssistantMessage && firstAssistantMessage.content.trim()) {
    try {
      // Check if user message has video but no text
      const hasVideoOnly = (firstUserMessage.videoFile || firstUserMessage.videoUrl) && 
                          !firstUserMessage.content.trim();
      
      // Truncate messages to keep token usage minimal (200 chars each)
      const userExcerpt = firstUserMessage.content.trim().slice(0, 200);
      const assistantExcerpt = firstAssistantMessage.content.trim().slice(0, 200);
      
      // Improve prompt for video-only messages to include analysis details
      let titlePrompt: string;
      if (hasVideoOnly) {
        titlePrompt = `Generate a concise, descriptive title (maximum 6 words) for this video analysis conversation. The title should include what was analyzed (e.g., "Tennis serve technique analysis" or "Basketball shooting form review"). Base it on the assistant's response:\n\nAssistant: ${assistantExcerpt}\n\nTitle:`;
      } else {
        titlePrompt = `Generate a concise, descriptive title (maximum 6 words) for this conversation:\n\nUser: ${userExcerpt}\n\nAssistant: ${assistantExcerpt}\n\nTitle:`;
      }
      
      // Use FormData for the API request (required by the API route)
      const formData = new FormData();
      formData.append("prompt", titlePrompt);
      formData.append("thinkingMode", "fast");
      formData.append("mediaResolution", "low");
      
      const response = await fetch("/api/llm", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const title = data.response?.trim() || generateChatTitle(messages);
      
      // Ensure title is reasonable length (fallback if AI generates something too long)
      return title.length > 60 ? title.slice(0, 57) + "..." : title;
    } catch (error) {
      storageLogger.error("Failed to generate AI title:", error);
      // Fallback to text-based title generation
      return generateChatTitle(messages);
    }
  }
  
  // Fallback to text-based extraction if no assistant response yet
  return generateChatTitle(messages);
}



