/**
 * Analysis Tags Utility
 * 
 * Parses and manages skill tags from LLM analysis responses.
 * Tags are used to build athlete skill profiles over time.
 */

export interface AnalysisTags {
  strengths: string[];
  improvements: string[];
}

/**
 * Parse analysis tags from LLM response content.
 * Looks for tags in the format:
 * [TAGS_STRENGTHS: tag1, tag2, tag3]
 * [TAGS_IMPROVEMENTS: tag1, tag2, tag3]
 * 
 * @param content - The full LLM response content
 * @returns AnalysisTags object with strengths and improvements arrays, or null if no tags found
 */
export function parseAnalysisTags(content: string): AnalysisTags | null {
  const strengthsMatch = content.match(/\[TAGS_STRENGTHS:\s*([^\]]+)\]/i);
  const improvementsMatch = content.match(/\[TAGS_IMPROVEMENTS:\s*([^\]]+)\]/i);

  // Return null if neither tag type is found
  if (!strengthsMatch && !improvementsMatch) {
    return null;
  }

  const parseTags = (match: RegExpMatchArray | null): string[] => {
    if (!match || !match[1]) return [];
    return match[1]
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length < 50); // Filter out empty or overly long tags
  };

  return {
    strengths: parseTags(strengthsMatch),
    improvements: parseTags(improvementsMatch),
  };
}

/**
 * Strip analysis tags from content for display.
 * Removes the [TAGS_STRENGTHS: ...] and [TAGS_IMPROVEMENTS: ...] lines from the content.
 * 
 * @param content - The full LLM response content
 * @returns Content with tags stripped out
 */
export function stripAnalysisTags(content: string): string {
  return content
    .replace(/\[TAGS_STRENGTHS:\s*[^\]]*\]\s*/gi, '')
    .replace(/\[TAGS_IMPROVEMENTS:\s*[^\]]*\]\s*/gi, '')
    .trim();
}

/**
 * Check if content contains analysis tags.
 * 
 * @param content - The LLM response content
 * @returns true if content contains at least one tag type
 */
export function hasAnalysisTags(content: string): boolean {
  return /\[TAGS_(STRENGTHS|IMPROVEMENTS):/i.test(content);
}
