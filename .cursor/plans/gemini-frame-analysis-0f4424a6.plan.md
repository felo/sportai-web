<!-- 0f4424a6-86d5-410f-8095-12f626dfecc9 a46c2b49-f9e0-4c35-a234-1af2cc265bab -->
# Image Insight Feature

## Overview

Add a new "Image Insight" feature that:

1. Captures current video frame with pose detection + 4 angle presets drawn on it
2. Sends the annotated image to Gemini 3 for biomechanical analysis
3. Scrolls to bottom and displays the annotated image above the AI response

## Key Changes

### 1. Split System Prompt ([lib/prompts.ts](lib/prompts.ts))

Create two prompt variants:

**`SYSTEM_PROMPT_VIDEO`** (for askAnything - full video analysis):

- Full context analysis with environment, camera angle, rally type
- Timestamp references (M:SS format)
- "Watch entire match" instructions
- Current full `SYSTEM_PROMPT`

**`SYSTEM_PROMPT_FRAME`** (for askAboutFrame - single annotated frame):

- Focus on biomechanics and body positioning
- Analyze the visible angles drawn on the image
- Specific moment feedback (no timestamps needed)
- Remove video-specific instructions (rally type, timestamps, "watch entire match")
- Shorter, focused on what's visible in the single frame

### 2. New API Endpoint or Modify Existing

Option A: Reuse `/api/llm` with a new parameter `promptType: "video" | "frame"`
Option B: Create `/api/analyze-pose-frame` specifically for this

Recommend Option A - less code duplication.

### 3. UI Button ([VideoPoseViewerCore.tsx](components/chat/viewers/videoPoseViewer/VideoPoseViewerCore.tsx))

Add "Image Insight" button in developer mode section (below Frame Analysis):

- Only visible when `developerMode === true`
- Captures frame with pose + angles rendered
- Triggers analysis and scrolls to chat

### 4. Frame Capture with Overlays

Create utility function to:

1. Draw video frame to canvas
2. Draw pose skeleton on top
3. Activate and draw all 4 angle presets
4. Export as base64 image

### 5. Response Display

- Scroll to bottom when button pressed
- Show loading state
- Display the annotated image above the AI response
- Response appears below the image

## Files to Modify

1. `lib/prompts.ts` - Split into `SYSTEM_PROMPT_VIDEO` and `SYSTEM_PROMPT_FRAME`
2. `lib/llm.ts` - Accept prompt type parameter
3. `app/api/llm/route.ts` - Pass prompt type through
4. `components/chat/viewers/videoPoseViewer/VideoPoseViewerCore.tsx` - Add Image Insight button
5. May need to modify chat display to show image above response

### To-dos

- [ ] Create types/frame-analysis.ts with request/response types
- [ ] Create /api/analyze-frame route with court and camera-angle handlers
- [ ] Create useFrameAnalysis hook for client-side API calls
- [ ] Add 'Analyze Frame' button to VideoPoseViewer with result display